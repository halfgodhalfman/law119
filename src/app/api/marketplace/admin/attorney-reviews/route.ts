import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const q = (searchParams.get("q") || "").trim();
    const rows = await prisma.attorneyClientReview.findMany({
      where: {
        ...(status && status !== "ALL" ? { status: status as "PUBLISHED" | "HIDDEN" } : {}),
        ...(q
          ? {
              OR: [
                { comment: { contains: q, mode: "insensitive" } },
                { attorney: { firstName: { contains: q, mode: "insensitive" } } },
                { attorney: { lastName: { contains: q, mode: "insensitive" } } },
                { case: { title: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        ratingOverall: true,
        ratingResponsiveness: true,
        ratingProfessionalism: true,
        ratingCommunication: true,
        wouldRecommend: true,
        comment: true,
        moderationReason: true,
        moderationLabels: true,
        moderatedAt: true,
        createdAt: true,
        attorney: { select: { id: true, firstName: true, lastName: true, firmName: true } },
        case: { select: { id: true, title: true } },
      },
    });
    return NextResponse.json({ ok: true, items: rows });
  } catch (e) {
    console.error("GET /api/marketplace/admin/attorney-reviews failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

