export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { syncAttorneySystemBadges } from "@/lib/attorney-badges";

const reviewSchema = z.object({
  ratingOverall: z.number().int().min(1).max(5),
  ratingResponsiveness: z.number().int().min(1).max(5).optional().nullable(),
  ratingProfessionalism: z.number().int().min(1).max(5).optional().nullable(),
  ratingCommunication: z.number().int().min(1).max(5).optional().nullable(),
  wouldRecommend: z.boolean().optional().nullable(),
  comment: z.string().trim().max(2000).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ engagementId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "CLIENT" || !auth.clientProfileId) {
      return NextResponse.json({ error: "Only clients can submit reviews." }, { status: 403 });
    }
    const { engagementId } = await params;
    const parsed = reviewSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const commentText = parsed.data.comment?.trim() ?? "";
    if (/guarantee|guaranteed|保证胜诉|包赢/i.test(commentText)) {
      return NextResponse.json({ error: "评价内容包含不合规结果保证表述，请修改后提交。" }, { status: 400 });
    }

    const engagement = await prisma.engagementConfirmation.findUnique({
      where: { id: engagementId },
      select: {
        id: true,
        status: true,
        clientProfileId: true,
        attorneyProfileId: true,
        caseId: true,
        conversation: { select: { status: true } },
        paymentOrders: { select: { amountReleased: true } },
        attorneyClientReviews: { select: { id: true } },
      },
    });
    if (!engagement) return NextResponse.json({ error: "Engagement not found." }, { status: 404 });
    if (engagement.clientProfileId !== auth.clientProfileId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (engagement.attorneyClientReviews.length > 0) {
      return NextResponse.json({ error: "Review already submitted." }, { status: 409 });
    }
    const hasReleasedPayment = engagement.paymentOrders.some((p) => Number(p.amountReleased ?? 0) > 0);
    const conversationClosed = engagement.conversation?.status === "CLOSED";
    if (engagement.status !== "ACTIVE" || !(hasReleasedPayment || conversationClosed)) {
      return NextResponse.json({ error: "Review is available after completion." }, { status: 409 });
    }

    const created = await prisma.attorneyClientReview.create({
      data: {
        attorneyId: engagement.attorneyProfileId,
        clientProfileId: auth.clientProfileId,
        engagementId: engagement.id,
        caseId: engagement.caseId,
        ...parsed.data,
      },
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
    });
    await syncAttorneySystemBadges(engagement.attorneyProfileId).catch(() => null);

    return NextResponse.json({ ok: true, review: created });
  } catch (error) {
    console.error("POST /api/marketplace/engagements/[engagementId]/review failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
