export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    await prisma.userBlacklist.updateMany({
      where: { active: true, expiresAt: { lte: new Date() } },
      data: { active: false, deactivatedAt: new Date() },
    }).catch(() => null);
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get("activeOnly") !== "0";
    const q = (url.searchParams.get("q") ?? "").trim();
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);

    const where = {
      ...(activeOnly ? { active: true } : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" as const } },
              { reason: { contains: q, mode: "insensitive" as const } },
              ...(q.includes("-")
                ? [{ blockerUserId: { equals: q } }, { blockedUserId: { equals: q } }, { conversationId: { equals: q } }]
                : []),
              { blocker: { is: { email: { contains: q, mode: "insensitive" as const } } } },
              { blocked: { is: { email: { contains: q, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.userBlacklist.count({ where }),
      prisma.userBlacklist.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          conversationId: true,
          scope: true,
          blockerUserId: true,
          blockedUserId: true,
          reason: true,
          active: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          deactivatedAt: true,
          deactivatedByUserId: true,
          blocker: { select: { email: true } },
          blocked: { select: { email: true } },
          deactivatedBy: { select: { email: true } },
          conversation: { select: { caseId: true, case: { select: { title: true } } } },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      filters: { activeOnly, q, page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/blacklists failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
