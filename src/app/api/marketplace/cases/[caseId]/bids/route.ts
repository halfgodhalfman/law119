export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuthContext } from "../../../../../../lib/auth-context";
import { evaluateContentRulesConfigured, persistContentRuleHits, summarizeRuleHits } from "../../../../../../lib/content-rules";
import { notifyClientAboutBid } from "../../../../../../lib/notifications";

const submitBidSchema = z
  .object({
    proposalText: z.string().trim().min(10).max(3000),
    priceAmount: z.coerce.number().positive().optional(),
    priceMin: z.coerce.number().positive().optional(),
    priceMax: z.coerce.number().positive().optional(),
    feeMode: z.enum(["CONSULTATION", "AGENCY", "STAGED", "HOURLY", "CUSTOM"]).optional(),
    serviceScope: z.string().trim().max(2000).optional(),
    estimatedDays: z.coerce.number().int().positive().max(365).optional(),
    includesConsultation: z.boolean().optional(),
  })
  .refine(
    (v) => v.priceAmount !== undefined || v.priceMin !== undefined || v.priceMax !== undefined,
    "At least one price field is required.",
  );

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ATTORNEY" || !auth.attorneyProfileId) {
      return NextResponse.json({ error: "Only attorneys can submit bids." }, { status: 403 });
    }

    const { caseId } = await Promise.resolve(params);
    const body = await request.json();
    const parsed = submitBidSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const legalCase = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, status: true, quoteDeadline: true },
    });

    if (!legalCase) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    if (legalCase.status === "CLOSED" || legalCase.status === "CANCELLED") {
      return NextResponse.json({ error: "Case is not accepting bids." }, { status: 409 });
    }
    if (legalCase.quoteDeadline && legalCase.quoteDeadline.getTime() < Date.now()) {
      return NextResponse.json({ error: "Quote deadline has passed." }, { status: 409 });
    }

    const data = parsed.data;
    const bidRuleText = `${data.proposalText}\n${data.serviceScope ?? ""}`;
    const bidRuleHits = await evaluateContentRulesConfigured({
      scope: "BID_SUBMISSION",
      text: bidRuleText,
      actorUserId: auth.authUserId,
      caseId,
    });
    const bidRuleSummary = summarizeRuleHits(bidRuleHits);
    if (bidRuleSummary.hasBlock) {
      await persistContentRuleHits({ scope: "BID_SUBMISSION", text: bidRuleText, actorUserId: auth.authUserId, caseId }, bidRuleHits).catch(() => null);
      return NextResponse.json({ error: "报价内容触发平台规则，无法提交。", ruleWarnings: bidRuleSummary.warnings }, { status: 409 });
    }
    const min = data.priceAmount ?? data.priceMin ?? null;
    const max = data.priceAmount ?? data.priceMax ?? data.priceMin ?? null;

    const bid = await prisma.$transaction(async (tx) => {
      const existing = await tx.bid.findUnique({
        where: {
          caseId_attorneyProfileId: {
            caseId,
            attorneyProfileId: auth.attorneyProfileId!,
          },
        },
        select: { id: true },
      });

      const saved = existing
        ? await tx.bid.update({
            where: { id: existing.id },
            data: {
              message: data.proposalText,
              feeQuoteMin: min,
              feeQuoteMax: max,
              feeMode: data.feeMode ?? "CUSTOM",
              serviceScope: data.serviceScope ?? null,
              estimatedDays: data.estimatedDays ?? null,
              includesConsultation: data.includesConsultation ?? false,
              version: { increment: 1 },
              status: "PENDING",
              contactedAt: new Date(),
            },
            select: {
              id: true,
              version: true,
              status: true,
              feeQuoteMin: true,
              feeQuoteMax: true,
              feeMode: true,
              serviceScope: true,
              estimatedDays: true,
              includesConsultation: true,
              message: true,
              updatedAt: true,
            },
          })
        : await tx.bid.create({
            data: {
              caseId,
              attorneyProfileId: auth.attorneyProfileId!,
              message: data.proposalText,
              feeQuoteMin: min,
              feeQuoteMax: max,
              feeMode: data.feeMode ?? "CUSTOM",
              serviceScope: data.serviceScope ?? null,
              estimatedDays: data.estimatedDays ?? null,
              includesConsultation: data.includesConsultation ?? false,
              status: "PENDING",
              contactedAt: new Date(),
            },
            select: {
              id: true,
              version: true,
              status: true,
              feeQuoteMin: true,
              feeQuoteMax: true,
              feeMode: true,
              serviceScope: true,
              estimatedDays: true,
              includesConsultation: true,
              message: true,
              updatedAt: true,
            },
          });

      await tx.bidVersion.create({
        data: {
          bidId: saved.id,
          version: saved.version,
          message: saved.message,
          feeQuoteMin: saved.feeQuoteMin,
          feeQuoteMax: saved.feeQuoteMax,
          feeMode: saved.feeMode,
          serviceScope: saved.serviceScope,
          estimatedDays: saved.estimatedDays,
          includesConsultation: saved.includesConsultation,
          status: saved.status,
        },
      });

      return saved;
    });
    if (bidRuleHits.length) {
      await persistContentRuleHits({ scope: "BID_SUBMISSION", text: bidRuleText, actorUserId: auth.authUserId, caseId, bidId: bid.id }, bidRuleHits).catch(() => null);
    }

    // Notify the case client about this bid (fire-and-forget, non-blocking)
    notifyClientAboutBid({
      caseId,
      bidId: bid.id,
      feeQuoteMin: bid.feeQuoteMin != null ? Number(bid.feeQuoteMin) : null,
      feeQuoteMax: bid.feeQuoteMax != null ? Number(bid.feeQuoteMax) : null,
      attorneyProfileId: auth.attorneyProfileId!,
    }).catch((e: unknown) => console.error("Bid client notification failed:", e));

    return NextResponse.json({
      ok: true,
      bid,
      notes: [
        "Bid pricing and extended marketplace fields are persisted (requires migrated DB schema).",
      ],
      ruleWarnings: bidRuleSummary.warnings,
    });
  } catch (error) {
    console.error("POST /api/marketplace/cases/[caseId]/bids failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
