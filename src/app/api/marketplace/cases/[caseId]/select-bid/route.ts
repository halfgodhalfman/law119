export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuthContext } from "../../../../../../lib/auth-context";

const selectBidSchema = z.object({
  bidId: z.string().trim().min(1),
  createConversation: z.boolean().default(true),
});

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "CLIENT" || !auth.clientProfileId) {
      return NextResponse.json({ error: "Only clients can select a bid." }, { status: 403 });
    }

    const { caseId } = await Promise.resolve(params);
    const body = await request.json();
    const parsed = selectBidSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const legalCase = await tx.case.findUnique({
        where: { id: caseId },
        select: {
          id: true,
          status: true,
          clientProfileId: true,
          selectedBidId: true,
        },
      });

      if (!legalCase) {
        throw new Error("CASE_NOT_FOUND");
      }

      if (legalCase.clientProfileId !== auth.clientProfileId) {
        throw new Error("FORBIDDEN_CASE_OWNER");
      }

      if (legalCase.status === "CLOSED" || legalCase.status === "CANCELLED") {
        throw new Error("CASE_NOT_SELECTABLE");
      }

      const selectedBid = await tx.bid.findFirst({
        where: {
          id: parsed.data.bidId,
          caseId,
          status: { not: "WITHDRAWN" },
        },
        select: {
          id: true,
          attorneyProfileId: true,
          feeQuoteMin: true,
          feeQuoteMax: true,
        },
      });

      if (!selectedBid) {
        throw new Error("BID_NOT_FOUND");
      }

      await tx.bid.updateMany({
        where: { caseId, id: { not: selectedBid.id }, status: "PENDING" },
        data: { status: "REJECTED" },
      });

      await tx.bid.update({
        where: { id: selectedBid.id },
        data: { status: "ACCEPTED" },
      });

      const updatedCase = await tx.case.update({
        where: { id: caseId },
        data: {
          status: "MATCHING",
          selectedBidId: selectedBid.id,
        },
        select: { id: true, status: true, updatedAt: true },
      });

      let conversationId: string | null = null;
      let engagementConfirmationId: string | null = null;
      if (parsed.data.createConversation) {
        const conversation = await tx.conversation.upsert({
          where: { bidId: selectedBid.id },
          update: { status: "OPEN" },
          create: {
            bidId: selectedBid.id,
            caseId,
            clientProfileId: auth.clientProfileId,
            attorneyProfileId: selectedBid.attorneyProfileId,
            status: "OPEN",
          },
          select: { id: true },
        });
        conversationId = conversation.id;
      }

      const engagement = await tx.engagementConfirmation.upsert({
        where: { bidId: selectedBid.id },
        update: {
          caseId,
          conversationId,
          clientProfileId: auth.clientProfileId,
          attorneyProfileId: selectedBid.attorneyProfileId,
          status: "PENDING_ATTORNEY",
          feeMode: "CUSTOM",
          feeAmountMin: selectedBid.feeQuoteMin,
          feeAmountMax: selectedBid.feeQuoteMax,
          nonLegalAdviceAck: true,
          noAttorneyClientRelationshipAck: true,
          serviceScopeSummary: "请律师确认最终服务范围（咨询/文书/出庭/全案代理）后生效",
        },
        create: {
          caseId,
          bidId: selectedBid.id,
          conversationId,
          clientProfileId: auth.clientProfileId,
          attorneyProfileId: selectedBid.attorneyProfileId,
          status: "PENDING_ATTORNEY",
          feeMode: "CUSTOM",
          feeAmountMin: selectedBid.feeQuoteMin,
          feeAmountMax: selectedBid.feeQuoteMax,
          includesConsultation: true,
          nonLegalAdviceAck: true,
          noAttorneyClientRelationshipAck: true,
          serviceBoundary: "CUSTOM",
          serviceScopeSummary: "请律师确认最终服务范围（咨询/文书/出庭/全案代理）后生效",
        },
        select: { id: true },
      });
      engagementConfirmationId = engagement.id;

      await tx.caseStatusLog.create({
        data: {
          caseId,
          fromStatus: legalCase.status,
          toStatus: "MATCHING",
          operatorId: auth.authUserId,
          reason: legalCase.selectedBidId
            ? `Changed selected bid to ${selectedBid.id}`
            : `Selected bid ${selectedBid.id}`,
        },
      });

      return {
        case: updatedCase,
        selectedBidId: selectedBid.id,
        attorneyProfileId: selectedBid.attorneyProfileId,
        agreedPriceHint: {
          min: selectedBid.feeQuoteMin,
          max: selectedBid.feeQuoteMax,
        },
        conversationId,
        engagementConfirmationId,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "CASE_NOT_FOUND") {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }
    if (message === "BID_NOT_FOUND") {
      return NextResponse.json({ error: "Bid not found for this case." }, { status: 404 });
    }
    if (message === "FORBIDDEN_CASE_OWNER") {
      return NextResponse.json({ error: "You do not own this case." }, { status: 403 });
    }
    if (message === "CASE_NOT_SELECTABLE") {
      return NextResponse.json({ error: "Case cannot accept bid selection now." }, { status: 409 });
    }

    console.error("POST /api/marketplace/cases/[caseId]/select-bid failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
