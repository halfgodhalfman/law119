export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const status = (url.searchParams.get("reviewStatus") ?? "PENDING_REVIEW").trim();
    const q = (url.searchParams.get("q") ?? "").trim();
    const items = await prisma.paymentMilestone.findMany({
      where: {
        ...(status ? { releaseReviewStatus: status as never } : {}),
        ...(q
          ? {
              OR: [
                { id: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
                { paymentOrder: { id: { contains: q, mode: "insensitive" } } },
                { paymentOrder: { title: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: [
        { releaseReviewRequestedAt: "asc" },
        { createdAt: "desc" },
      ],
      take: 300,
      include: {
        paymentOrder: {
          select: {
            id: true, title: true, status: true, currency: true, caseId: true, conversationId: true,
            holdBlockedByDispute: true, holdReasonCode: true, holdBlockedReason: true,
          },
        },
      },
    });
    return NextResponse.json({ ok: true, items, summary: { total: items.length, pending: items.filter((i) => i.releaseReviewStatus === 'PENDING_REVIEW').length } });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("GET /api/marketplace/admin/payout-review-queue failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
