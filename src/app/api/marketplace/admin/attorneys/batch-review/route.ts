import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  ATTORNEY_REVIEW_TEMPLATES,
  buildAttorneyReviewChecklist,
  computeAttorneyProfileCompleteness,
} from "@/lib/admin-attorney-review";

const batchSchema = z.object({
  action: z.enum(["review_approve", "review_request_info"]),
  attorneyIds: z.array(z.string().trim().min(1)).min(1).max(100),
  reason: z.string().trim().max(500).optional(),
  templateKey: z.enum(["APPROVE_STANDARD", "REQUEST_MORE_INFO"]).optional(),
  templateReply: z.string().trim().max(4000).optional(),
});

function buildFieldDiff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diff[key] = { old: before[key], new: after[key] };
    }
  }
  return diff;
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const body = await request.json().catch(() => ({}));
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const ids = Array.from(new Set(parsed.data.attorneyIds));
    const templateKey =
      parsed.data.templateKey ??
      (parsed.data.action === "review_approve" ? "APPROVE_STANDARD" : "REQUEST_MORE_INFO");
    const template = ATTORNEY_REVIEW_TEMPLATES[templateKey];
    const reason = parsed.data.reason?.trim() || template.defaultReason;
    const templateReply = parsed.data.templateReply?.trim() || template.replyTemplate;
    const now = new Date();

    const attorneys = await prisma.attorneyProfile.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        firmName: true,
        barLicenseNumber: true,
        barNumberVerified: true,
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
    const attorneyMap = new Map(attorneys.map((a) => [a.id, a]));

    const results: Array<{ id: string; reviewStatus: string; isVerified: boolean; profileCompletenessScore: number | null }> = [];
    const missing: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const attorneyId of ids) {
        const current = attorneyMap.get(attorneyId);
        if (!current) {
          missing.push(attorneyId);
          continue;
        }

        const checklist = buildAttorneyReviewChecklist(current);
        const completeness = computeAttorneyProfileCompleteness({
          ...current,
          specialtiesCount: current.specialties.length,
          serviceAreasCount: current.serviceAreas.length,
          languagesCount: current.languages.length,
        });
        const checklistSnapshot = {
          items: checklist.items,
          checklistScore: checklist.checklistScore,
          completeness,
          missingKeys: checklist.missingKeys,
        };

        const updateData =
          parsed.data.action === "review_approve"
            ? {
                isVerified: true,
                reviewStatus: "APPROVED" as const,
                reviewRequestedAt: null,
                lastReviewedAt: now,
                lastReviewedByUserId: admin.authUserId,
                reviewDecisionTemplate: templateKey,
                reviewDecisionReason: reason,
                profileCompletenessScore: completeness,
                reviewChecklistSnapshot: checklistSnapshot,
              }
            : {
                isVerified: false,
                reviewStatus: "NEEDS_INFO" as const,
                reviewRequestedAt: now,
                lastReviewedAt: now,
                lastReviewedByUserId: admin.authUserId,
                reviewDecisionTemplate: templateKey,
                reviewDecisionReason: reason,
                profileCompletenessScore: completeness,
                reviewChecklistSnapshot: checklistSnapshot,
              };

        const updated = await tx.attorneyProfile.update({
          where: { id: attorneyId },
          data: updateData,
          select: {
            id: true,
            isVerified: true,
            reviewStatus: true,
            reviewRequestedAt: true,
            lastReviewedAt: true,
            lastReviewedByUserId: true,
            reviewDecisionTemplate: true,
            reviewDecisionReason: true,
            profileCompletenessScore: true,
            barNumberVerified: true,
            barState: true,
          },
        });

        await tx.attorneyReviewLog.create({
          data: {
            attorneyId,
            adminUserId: admin.authUserId,
            action: parsed.data.action === "review_approve" ? "APPROVE" : "REQUEST_INFO",
            toStatus: updated.reviewStatus,
            templateKey,
            reason,
            checklistSnapshot,
            completenessScore: completeness,
          },
        });

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

        await tx.attorneyVerificationLog.create({
          data: {
            attorneyId,
            adminUserId: admin.authUserId,
            action: parsed.data.action === "review_approve" ? "APPROVE" : "REQUEST_INFO",
            toStatus: updated.reviewStatus,
            templateKey,
            templateReply,
            reason,
            checklistSnapshot,
            completenessScore: completeness,
            beforeSnapshot: JSON.parse(JSON.stringify(beforeAudit)),
            afterSnapshot: JSON.parse(JSON.stringify(afterAudit)),
            fieldDiff: JSON.parse(JSON.stringify(buildFieldDiff(beforeAudit, afterAudit))),
          },
        });

        results.push({
          id: updated.id,
          reviewStatus: updated.reviewStatus,
          isVerified: updated.isVerified,
          profileCompletenessScore: updated.profileCompletenessScore,
        });

        await tx.adminActionLog.create({
          data: {
            adminUserId: admin.authUserId,
            entityType: "ATTORNEY",
            entityId: attorneyId,
            action:
              parsed.data.action === "review_approve"
                ? "ATTORNEY_REVIEW_BATCH_APPROVE"
                : "ATTORNEY_REVIEW_BATCH_REQUEST_INFO",
            reason,
            metadata: JSON.parse(
              JSON.stringify({
                templateKey,
                templateReply,
                checklistScore: checklist.checklistScore,
                completeness,
                diff: buildFieldDiff(beforeAudit, afterAudit),
              }),
            ),
          },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      action: parsed.data.action,
      templateKey,
      appliedCount: results.length,
      missingCount: missing.length,
      attorneys: results,
      missingAttorneyIds: missing,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("POST /api/marketplace/admin/attorneys/batch-review failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
