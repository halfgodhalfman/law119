import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const attorneyId = (url.searchParams.get("attorneyId") ?? "").trim();
    const action = (url.searchParams.get("action") ?? "").trim();
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);

    const where = {
      ...(attorneyId ? { attorneyId } : {}),
      ...(action ? { action: action as never } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.attorneyVerificationLog.count({ where }),
      prisma.attorneyVerificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          attorneyId: true,
          adminUserId: true,
          action: true,
          toStatus: true,
          templateKey: true,
          templateReply: true,
          reason: true,
          fieldDiff: true,
          completenessScore: true,
          createdAt: true,
          attorney: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              user: { select: { email: true } },
            },
          },
          adminUser: { select: { id: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      items: items.map((it) => ({
        ...it,
        attorneyName: [it.attorney.firstName, it.attorney.lastName].filter(Boolean).join(" ") || "未填写姓名",
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/attorney-verification-logs failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

