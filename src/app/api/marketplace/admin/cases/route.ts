export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuthContext } from "../../../../../lib/auth-context";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const stateCode = url.searchParams.get("stateCode")?.toUpperCase();
    const q = url.searchParams.get("q")?.trim();
    const abnormalOnly = url.searchParams.get("abnormalOnly") === "1";
    const abnormalType = url.searchParams.get("abnormalType")?.trim() ?? "";
    const slaOverdue = (url.searchParams.get("slaOverdue") ?? "").trim();
    const sort = (url.searchParams.get("sort") ?? "updated_desc").trim();
    const highValueOnly = url.searchParams.get("highValueOnly") === "1";
    const conversionStageFilter = (url.searchParams.get("conversionStage") ?? "").trim();
    const exportAll = url.searchParams.get("exportAll") === "1";
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);

    const now = new Date();
    const where = {
      ...(status ? { status: status as never } : {}),
      ...(category ? { category: category as never } : {}),
      ...(stateCode ? { stateCode } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { id: { contains: q } },
            ],
          }
        : {}),
    };

    const needPostFilter = abnormalOnly || Boolean(abnormalType) || highValueOnly || Boolean(conversionStageFilter);
    const [total, opsWeights, items] = await Promise.all([
      prisma.case.count({ where }),
      prisma.opsPrioritySetting.findUnique({ where: { key: "default" } }),
      prisma.case.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      ...(needPostFilter || exportAll ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
      ...(needPostFilter || exportAll ? { take: 5000 } : {}),
      include: {
        _count: { select: { bids: true, conversations: true } },
        bids: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { id: true, createdAt: true },
        },
        conversations: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            createdAt: true,
            messages: {
              where: { senderRole: "ATTORNEY" as never },
              orderBy: { createdAt: "asc" },
              take: 1,
              select: { id: true, createdAt: true },
            },
          },
        },
        engagementConfirmations: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, createdAt: true },
        },
      },
    }),
    ]);

    const mapped = items.map((c) => {
      const abnormalReasons: string[] = [];
      if (!c.descriptionMasked) abnormalReasons.push("missing_masked_summary");
      if (
        c.budgetMin != null &&
        c.budgetMax != null &&
        Number(c.budgetMin) > Number(c.budgetMax)
      ) {
        abnormalReasons.push("budget_range_invalid");
      }
      if (c.quoteDeadline && c.quoteDeadline < now && (c.status === "OPEN" || c.status === "MATCHING")) {
        abnormalReasons.push("expired_but_still_open");
      }

      const budgetHighThreshold = 5000;
      const budgetMax = c.budgetMax != null ? Number(c.budgetMax) : null;
      const budgetMin = c.budgetMin != null ? Number(c.budgetMin) : null;
      const highValueReasons: string[] = [];
      if ((budgetMax ?? budgetMin ?? 0) >= budgetHighThreshold) highValueReasons.push("HIGH_BUDGET");
      if (c.urgency === "HIGH" || c.urgency === "URGENT") highValueReasons.push("HIGH_URGENCY");
      if (["IMMIGRATION", "FAMILY", "BUSINESS", "CRIMINAL_DEFENSE"].includes(String(c.category))) {
        highValueReasons.push("HOT_CATEGORY");
      }

      const firstBidAt = c.bids[0]?.createdAt ?? null;
      const firstConversation = [...c.conversations].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )[0];
      const firstAttorneyMessage = c.conversations
        .flatMap((conv) => conv.messages.map((m) => m.createdAt))
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

      const firstBidMinutes = firstBidAt ? Math.max(0, Math.round((new Date(firstBidAt).getTime() - new Date(c.createdAt).getTime()) / 60000)) : null;
      const firstAttorneyMessageMinutes = firstAttorneyMessage
        ? Math.max(0, Math.round((new Date(firstAttorneyMessage).getTime() - new Date(c.createdAt).getTime()) / 60000))
        : null;

      const latestEngagement = c.engagementConfirmations[0] ?? null;
      const conversionStage =
        latestEngagement && ["ACTIVE", "PENDING_CLIENT", "PENDING_ATTORNEY"].includes(String(latestEngagement.status))
          ? "ENGAGED"
          : c.conversations.length > 0
            ? "CONTACTED"
            : c.selectedBidId
              ? "SELECTED"
              : c._count.bids > 0
                ? "QUOTED"
                : "PUBLISHED";

      const slaOverdueFlags = {
        firstBid24h: firstBidMinutes == null || firstBidMinutes > 24 * 60,
        firstAttorneyMessage24h: firstAttorneyMessageMinutes == null || firstAttorneyMessageMinutes > 24 * 60,
      };
      const opsPriorityReasons: string[] = [];
      let opsPriorityScore = 0;
      const weights = {
        highValueBaseWeight: opsWeights?.highValueBaseWeight ?? 30,
        highValueReasonWeight: opsWeights?.highValueReasonWeight ?? 5,
        firstBidOverduePublishedWeight: opsWeights?.firstBidOverduePublishedWeight ?? 35,
        firstMessageOverdueWeight: opsWeights?.firstMessageOverdueWeight ?? 25,
        quotedNotSelectedWeight: opsWeights?.quotedNotSelectedWeight ?? 15,
        selectedNoConversationWeight: opsWeights?.selectedNoConversationWeight ?? 20,
        urgentWeight: opsWeights?.urgentWeight ?? 10,
      };

      if (highValueReasons.length > 0) {
        opsPriorityScore += weights.highValueBaseWeight + highValueReasons.length * weights.highValueReasonWeight;
        opsPriorityReasons.push(...highValueReasons.map((r) => `HIGH_VALUE:${r}`));
      }
      if (slaOverdueFlags.firstBid24h && conversionStage === "PUBLISHED") {
        opsPriorityScore += weights.firstBidOverduePublishedWeight;
        opsPriorityReasons.push("SLA_OVERDUE:FIRST_BID_24H");
      }
      if (slaOverdueFlags.firstAttorneyMessage24h && ["SELECTED", "CONTACTED"].includes(conversionStage)) {
        opsPriorityScore += weights.firstMessageOverdueWeight;
        opsPriorityReasons.push("SLA_OVERDUE:FIRST_MESSAGE_24H");
      }
      if (conversionStage === "QUOTED" && !c.selectedBidId) {
        opsPriorityScore += weights.quotedNotSelectedWeight;
        opsPriorityReasons.push("BOTTLENECK:QUOTED_NOT_SELECTED");
      }
      if (conversionStage === "SELECTED" && c.conversations.length === 0) {
        opsPriorityScore += weights.selectedNoConversationWeight;
        opsPriorityReasons.push("BOTTLENECK:SELECTED_NO_CONVERSATION");
      }
      if (c.urgency === "URGENT") {
        opsPriorityScore += weights.urgentWeight;
        opsPriorityReasons.push("URGENCY:URGENT");
      }
      const firstBidOverdueMinutes = firstBidMinutes == null ? Math.max(0, Math.round((now.getTime() - new Date(c.createdAt).getTime()) / 60000) - 24 * 60) : Math.max(0, firstBidMinutes - 24 * 60);
      const firstMessageOverdueMinutes = firstAttorneyMessageMinutes == null ? Math.max(0, Math.round((now.getTime() - new Date(c.createdAt).getTime()) / 60000) - 24 * 60) : Math.max(0, firstAttorneyMessageMinutes - 24 * 60);
      const slaOverdueDurationMinutes = Math.max(firstBidOverdueMinutes, firstMessageOverdueMinutes);

      return {
        id: c.id,
        title: c.title,
        category: c.category,
        stateCode: c.stateCode,
        city: c.city,
        status: c.status,
        urgency: c.urgency,
        quoteDeadline: c.quoteDeadline,
        quoteCount: c._count.bids,
        conversationCount: c._count.conversations,
        selectedBidId: c.selectedBidId,
        budgetMin: c.budgetMin,
        budgetMax: c.budgetMax,
        feeMode: c.feeMode,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        abnormalReasons,
        highValue: {
          isHighValue: highValueReasons.length > 0,
          reasons: highValueReasons,
        },
        responseSla: {
          firstBidAt,
          firstBidMinutes,
          firstAttorneyMessageAt: firstAttorneyMessage,
          firstAttorneyMessageMinutes,
          firstConversationAt: firstConversation?.createdAt ?? null,
        },
        conversionStage,
        slaOverdue: slaOverdueFlags,
        slaOverdueDurationMinutes,
        opsPriorityScore,
        opsPriorityReasons,
      };
    });

    let filteredMapped = abnormalOnly ? mapped.filter((c) => c.abnormalReasons.length > 0) : mapped;
    if (abnormalType) {
      filteredMapped = filteredMapped.filter((c) => c.abnormalReasons.includes(abnormalType));
    }
    if (highValueOnly) {
      filteredMapped = filteredMapped.filter((c) => c.highValue.isHighValue);
    }
    if (conversionStageFilter) {
      filteredMapped = filteredMapped.filter((c) => c.conversionStage === conversionStageFilter);
    }
    if (slaOverdue === "first_bid_24h") {
      filteredMapped = filteredMapped.filter((c) => c.slaOverdue.firstBid24h);
    } else if (slaOverdue === "first_message_24h") {
      filteredMapped = filteredMapped.filter((c) => c.slaOverdue.firstAttorneyMessage24h);
    }

    filteredMapped.sort((a, b) => {
      if (sort === "sla_overdue_desc") {
        if ((b.slaOverdueDurationMinutes ?? 0) !== (a.slaOverdueDurationMinutes ?? 0)) {
          return (b.slaOverdueDurationMinutes ?? 0) - (a.slaOverdueDurationMinutes ?? 0);
        }
      }
      if (sort === "ops_priority") {
        if ((b.opsPriorityScore ?? 0) !== (a.opsPriorityScore ?? 0)) {
          return (b.opsPriorityScore ?? 0) - (a.opsPriorityScore ?? 0);
        }
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    const bottleneckSummary = {
      quotedNotSelected: filteredMapped.filter((c) => c.conversionStage === "QUOTED").length,
      selectedNoConversation: filteredMapped.filter((c) => c.conversionStage === "SELECTED").length,
      contactedNotEngaged: filteredMapped.filter((c) => c.conversionStage === "CONTACTED").length,
    };

    const pagedItems = needPostFilter && !exportAll
      ? filteredMapped.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
      : filteredMapped;

    return NextResponse.json({
      ok: true,
      items: pagedItems,
      bottleneckSummary,
      filters: {
        status: status ?? "",
        category: category ?? "",
        stateCode: stateCode ?? "",
        q: q ?? "",
        abnormalOnly,
        abnormalType,
        slaOverdue,
        sort,
        highValueOnly,
        conversionStage: conversionStageFilter,
        exportAll,
        page,
        pageSize,
        total: needPostFilter || exportAll ? filteredMapped.length : total,
        totalPages: Math.max(
          Math.ceil((needPostFilter || exportAll ? filteredMapped.length : total) / pageSize),
          1,
        ),
      },
    });
  } catch (error) {
    console.error("GET /api/marketplace/admin/cases failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
