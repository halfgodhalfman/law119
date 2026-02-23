import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { ATTORNEY_REVIEW_TEMPLATES, buildAttorneyReviewChecklist, computeAttorneyProfileCompleteness } from "@/lib/admin-attorney-review";
import { logAdminAction } from "@/lib/admin-action-log";

function buildFieldDiff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(after)) {
    const oldValue = before[key];
    const newValue = after[key];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diff[key] = { old: oldValue, new: newValue };
    }
  }
  return diff;
}

export async function POST(request: Request, { params }: { params: Promise<{ attorneyId: string }> }) {
  try {
    const admin = await requireAdminAuth();
    const { attorneyId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      action?:
        | "verify"
        | "unverify"
        | "bar_verify"
        | "bar_unverify"
        | "review_approve"
        | "review_request_info"
        | "review_reject"
        | "mark_rereview";
      barState?: string;
      reason?: string;
      templateKey?: keyof typeof ATTORNEY_REVIEW_TEMPLATES;
      templateReply?: string;
    };
    if (!body.action) return NextResponse.json({ error: "Missing action." }, { status: 400 });

    const current = await prisma.attorneyProfile.findUnique({
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
        yearsExperience: true,
        isVerified: true,
        bio: true,
        reviewStatus: true,
        reviewRequestedAt: true,
        lastReviewedAt: true,
        lastReviewedByUserId: true,
        reviewDecisionTemplate: true,
        reviewDecisionReason: true,
        profileCompletenessScore: true,
        specialties: { select: { id: true } },
        serviceAreas: { select: { id: true } },
        languages: { select: { id: true } },
      },
    });
    if (!current) return NextResponse.json({ error: "Attorney not found." }, { status: 404 });

    const checklist = buildAttorneyReviewChecklist(current);
    const completeness = computeAttorneyProfileCompleteness({
      ...current,
      specialtiesCount: current.specialties.length,
      serviceAreasCount: current.serviceAreas.length,
      languagesCount: current.languages.length,
    });
    const template = body.templateKey ? ATTORNEY_REVIEW_TEMPLATES[body.templateKey] : undefined;
    const reason = (body.reason?.trim() || template?.defaultReason || null) as string | null;
    const templateReply = (body.templateReply?.trim() || template?.replyTemplate || null) as string | null;

    const baseChecklistSnapshot = {
      items: checklist.items,
      checklistScore: checklist.checklistScore,
      completeness,
      missingKeys: checklist.missingKeys,
    };

    const data =
      body.action === "verify"
        ? { isVerified: true }
        : body.action === "unverify"
          ? { isVerified: false }
          : body.action === "bar_verify"
            ? { barNumberVerified: true, barVerifiedAt: new Date(), ...(body.barState ? { barState: body.barState.toUpperCase() } : {}) }
            : body.action === "bar_unverify"
              ? { barNumberVerified: false }
              : body.action === "review_approve"
                ? {
                    isVerified: true,
                    reviewStatus: "APPROVED" as const,
                    reviewRequestedAt: null,
                    lastReviewedAt: new Date(),
                    lastReviewedByUserId: admin.authUserId,
                    reviewDecisionTemplate: body.templateKey ?? "APPROVE_STANDARD",
                    reviewDecisionReason: reason,
                    profileCompletenessScore: completeness,
                    reviewChecklistSnapshot: baseChecklistSnapshot,
                  }
                : body.action === "review_request_info"
                  ? {
                      isVerified: false,
                      reviewStatus: "NEEDS_INFO" as const,
                      reviewRequestedAt: new Date(),
                      lastReviewedAt: new Date(),
                      lastReviewedByUserId: admin.authUserId,
                      reviewDecisionTemplate: body.templateKey ?? "REQUEST_MORE_INFO",
                      reviewDecisionReason: reason,
                      profileCompletenessScore: completeness,
                      reviewChecklistSnapshot: baseChecklistSnapshot,
                    }
                  : body.action === "review_reject"
                    ? {
                        isVerified: false,
                        reviewStatus: "REJECTED" as const,
                        reviewRequestedAt: null,
                        lastReviewedAt: new Date(),
                        lastReviewedByUserId: admin.authUserId,
                        reviewDecisionTemplate: body.templateKey ?? "REJECT_INCOMPLETE",
                        reviewDecisionReason: reason,
                        profileCompletenessScore: completeness,
                        reviewChecklistSnapshot: baseChecklistSnapshot,
                      }
                    : {
                        reviewStatus: "RE_REVIEW_REQUIRED" as const,
                        reviewRequestedAt: new Date(),
                        reviewDecisionReason: reason,
                        profileCompletenessScore: completeness,
                        reviewChecklistSnapshot: baseChecklistSnapshot,
                      };

    const beforeAudit = {
      isVerified: current.isVerified,
      barNumberVerified: current.barNumberVerified,
      barState: current.barState,
      reviewStatus: current.reviewStatus,
      reviewRequestedAt: current.reviewRequestedAt?.toISOString() ?? null,
      lastReviewedAt: current.lastReviewedAt?.toISOString() ?? null,
      lastReviewedByUserId: current.lastReviewedByUserId ?? null,
      reviewDecisionTemplate: current.reviewDecisionTemplate ?? null,
      reviewDecisionReason: current.reviewDecisionReason ?? null,
      profileCompletenessScore: current.profileCompletenessScore ?? null,
    };

    const updated = await prisma.$transaction(async (tx) => {
      const attorney = await tx.attorneyProfile.update({
        where: { id: attorneyId },
        data,
        select: {
          id: true,
          isVerified: true,
          barNumberVerified: true,
          barState: true,
          barVerifiedAt: true,
          reviewStatus: true,
          reviewRequestedAt: true,
          lastReviewedAt: true,
          lastReviewedByUserId: true,
          reviewDecisionTemplate: true,
          reviewDecisionReason: true,
          profileCompletenessScore: true,
        },
      });

      const actionMap = {
        verify: "VERIFY",
        unverify: "UNVERIFY",
        bar_verify: "BAR_VERIFY",
        bar_unverify: "BAR_UNVERIFY",
        review_approve: "APPROVE",
        review_request_info: "REQUEST_INFO",
        review_reject: "REJECT",
        mark_rereview: "MARK_RE_REVIEW",
      } as const;

      const mappedAction = actionMap[body.action as keyof typeof actionMap];
      await tx.attorneyReviewLog.create({
        data: {
          attorneyId,
          adminUserId: admin.authUserId,
          action: mappedAction,
          toStatus: "reviewStatus" in attorney ? (attorney.reviewStatus as any) : null,
          templateKey: body.templateKey ?? null,
          reason,
          checklistSnapshot: baseChecklistSnapshot,
          completenessScore: completeness,
        },
      });

      await tx.attorneyVerificationLog.create({
        data: {
          attorneyId,
          adminUserId: admin.authUserId,
          action: mappedAction,
          toStatus: ("reviewStatus" in attorney ? (attorney.reviewStatus as any) : null) ?? null,
          templateKey: body.templateKey ?? null,
          templateReply,
          reason,
          checklistSnapshot: baseChecklistSnapshot,
          completenessScore: completeness,
          beforeSnapshot: JSON.parse(JSON.stringify(beforeAudit)),
          afterSnapshot: JSON.parse(JSON.stringify({
            isVerified: attorney.isVerified,
            barNumberVerified: attorney.barNumberVerified,
            barState: attorney.barState,
            reviewStatus: attorney.reviewStatus,
            reviewRequestedAt: attorney.reviewRequestedAt?.toISOString() ?? null,
            lastReviewedAt: attorney.lastReviewedAt?.toISOString() ?? null,
            lastReviewedByUserId: attorney.lastReviewedByUserId ?? null,
            reviewDecisionTemplate: attorney.reviewDecisionTemplate ?? null,
            reviewDecisionReason: attorney.reviewDecisionReason ?? null,
            profileCompletenessScore: attorney.profileCompletenessScore ?? null,
          })),
          fieldDiff: JSON.parse(JSON.stringify(buildFieldDiff(beforeAudit, {
            isVerified: attorney.isVerified,
            barNumberVerified: attorney.barNumberVerified,
            barState: attorney.barState,
            reviewStatus: attorney.reviewStatus,
            reviewRequestedAt: attorney.reviewRequestedAt?.toISOString() ?? null,
            lastReviewedAt: attorney.lastReviewedAt?.toISOString() ?? null,
            lastReviewedByUserId: attorney.lastReviewedByUserId ?? null,
            reviewDecisionTemplate: attorney.reviewDecisionTemplate ?? null,
            reviewDecisionReason: attorney.reviewDecisionReason ?? null,
            profileCompletenessScore: attorney.profileCompletenessScore ?? null,
          }))),
        },
      });

      const afterAudit = {
        isVerified: attorney.isVerified,
        barNumberVerified: attorney.barNumberVerified,
        barState: attorney.barState,
        reviewStatus: attorney.reviewStatus,
        reviewRequestedAt: attorney.reviewRequestedAt?.toISOString() ?? null,
        lastReviewedAt: attorney.lastReviewedAt?.toISOString() ?? null,
        lastReviewedByUserId: attorney.lastReviewedByUserId ?? null,
        reviewDecisionTemplate: attorney.reviewDecisionTemplate ?? null,
        reviewDecisionReason: attorney.reviewDecisionReason ?? null,
        profileCompletenessScore: attorney.profileCompletenessScore ?? null,
      };
      return attorney;
    });

    const actionMap = {
      verify: "VERIFY",
      unverify: "UNVERIFY",
      bar_verify: "BAR_VERIFY",
      bar_unverify: "BAR_UNVERIFY",
      review_approve: "APPROVE",
      review_request_info: "REQUEST_INFO",
      review_reject: "REJECT",
      mark_rereview: "MARK_RE_REVIEW",
    } as const;
    const mappedAction = actionMap[body.action as keyof typeof actionMap];
    const afterAudit = {
      isVerified: updated.isVerified,
      barNumberVerified: updated.barNumberVerified,
      barState: updated.barState,
      reviewStatus: updated.reviewStatus,
      reviewRequestedAt: updated.reviewRequestedAt?.toISOString() ?? null,
      lastReviewedAt: updated.lastReviewedAt?.toISOString() ?? null,
      lastReviewedByUserId: updated.lastReviewedByUserId ?? null,
      reviewDecisionTemplate: updated.reviewDecisionTemplate ?? null,
      reviewDecisionReason: updated.reviewDecisionReason ?? null,
      profileCompletenessScore: updated.profileCompletenessScore ?? null,
    };
    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "ATTORNEY",
      entityId: attorneyId,
      action: `ATTORNEY_REVIEW_${mappedAction}`,
      reason,
      metadata: JSON.parse(
        JSON.stringify({
          templateKey: body.templateKey ?? null,
          templateReply,
          checklistScore: checklist.checklistScore,
          completeness,
          diff: buildFieldDiff(beforeAudit, afterAudit),
        }),
      ),
    });

    return NextResponse.json({ ok: true, attorney: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("POST /api/marketplace/admin/attorneys/[attorneyId]/actions failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
