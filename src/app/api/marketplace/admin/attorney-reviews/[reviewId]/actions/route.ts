import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { logAdminAction } from "@/lib/admin-action-log";
import { syncAttorneySystemBadges } from "@/lib/attorney-badges";

const schema = z.object({
  action: z.enum(["publish", "hide"]),
  reason: z.string().trim().max(1000).optional().nullable(),
});

function moderationLabels(comment: string | null | undefined) {
  const text = (comment || "").toLowerCase();
  const labels: string[] = [];
  if (/guarantee|guaranteed|保证胜诉|包赢/.test(text)) labels.push("RESULT_GUARANTEE_CLAIM");
  if (/idiot|scam|骗子|垃圾/.test(text)) labels.push("ABUSIVE_LANGUAGE");
  return labels;
}

export async function POST(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { reviewId } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    const before = await prisma.attorneyClientReview.findUnique({ where: { id: reviewId } });
    if (!before) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    const labels = moderationLabels(before.comment);
    const updated = await prisma.attorneyClientReview.update({
      where: { id: reviewId },
      data: {
        status: parsed.data.action === "publish" ? "PUBLISHED" : "HIDDEN",
        moderationReason: parsed.data.reason ?? null,
        moderationLabels: labels,
        moderatedAt: new Date(),
        moderatedByUserId: auth.authUserId,
      },
      select: { id: true, status: true, moderatedAt: true },
    });
    await logAdminAction({
      adminUserId: auth.authUserId,
      entityType: "ATTORNEY",
      entityId: before.attorneyId,
      action: `ATTORNEY_REVIEW_${parsed.data.action.toUpperCase()}`,
      reason: parsed.data.reason ?? null,
      metadata: {
        reviewId,
        diff: { status: { old: before.status, new: updated.status } },
        moderationLabels: labels,
      },
    });
    await syncAttorneySystemBadges(before.attorneyId).catch(() => null);
    return NextResponse.json({ ok: true, review: updated });
  } catch (e) {
    console.error("POST /api/marketplace/admin/attorney-reviews/[reviewId]/actions failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
