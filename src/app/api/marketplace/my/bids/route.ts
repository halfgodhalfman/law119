import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuthContext } from "../../../../../lib/auth-context";
import { prisma } from "../../../../../lib/prisma";
import { summarizeCaseDescription } from "../../../../../lib/case-redaction";

type BidFilterGroup =
  | "pending_quote"
  | "in_progress"
  | "completed"
  | "withdrawn"
  | "todo"
  | "selected"
  | "ended";

function buildBidWhere(statusGroup: BidFilterGroup | null, attorneyProfileId: string): Prisma.BidWhereInput {
  if (statusGroup === "pending_quote") {
    return {
      attorneyProfileId,
      status: "PENDING" as const,
    };
  }
  if (statusGroup === "in_progress") {
    return {
      attorneyProfileId,
      status: "ACCEPTED" as const,
      case: { is: { status: "MATCHING" as const } },
    };
  }
  if (statusGroup === "completed") {
    return {
      attorneyProfileId,
      status: "ACCEPTED" as const,
      case: { is: { status: "CLOSED" as const } },
    };
  }
  if (statusGroup === "withdrawn") {
    return {
      attorneyProfileId,
      status: "WITHDRAWN" as const,
    };
  }
  if (statusGroup === "todo") {
    return {
      attorneyProfileId,
      status: "PENDING" as const,
      case: { is: { status: { in: ["OPEN", "MATCHING"] } } },
    };
  }
  if (statusGroup === "selected") {
    return {
      attorneyProfileId,
      status: "ACCEPTED" as const,
      case: { is: { status: "MATCHING" as const } },
    };
  }
  if (statusGroup === "ended") {
    return {
      attorneyProfileId,
      OR: [
        { status: "ACCEPTED" as const, case: { is: { status: "CLOSED" as const } } },
        { status: "REJECTED" as const },
        { status: "ACCEPTED" as const, case: { is: { status: "CANCELLED" as const } } },
      ],
    };
  }
  return { attorneyProfileId };
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildDailySeries(points: Date[], sourceDates: Date[]) {
  const keys = points.map((p) => p.toISOString().slice(0, 10));
  const counter = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const d of sourceDates) {
    const key = startOfDay(d).toISOString().slice(0, 10);
    if (counter.has(key)) counter.set(key, (counter.get(key) ?? 0) + 1);
  }
  return keys.map((k) => ({ day: k, count: counter.get(k) ?? 0 }));
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ATTORNEY" || !auth.attorneyProfileId) {
      return NextResponse.json({ error: "Attorney login required." }, { status: 403 });
    }

    const url = new URL(request.url);
    const statusGroupRaw = url.searchParams.get("status");
    const statusGroup =
      statusGroupRaw === "pending_quote" ||
      statusGroupRaw === "in_progress" ||
      statusGroupRaw === "completed" ||
      statusGroupRaw === "withdrawn" ||
      statusGroupRaw === "todo" ||
      statusGroupRaw === "selected" ||
      statusGroupRaw === "ended"
        ? statusGroupRaw
        : null;
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "10") || 10, 1), 50);
    const sort =
      url.searchParams.get("sort") === "updated_desc" ||
      url.searchParams.get("sort") === "price_desc" ||
      url.searchParams.get("sort") === "price_asc" ||
      url.searchParams.get("sort") === "todo_first" ||
      url.searchParams.get("sort") === "created_asc"
        ? (url.searchParams.get("sort") as "updated_desc" | "price_desc" | "price_asc" | "created_asc" | "todo_first")
        : "todo_first";
    const where = buildBidWhere(statusGroup, auth.attorneyProfileId);
    const total = await prisma.bid.count({ where });
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const [todoCount, withdrawnCount, selectedCount, endedCount] = await Promise.all([
      prisma.bid.count({ where: buildBidWhere("todo", auth.attorneyProfileId) }),
      prisma.bid.count({ where: buildBidWhere("withdrawn", auth.attorneyProfileId) }),
      prisma.bid.count({ where: buildBidWhere("selected", auth.attorneyProfileId) }),
      prisma.bid.count({ where: buildBidWhere("ended", auth.attorneyProfileId) }),
    ]);
    const trendStart = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
    const trendPoints = Array.from({ length: 30 }, (_, idx) => new Date(trendStart.getTime() + idx * 24 * 60 * 60 * 1000));
    const todoTrendRows = await prisma.bid.findMany({
      where: {
        ...buildBidWhere("todo", auth.attorneyProfileId),
        OR: [
          { createdAt: { gte: trendStart } },
          { updatedAt: { gte: trendStart } },
        ],
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });
    const todoCreatedSeries30d = buildDailySeries(
      trendPoints,
      todoTrendRows.filter((r) => r.createdAt >= trendStart).map((r) => r.createdAt),
    );
    const todoTouchedSeries30d = buildDailySeries(
      trendPoints,
      todoTrendRows.filter((r) => r.updatedAt >= trendStart).map((r) => r.updatedAt),
    );

    const items = await prisma.bid.findMany({
      where,
      orderBy:
        sort === "updated_desc"
          ? { updatedAt: "desc" }
          : sort === "created_asc"
            ? { createdAt: "asc" }
            : { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        feeQuoteMin: true,
        feeQuoteMax: true,
        message: true,
        version: true,
        updatedAt: true,
        createdAt: true,
        _count: { select: { versions: true } },
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        case: {
          select: {
            id: true,
            title: true,
            category: true,
            stateCode: true,
            city: true,
            status: true,
            description: true,
            descriptionMasked: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const sortedItems =
      sort === "price_desc" || sort === "price_asc"
        ? [...items].sort((a, b) => {
            const av = a.feeQuoteMax ?? a.feeQuoteMin ?? 0;
            const bv = b.feeQuoteMax ?? b.feeQuoteMin ?? 0;
            const cmp = Number(av) - Number(bv);
            return sort === "price_asc" ? cmp : -cmp;
          })
        : sort === "todo_first"
          ? [...items].sort((a, b) => {
              const rank = (bid: (typeof items)[number]) => {
                if (bid.status === "PENDING" && (bid.case.status === "OPEN" || bid.case.status === "MATCHING")) return 0;
                if (bid.status === "ACCEPTED" && bid.case.status === "MATCHING") return 1;
                if (bid.status === "WITHDRAWN") return 3;
                return 2; // ended / others
              };
              return rank(a) - rank(b) || b.updatedAt.getTime() - a.updatedAt.getTime();
            })
        : items;

    return NextResponse.json({
      ok: true,
      items: sortedItems.map((bid) => ({
        id: bid.id,
        status: bid.status,
        priceMin: bid.feeQuoteMin,
        priceMax: bid.feeQuoteMax,
        proposalText: bid.message ?? "",
        version: bid.version,
        versionCount: bid._count.versions,
        latestVersionAt: bid.versions[0]?.createdAt ?? null,
        updatedAt: bid.updatedAt,
        createdAt: bid.createdAt,
        case: {
          id: bid.case.id,
          title: bid.case.title,
          category: bid.case.category,
          stateCode: bid.case.stateCode,
          city: bid.case.city,
          caseStatus: bid.case.status,
          descriptionMasked:
            bid.case.descriptionMasked ??
            summarizeCaseDescription(bid.case.description, 140),
        },
      })),
      filters: {
        status: statusGroup,
        sort,
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
      summary: {
        todo: todoCount,
        withdrawn: withdrawnCount,
        selected: selectedCount,
        ended: endedCount,
        recentTodo7d: await prisma.bid.count({
          where: {
            ...buildBidWhere("todo", auth.attorneyProfileId),
            createdAt: { gte: sevenDaysAgo },
          },
        }),
        previousTodo7d: await prisma.bid.count({
          where: {
            ...buildBidWhere("todo", auth.attorneyProfileId),
            createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
          },
        }),
        recentTodoTouched7d: await prisma.bid.count({
          where: {
            ...buildBidWhere("todo", auth.attorneyProfileId),
            updatedAt: { gte: sevenDaysAgo },
          },
        }),
        previousTodoTouched7d: await prisma.bid.count({
          where: {
            ...buildBidWhere("todo", auth.attorneyProfileId),
            updatedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
          },
        }),
        recentTodo30d: await prisma.bid.count({
          where: {
            ...buildBidWhere("todo", auth.attorneyProfileId),
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        previousTodo30d: await prisma.bid.count({
          where: {
            ...buildBidWhere("todo", auth.attorneyProfileId),
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
        }),
        recentTodoTouched30d: await prisma.bid.count({
          where: {
            ...buildBidWhere("todo", auth.attorneyProfileId),
            updatedAt: { gte: thirtyDaysAgo },
          },
        }),
        previousTodoTouched30d: await prisma.bid.count({
          where: {
            ...buildBidWhere("todo", auth.attorneyProfileId),
            updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
        }),
        todoCreatedSeries30d,
        todoTouchedSeries30d,
      },
    });
  } catch (error) {
    console.error("GET /api/marketplace/my/bids failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
