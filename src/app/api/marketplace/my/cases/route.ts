export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuthContext } from "../../../../../lib/auth-context";
import { prisma } from "../../../../../lib/prisma";
import { summarizeCaseDescription } from "../../../../../lib/case-redaction";

type CaseFilterGroup = "pending_quote" | "in_progress" | "completed";
type CaseLifecyclePhase = "pending_quote" | "in_progress" | "completed" | "cancelled";

function buildCaseWhere(statusGroup: CaseFilterGroup | null, clientProfileId: string): Prisma.CaseWhereInput {
  if (statusGroup === "pending_quote") {
    return {
      clientProfileId,
      status: { in: ["OPEN", "MATCHING"] },
      selectedBidId: null,
      conversations: { none: {} },
    };
  }
  if (statusGroup === "in_progress") {
    return {
      clientProfileId,
      status: { in: ["OPEN", "MATCHING"] },
      OR: [
        { selectedBidId: { not: null } },
        { conversations: { some: { status: "OPEN" } } },
      ],
    };
  }
  if (statusGroup === "completed") {
    return {
      clientProfileId,
      OR: [
        { status: "CLOSED" as const },
        { conversations: { some: { status: "CLOSED" } } },
      ],
    };
  }
  return { clientProfileId };
}

function deriveLifecyclePhase(item: {
  status: string;
  selectedBidId: string | null;
  conversations: { status: string }[];
}): CaseLifecyclePhase {
  if (item.status === "CANCELLED") return "cancelled";
  if (item.status === "CLOSED" || item.conversations.some((c) => c.status === "CLOSED")) return "completed";
  if (item.selectedBidId || item.conversations.some((c) => c.status === "OPEN")) return "in_progress";
  return "pending_quote";
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "CLIENT" || !auth.clientProfileId) {
      return NextResponse.json({ error: "Client login required." }, { status: 403 });
    }

    const url = new URL(request.url);
    const statusGroupRaw = url.searchParams.get("status");
    const statusGroup =
      statusGroupRaw === "pending_quote" ||
      statusGroupRaw === "in_progress" ||
      statusGroupRaw === "completed"
        ? statusGroupRaw
        : null;
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "10") || 10, 1), 50);
    const sort =
      url.searchParams.get("sort") === "updated_desc" ||
      url.searchParams.get("sort") === "quotes_desc" ||
      url.searchParams.get("sort") === "created_asc"
        ? (url.searchParams.get("sort") as "updated_desc" | "quotes_desc" | "created_asc")
        : "created_desc";
    const where = buildCaseWhere(statusGroup, auth.clientProfileId);
    const total = await prisma.case.count({ where });

    const items = await prisma.case.findMany({
      where,
      orderBy:
        sort === "updated_desc"
          ? { updatedAt: "desc" }
          : sort === "created_asc"
            ? { createdAt: "asc" }
            : sort === "quotes_desc"
              ? { createdAt: "desc" }
              : { createdAt: "desc" },
      include: {
        _count: { select: { bids: true } },
        conversations: { select: { status: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const sortedItems =
      sort === "quotes_desc"
        ? [...items].sort((a, b) => b._count.bids - a._count.bids || b.createdAt.getTime() - a.createdAt.getTime())
        : items;

    return NextResponse.json({
      ok: true,
      items: sortedItems.map((item) => ({
        lifecyclePhase: deriveLifecyclePhase(item),
        id: item.id,
        title: item.title,
        category: item.category,
        status: item.status,
        stateCode: item.stateCode,
        city: item.city,
        quoteCount: item._count.bids,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        selectedBidId: item.selectedBidId,
        descriptionMasked:
          item.descriptionMasked ??
          summarizeCaseDescription(item.description, 160),
      })),
      filters: {
        status: statusGroup,
        sort,
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    });
  } catch (error) {
    console.error("GET /api/marketplace/my/cases failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
