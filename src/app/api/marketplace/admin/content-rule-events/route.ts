export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const scope = (url.searchParams.get("scope") ?? "").trim();
    const action = (url.searchParams.get("action") ?? "").trim();
    const q = (url.searchParams.get("q") ?? "").trim();
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "30") || 30, 1), 100);

    const where = {
      ...(scope ? { scope: scope as never } : {}),
      ...(action ? { action: action as never } : {}),
      ...(q
        ? {
            OR: [
              { ruleCode: { contains: q, mode: "insensitive" as const } },
              { note: { contains: q, mode: "insensitive" as const } },
              { matchedText: { contains: q, mode: "insensitive" as const } },
              ...(q.includes("-") ? [{ caseId: { equals: q } }, { bidId: { equals: q } }, { conversationId: { equals: q } }] : []),
            ],
          }
        : {}),
    };

    const [total, items, topRules] = await Promise.all([
      prisma.contentRuleEvent.count({ where }),
      prisma.contentRuleEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: { select: { email: true, role: true } },
          case: { select: { title: true } },
        },
      }),
      prisma.contentRuleEvent.groupBy({
        by: ["ruleCode", "scope", "action"],
        _count: { _all: true },
        where: scope ? { scope: scope as never } : undefined,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      topRules: topRules
        .sort((a, b) => b._count._all - a._count._all)
        .slice(0, 10),
      filters: { scope, action, q, page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("GET /api/marketplace/admin/content-rule-events failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

