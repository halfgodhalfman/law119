import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  serviceBoundary: z.enum(["CONSULTATION", "DOCUMENT_PREP", "COURT_APPEARANCE", "FULL_REPRESENTATION", "CUSTOM"]).optional(),
  serviceScopeSummary: z.string().trim().min(10).max(4000).optional(),
  stagePlan: z.string().trim().max(4000).optional().nullable(),
  feeMode: z.enum(["CONSULTATION", "AGENCY", "STAGED", "HOURLY", "CUSTOM"]).optional(),
  feeAmountMin: z.union([z.number(), z.string()]).optional().nullable(),
  feeAmountMax: z.union([z.number(), z.string()]).optional().nullable(),
  includesConsultation: z.boolean().optional(),
  includesCourtAppearance: z.boolean().optional(),
  includesTranslation: z.boolean().optional(),
  includesDocumentFiling: z.boolean().optional(),
  nonLegalAdviceAck: z.boolean().optional(),
  noAttorneyClientRelationshipAck: z.boolean().optional(),
  attorneyConflictChecked: z.boolean().optional(),
  attorneyConflictCheckNote: z.string().trim().max(2000).optional().nullable(),
  conflictPartiesText: z.string().trim().max(1000).optional().nullable(), // UI-only note for metadata logging; not persisted
  confirmAs: z.enum(["CLIENT", "ATTORNEY"]).optional(),
});

function toDecimalInput(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

export async function GET(_request: Request, { params }: { params: Promise<{ engagementId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { engagementId } = await params;

    const item = await prisma.engagementConfirmation.findUnique({
      where: { id: engagementId },
      select: {
        id: true,
        status: true,
        caseId: true,
        bidId: true,
        conversationId: true,
        clientProfileId: true,
        attorneyProfileId: true,
        serviceBoundary: true,
        serviceScopeSummary: true,
        stagePlan: true,
        feeMode: true,
        feeAmountMin: true,
        feeAmountMax: true,
        includesConsultation: true,
        includesCourtAppearance: true,
        includesTranslation: true,
        includesDocumentFiling: true,
        nonLegalAdviceAck: true,
        noAttorneyClientRelationshipAck: true,
        attorneyConflictChecked: true,
        attorneyConflictCheckNote: true,
        attorneyConflictCheckedAt: true,
        attorneyConfirmedAt: true,
        clientConfirmedAt: true,
        createdAt: true,
        updatedAt: true,
        case: { select: { title: true, stateCode: true, selectedBidId: true } },
        bid: { select: { id: true, status: true, feeQuoteMin: true, feeQuoteMax: true, feeMode: true } },
        paymentOrders: { select: { id: true, status: true, amountReleased: true } },
        attorneyClientReviews: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            ratingOverall: true,
            ratingResponsiveness: true,
            ratingProfessionalism: true,
            ratingCommunication: true,
            wouldRecommend: true,
            comment: true,
            createdAt: true,
          },
        },
        attorney: { select: { id: true, barState: true, isVerified: true, serviceAreas: { select: { stateCode: true } } } },
        conversation: { select: { status: true } },
      },
    });
    if (!item) return NextResponse.json({ error: "Engagement not found." }, { status: 404 });

    const isClient = auth.role === "CLIENT" && auth.clientProfileId && item.clientProfileId === auth.clientProfileId;
    const isAttorney = auth.role === "ATTORNEY" && auth.attorneyProfileId && item.attorneyProfileId === auth.attorneyProfileId;
    const isAdmin = auth.role === "ADMIN";
    if (!isClient && !isAttorney && !isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const practiceStates = item.attorney.serviceAreas.map((s) => s.stateCode);
    const stateMatchLevel =
      item.attorney.barState === item.case.stateCode || practiceStates.includes(item.case.stateCode)
        ? "MATCH"
        : practiceStates.length > 0
          ? "CROSS_STATE"
          : "UNKNOWN";

    const hasReleasedPayment = item.paymentOrders.some((p) => Number(p.amountReleased ?? 0) > 0);
    const conversationClosed = item.conversation?.status === "CLOSED";
    const hasReview = item.attorneyClientReviews.length > 0;
    const reviewEligible = Boolean((isClient || isAdmin) && !hasReview && item.status === "ACTIVE" && (hasReleasedPayment || conversationClosed));

    return NextResponse.json({
      ok: true,
      engagement: {
        ...item,
        feeAmountMin: item.feeAmountMin?.toString() ?? null,
        feeAmountMax: item.feeAmountMax?.toString() ?? null,
      },
      viewer: {
        role: auth.role,
        canEditAttorneyFields: isAttorney || isAdmin,
        canEditClientFields: isClient || isAdmin,
        canConfirmAttorney: isAttorney || isAdmin,
        canConfirmClient: isClient || isAdmin,
        canSubmitClientReview: reviewEligible,
      },
      review: item.attorneyClientReviews[0] ?? null,
      reviewEligibility: {
        eligible: reviewEligible,
        reason: hasReview
          ? "already_reviewed"
          : item.status !== "ACTIVE"
            ? "engagement_not_active"
            : !(hasReleasedPayment || conversationClosed)
              ? "not_completed"
              : "ok",
      },
      complianceHints: {
        platformNotLegalAdvice: true,
        chatNotAttorneyClientRelationshipUntilEngagementActive: true,
        statePracticeMatchLevel: stateMatchLevel,
        attorneyBarState: item.attorney.barState,
        attorneyPracticeStates: practiceStates,
        caseStateCode: item.case.stateCode,
      },
    });
  } catch (error) {
    console.error("GET /api/marketplace/engagements/[engagementId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ engagementId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { engagementId } = await params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.engagementConfirmation.findUnique({
      where: { id: engagementId },
      select: { id: true, status: true, clientProfileId: true, attorneyProfileId: true, attorneyConfirmedAt: true, clientConfirmedAt: true },
    });
    if (!existing) return NextResponse.json({ error: "Engagement not found." }, { status: 404 });

    const isClient = auth.role === "CLIENT" && auth.clientProfileId && existing.clientProfileId === auth.clientProfileId;
    const isAttorney = auth.role === "ATTORNEY" && auth.attorneyProfileId && existing.attorneyProfileId === auth.attorneyProfileId;
    const isAdmin = auth.role === "ADMIN";
    if (!isClient && !isAttorney && !isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.serviceBoundary) updateData.serviceBoundary = data.serviceBoundary;
    if (typeof data.serviceScopeSummary === "string") updateData.serviceScopeSummary = data.serviceScopeSummary;
    if ("stagePlan" in data) updateData.stagePlan = data.stagePlan ?? null;
    if (data.feeMode) updateData.feeMode = data.feeMode;
    if ("feeAmountMin" in data) updateData.feeAmountMin = toDecimalInput(data.feeAmountMin ?? null);
    if ("feeAmountMax" in data) updateData.feeAmountMax = toDecimalInput(data.feeAmountMax ?? null);
    if (typeof data.includesConsultation === "boolean") updateData.includesConsultation = data.includesConsultation;
    if (typeof data.includesCourtAppearance === "boolean") updateData.includesCourtAppearance = data.includesCourtAppearance;
    if (typeof data.includesTranslation === "boolean") updateData.includesTranslation = data.includesTranslation;
    if (typeof data.includesDocumentFiling === "boolean") updateData.includesDocumentFiling = data.includesDocumentFiling;
    if (typeof data.nonLegalAdviceAck === "boolean") updateData.nonLegalAdviceAck = data.nonLegalAdviceAck;
    if (typeof data.noAttorneyClientRelationshipAck === "boolean") updateData.noAttorneyClientRelationshipAck = data.noAttorneyClientRelationshipAck;

    if ((isAttorney || isAdmin) && typeof data.attorneyConflictChecked === "boolean") {
      updateData.attorneyConflictChecked = data.attorneyConflictChecked;
      updateData.attorneyConflictCheckedAt = data.attorneyConflictChecked ? new Date() : null;
    }
    if ((isAttorney || isAdmin) && "attorneyConflictCheckNote" in data) {
      updateData.attorneyConflictCheckNote = data.attorneyConflictCheckNote ?? null;
    }

    let nextStatus: "PENDING_ATTORNEY" | "PENDING_CLIENT" | "ACTIVE" | "DRAFT" | "DECLINED" | "CANCELED" | null = null;
    if (data.confirmAs === "ATTORNEY") {
      if (!isAttorney && !isAdmin) return NextResponse.json({ error: "Only attorney can confirm attorney side." }, { status: 403 });
      if (!("attorneyConflictChecked" in data ? data.attorneyConflictChecked : (updateData.attorneyConflictChecked ?? false))) {
        // Require explicit conflict check confirmation before attorney confirm
        const current = await prisma.engagementConfirmation.findUnique({ where: { id: engagementId }, select: { attorneyConflictChecked: true } });
        if (!current?.attorneyConflictChecked) {
          return NextResponse.json({ error: "Attorney must confirm conflict check first." }, { status: 409 });
        }
      }
      updateData.attorneyConfirmedAt = new Date();
      updateData.confirmedByAttorneyUserId = auth.authUserId;
      nextStatus = existing.clientConfirmedAt ? "ACTIVE" : "PENDING_CLIENT";
    }
    if (data.confirmAs === "CLIENT") {
      if (!isClient && !isAdmin) return NextResponse.json({ error: "Only client can confirm client side." }, { status: 403 });
      updateData.clientConfirmedAt = new Date();
      updateData.confirmedByClientUserId = auth.authUserId;
      nextStatus = existing.attorneyConfirmedAt ? "ACTIVE" : "PENDING_ATTORNEY";
    }
    if (nextStatus) updateData.status = nextStatus;

    const updated = await prisma.engagementConfirmation.update({
      where: { id: engagementId },
      data: updateData,
      select: {
        id: true,
        status: true,
        attorneyConfirmedAt: true,
        clientConfirmedAt: true,
        attorneyConflictChecked: true,
        attorneyConflictCheckedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, engagement: updated });
  } catch (error) {
    console.error("PATCH /api/marketplace/engagements/[engagementId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
