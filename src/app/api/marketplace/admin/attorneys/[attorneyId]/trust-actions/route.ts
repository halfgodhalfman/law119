import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-action-log";
import { syncAttorneySystemBadges } from "@/lib/attorney-badges";

const schema = z.object({
  target: z.enum(["identity", "bar", "badge"]),
  action: z.enum(["verify", "needs_info", "reject", "grant_badge", "revoke_badge"]),
  note: z.string().trim().max(1000).optional().nullable(),
  badgeType: z
    .enum([
      "VERIFIED_IDENTITY",
      "BAR_VERIFIED",
      "TOP_RATED",
      "FAST_RESPONDER",
      "HIGH_CONVERSION",
      "LOW_DISPUTE_RATE",
      "MULTILINGUAL",
      "PREMIUM_MEMBER",
    ])
    .optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ attorneyId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { attorneyId } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    const { target, action, note, badgeType } = parsed.data;

    const before = await prisma.attorneyProfile.findUnique({
      where: { id: attorneyId },
      select: {
        id: true,
        identityVerificationStatus: true,
        identityVerificationNote: true,
        barVerificationStatus: true,
        barVerificationNote: true,
        barNumberVerified: true,
        isVerified: true,
      },
    });
    if (!before) return NextResponse.json({ error: "Attorney not found" }, { status: 404 });

    if (target === "badge") {
      if (!badgeType) return NextResponse.json({ error: "badgeType required" }, { status: 400 });
      if (action === "grant_badge") {
        await prisma.attorneyBadgeGrant.create({
          data: {
            attorneyId,
            badgeType,
            source: "MANUAL",
            active: true,
            reason: note ?? null,
            grantedByUserId: auth.authUserId,
          },
        });
      } else if (action === "revoke_badge") {
        await prisma.attorneyBadgeGrant.updateMany({
          where: { attorneyId, badgeType, active: true },
          data: { active: false, reason: note ?? "Revoked by admin", reviewedAt: new Date() },
        });
      }
      await logAdminAction({
        adminUserId: auth.authUserId,
        entityType: "ATTORNEY",
        entityId: attorneyId,
        action: `ATTORNEY_BADGE_${action.toUpperCase()}`,
        reason: note ?? null,
        metadata: { badgeType },
      });
      await syncAttorneySystemBadges(attorneyId).catch(() => null);
      return NextResponse.json({ ok: true });
    }

    const update: Record<string, unknown> = {};
    if (target === "identity") {
      if (action === "verify") {
        update.identityVerificationStatus = "VERIFIED";
        update.identityVerifiedAt = new Date();
        update.identityVerificationNote = note ?? null;
        update.isVerified = true;
      } else if (action === "needs_info") {
        update.identityVerificationStatus = "NEEDS_INFO";
        update.identityVerificationNote = note ?? "Please provide additional identity documentation.";
      } else if (action === "reject") {
        update.identityVerificationStatus = "REJECTED";
        update.identityVerificationNote = note ?? "Identity verification rejected.";
      }
    } else if (target === "bar") {
      if (action === "verify") {
        update.barVerificationStatus = "VERIFIED";
        update.barVerificationNote = note ?? null;
        update.barVerifiedAt = new Date();
        update.barNumberVerified = true;
      } else if (action === "needs_info") {
        update.barVerificationStatus = "NEEDS_INFO";
        update.barVerificationNote = note ?? "Please provide additional bar verification information.";
      } else if (action === "reject") {
        update.barVerificationStatus = "REJECTED";
        update.barVerificationNote = note ?? "Bar verification rejected.";
        update.barNumberVerified = false;
      }
    }

    const updated = await prisma.attorneyProfile.update({ where: { id: attorneyId }, data: update });
    await prisma.attorneyVerificationLog.create({
      data: {
        attorneyId,
        adminUserId: auth.authUserId,
        action: action === "verify" ? "APPROVE" : action === "needs_info" ? "REQUEST_INFO" : "REJECT",
        toStatus: updated.reviewStatus,
        templateKey: target === "identity" ? "IDENTITY_VERIFICATION" : "BAR_VERIFICATION",
        templateReply: note ?? null,
        reason: note ?? null,
        beforeSnapshot: {
          identityVerificationStatus: before.identityVerificationStatus,
          barVerificationStatus: before.barVerificationStatus,
          barNumberVerified: before.barNumberVerified,
          isVerified: before.isVerified,
        },
        afterSnapshot: {
          identityVerificationStatus: updated.identityVerificationStatus,
          barVerificationStatus: updated.barVerificationStatus,
          barNumberVerified: updated.barNumberVerified,
          isVerified: updated.isVerified,
        },
        fieldDiff: {
          ...(target === "identity"
            ? {
                identityVerificationStatus: { old: before.identityVerificationStatus, new: updated.identityVerificationStatus },
                isVerified: { old: before.isVerified, new: updated.isVerified },
              }
            : {
                barVerificationStatus: { old: before.barVerificationStatus, new: updated.barVerificationStatus },
                barNumberVerified: { old: before.barNumberVerified, new: updated.barNumberVerified },
              }),
        },
      },
    });
    await logAdminAction({
      adminUserId: auth.authUserId,
      entityType: "ATTORNEY",
      entityId: attorneyId,
      action: `ATTORNEY_${target.toUpperCase()}_${action.toUpperCase()}`,
      reason: note ?? null,
      metadata: {
        diff:
          target === "identity"
            ? { identityVerificationStatus: { old: before.identityVerificationStatus, new: updated.identityVerificationStatus } }
            : { barVerificationStatus: { old: before.barVerificationStatus, new: updated.barVerificationStatus } },
      },
    });
    await syncAttorneySystemBadges(attorneyId).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/marketplace/admin/attorneys/[attorneyId]/trust-actions failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
