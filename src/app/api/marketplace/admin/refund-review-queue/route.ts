import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const reviewStatus = (url.searchParams.get("reviewStatus") ?? "PENDING_REVIEW").trim();
    const q = (url.searchParams.get("q") ?? "").trim();
    const items = await prisma.paymentOrder.findMany({
      where: {
        ...(reviewStatus ? { refundReviewStatus: reviewStatus as never } : {}),
        ...(q
          ? {
              OR: [
                { id: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
                { refundReviewNote: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ refundRequestedAt: "asc" }, { createdAt: "desc" }],
      take: 300,
      include: { milestones: { orderBy: { sortOrder: 'asc' } } },
    });
    return NextResponse.json({ ok: true, items, summary: { total: items.length, pending: items.filter((i)=>i.refundReviewStatus === 'PENDING_REVIEW').length } });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("GET /api/marketplace/admin/refund-review-queue failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
