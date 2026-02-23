import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { buildAttorneyReviewChecklist, computeAttorneyProfileCompleteness, deriveAttorneyQueueState } from "@/lib/admin-attorney-review";

export async function GET(_request: Request, { params }: { params: Promise<{ attorneyId: string }> }) {
  try {
    await requireAdminAuth();
    const { attorneyId } = await params;
    const attorney = await prisma.attorneyProfile.findUnique({
      where: { id: attorneyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        firmName: true,
        barLicenseNumber: true,
        barNumberVerified: true,
        barVerifiedAt: true,
        barState: true,
        lawSchool: true,
        yearsExperience: true,
        bio: true,
        isVerified: true,
        reviewStatus: true,
        reviewRequestedAt: true,
        lastReviewedAt: true,
        lastReviewedByUserId: true,
        reviewDecisionTemplate: true,
        reviewDecisionReason: true,
        profileCompletenessScore: true,
        reviewChecklistSnapshot: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, email: true, role: true, createdAt: true } },
        lastReviewedBy: { select: { id: true, email: true } },
        serviceAreas: { select: { stateCode: true, zipCode: true } },
        specialties: { select: { category: true } },
        languages: { select: { language: true } },
        reviewLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            action: true,
            toStatus: true,
            templateKey: true,
            reason: true,
            completenessScore: true,
            checklistSnapshot: true,
            createdAt: true,
            adminUser: { select: { id: true, email: true } },
          },
        },
        bids: {
          take: 20,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            caseId: true,
            status: true,
            version: true,
            feeQuoteMin: true,
            feeQuoteMax: true,
            updatedAt: true,
            case: { select: { title: true, status: true, category: true, stateCode: true } },
          },
        },
        conversations: {
          take: 20,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            status: true,
            caseId: true,
            bidId: true,
            updatedAt: true,
            case: { select: { title: true, status: true } },
          },
        },
        _count: { select: { bids: true, conversations: true } },
      },
    });
    if (!attorney) return NextResponse.json({ error: "Attorney not found." }, { status: 404 });
    const reviewChecklist = buildAttorneyReviewChecklist(attorney);
    const completeness = computeAttorneyProfileCompleteness({
      ...attorney,
      specialtiesCount: attorney.specialties.length,
      serviceAreasCount: attorney.serviceAreas.length,
      languagesCount: attorney.languages.length,
    });
    const queue = deriveAttorneyQueueState(attorney);
    return NextResponse.json({
      ok: true,
      attorney: {
        ...attorney,
        reviewChecklist,
        completeness,
        reviewQueue: queue,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/attorneys/[attorneyId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
