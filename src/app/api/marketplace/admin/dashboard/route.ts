import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function GET() {
  try {
    await requireAdminAuth();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalCases,
      openCases,
      totalBids,
      pendingBids,
      totalConversations,
      openConversations,
      totalUsers,
      totalAttorneys,
      verifiedAttorneys,
      cases7d,
      bids7d,
      selectedBids7d,
      cases30d,
      bids30d,
      selectedBids30d,
      recentBids,
      recentCasesForBreakdown,
      recentConversations30d,
      payments30d,
      reports30d,
      blacklists30d,
      ruleHits30d,
      supportTickets30d,
      disputes30d,
    ] = await Promise.all([
      prisma.case.count(),
      prisma.case.count({ where: { status: { in: ["OPEN", "MATCHING"] } } }),
      prisma.bid.count(),
      prisma.bid.count({ where: { status: "PENDING" } }),
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: "OPEN" } }),
      prisma.user.count(),
      prisma.attorneyProfile.count(),
      prisma.attorneyProfile.count({ where: { isVerified: true } }),
      prisma.case.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.bid.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.bid.count({ where: { status: "ACCEPTED", updatedAt: { gte: sevenDaysAgo } } }),
      prisma.case.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.bid.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.bid.count({ where: { status: "ACCEPTED", updatedAt: { gte: thirtyDaysAgo } } }),
      prisma.bid.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, case: { select: { createdAt: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.case.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: {
          id: true,
          category: true,
          stateCode: true,
          selectedBidId: true,
          bids: { select: { id: true } },
          conversations: { select: { id: true } },
          engagementConfirmations: {
            select: { status: true },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
        take: 2000,
      }),
      prisma.conversation.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: {
          id: true,
          createdAt: true,
          messages: {
            where: { senderRole: "ATTORNEY" },
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
          case: { select: { createdAt: true } },
        },
        take: 2000,
      }),
      prisma.paymentOrder.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, createdAt: true, caseId: true, status: true, refundReviewStatus: true },
        take: 2000,
      }),
      prisma.conversationReport.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, createdAt: true, status: true },
        take: 2000,
      }),
      prisma.userBlacklist.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, createdAt: true, scope: true, active: true },
        take: 2000,
      }),
      prisma.contentRuleEvent.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, createdAt: true, action: true, scope: true },
        take: 5000,
      }),
      prisma.supportTicket.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, createdAt: true, slaDueAt: true, firstResponseAt: true, resolvedAt: true, status: true, priority: true },
        take: 2000,
      }),
      prisma.disputeTicket.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, createdAt: true, slaDueAt: true, firstResponseAt: true, resolvedAt: true, status: true, priority: true },
        take: 2000,
      }),
    ]);

    const responseHours = recentBids
      .map((b) => (b.createdAt.getTime() - b.case.createdAt.getTime()) / (1000 * 60 * 60))
      .filter((v) => v >= 0);
    const avgResponseHours =
      responseHours.length > 0 ? Number((responseHours.reduce((a, b) => a + b, 0) / responseHours.length).toFixed(1)) : null;

    const firstAttorneyMessageHours = recentConversations30d
      .map((c) => (c.messages[0] ? (c.messages[0].createdAt.getTime() - c.case.createdAt.getTime()) / 36e5 : null))
      .filter((v): v is number => v != null && v >= 0);
    const avgFirstAttorneyMessageHours =
      firstAttorneyMessageHours.length > 0
        ? Number((firstAttorneyMessageHours.reduce((a, b) => a + b, 0) / firstAttorneyMessageHours.length).toFixed(1))
        : null;

    const cases30dRows = recentCasesForBreakdown;
    const conversionFunnel30d = {
      published: cases30dRows.length,
      quoted: cases30dRows.filter((c) => c.bids.length > 0).length,
      selected: cases30dRows.filter((c) => !!c.selectedBidId).length,
      contacted: cases30dRows.filter((c) => c.conversations.length > 0).length,
      engaged: cases30dRows.filter((c) => c.engagementConfirmations.some((e) => ["ACTIVE", "PENDING_CLIENT", "PENDING_ATTORNEY"].includes(String(e.status)))).length,
      paid: payments30d.filter((p) => ["PAID_HELD", "PARTIALLY_RELEASED", "RELEASED", "REFUND_PENDING", "REFUNDED"].includes(String(p.status))).length,
    };
    const conversionRates30d = {
      quoteRate: conversionFunnel30d.published ? Number((conversionFunnel30d.quoted / conversionFunnel30d.published).toFixed(2)) : 0,
      selectRate: conversionFunnel30d.quoted ? Number((conversionFunnel30d.selected / conversionFunnel30d.quoted).toFixed(2)) : 0,
      contactRate: conversionFunnel30d.selected ? Number((conversionFunnel30d.contacted / conversionFunnel30d.selected).toFixed(2)) : 0,
      engageRate: conversionFunnel30d.contacted ? Number((conversionFunnel30d.engaged / conversionFunnel30d.contacted).toFixed(2)) : 0,
      payRate: conversionFunnel30d.engaged ? Number((conversionFunnel30d.paid / conversionFunnel30d.engaged).toFixed(2)) : 0,
    };

    function buildSupplyDemand(rows: typeof recentCasesForBreakdown, key: "category" | "stateCode") {
      const map = new Map<string, { cases: number; validBids: number; selected: number }>();
      for (const c of rows) {
        const bucket = String(c[key] ?? "UNKNOWN");
        const current = map.get(bucket) ?? { cases: 0, validBids: 0, selected: 0 };
        current.cases += 1;
        current.validBids += c.bids.length;
        if (c.selectedBidId) current.selected += 1;
        map.set(bucket, current);
      }
      return [...map.entries()]
        .map(([bucket, v]) => ({
          bucket,
          cases: v.cases,
          validBids: v.validBids,
          selected: v.selected,
          bidsPerCase: v.cases ? Number((v.validBids / v.cases).toFixed(2)) : 0,
          selectionPerCase: v.cases ? Number((v.selected / v.cases).toFixed(2)) : 0,
        }))
        .sort((a, b) => b.cases - a.cases)
        .slice(0, 10);
    }

    function buildDailyTrend<T extends { createdAt: Date }>(rows: T[]) {
      const labels: string[] = [];
      const counts = new Map<string, number>();
      for (let i = 29; i >= 0; i -= 1) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        labels.push(key);
        counts.set(key, 0);
      }
      for (const r of rows) {
        const key = r.createdAt.toISOString().slice(0, 10);
        if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return labels.map((label) => ({ label, value: counts.get(label) ?? 0 }));
    }

    const supportUnion = [
      ...supportTickets30d.map((s) => ({ kind: "support" as const, ...s })),
      ...disputes30d.map((d) => ({ kind: "dispute" as const, ...d })),
    ];
    const supportSla = {
      total: supportUnion.length,
      withSla: supportUnion.filter((t) => !!t.slaDueAt).length,
      firstResponseOnTime: supportUnion.filter((t) => t.slaDueAt && t.firstResponseAt && t.firstResponseAt <= t.slaDueAt).length,
      resolvedOnTime: supportUnion.filter((t) => t.slaDueAt && t.resolvedAt && t.resolvedAt <= t.slaDueAt).length,
      breachedOpen: supportUnion.filter((t) => t.slaDueAt && !t.resolvedAt && t.slaDueAt < now && ["OPEN", "UNDER_REVIEW", "WAITING_PARTY", "PENDING_PLATFORM", "PENDING_CLIENT"].includes(String(t.status))).length,
    };
    const supportSlaRates = {
      firstResponseRate: supportSla.withSla ? Number((supportSla.firstResponseOnTime / supportSla.withSla).toFixed(2)) : 0,
      resolvedRate: supportSla.withSla ? Number((supportSla.resolvedOnTime / supportSla.withSla).toFixed(2)) : 0,
    };

    function buildBreakdown(rows: typeof recentCasesForBreakdown, key: "category" | "stateCode") {
      const map = new Map<string, { published: number; quoted: number; selected: number; contacted: number; engaged: number }>();
      for (const c of rows) {
        const bucket = String(c[key] ?? "UNKNOWN");
        const current = map.get(bucket) ?? { published: 0, quoted: 0, selected: 0, contacted: 0, engaged: 0 };
        current.published += 1;
        if (c.bids.length > 0) current.quoted += 1;
        if (c.selectedBidId) current.selected += 1;
        if (c.conversations.length > 0) current.contacted += 1;
        if (c.engagementConfirmations.some((e) => ["ACTIVE", "PENDING_CLIENT", "PENDING_ATTORNEY"].includes(String(e.status)))) {
          current.engaged += 1;
        }
        map.set(bucket, current);
      }
      return [...map.entries()]
        .map(([bucket, v]) => ({
          bucket,
          ...v,
          quoteRate: v.published > 0 ? Number((v.quoted / v.published).toFixed(2)) : 0,
          selectRate: v.quoted > 0 ? Number((v.selected / v.quoted).toFixed(2)) : 0,
          contactRate: v.selected > 0 ? Number((v.contacted / v.selected).toFixed(2)) : 0,
          engageRate: v.contacted > 0 ? Number((v.engaged / v.contacted).toFixed(2)) : 0,
        }))
        .sort((a, b) => b.published - a.published)
        .slice(0, 8);
    }

    return NextResponse.json({
      ok: true,
      metrics: {
        totalCases,
        openCases,
        totalBids,
        pendingBids,
        totalConversations,
        openConversations,
        totalUsers,
        totalAttorneys,
        verifiedAttorneys,
        avgResponseHours,
        avgFirstAttorneyMessageHours,
      },
      funnels: {
        sevenDays: {
          newCases: cases7d,
          newBids: bids7d,
          selectedBids: selectedBids7d,
          bidRate: cases7d > 0 ? Number((bids7d / cases7d).toFixed(2)) : 0,
          selectionRate: bids7d > 0 ? Number((selectedBids7d / bids7d).toFixed(2)) : 0,
        },
        thirtyDays: {
          newCases: cases30d,
          newBids: bids30d,
          selectedBids: selectedBids30d,
          bidRate: cases30d > 0 ? Number((bids30d / cases30d).toFixed(2)) : 0,
          selectionRate: bids30d > 0 ? Number((selectedBids30d / bids30d).toFixed(2)) : 0,
        },
      },
      breakdowns: {
        categories30d: buildBreakdown(recentCasesForBreakdown, "category"),
        states30d: buildBreakdown(recentCasesForBreakdown, "stateCode"),
      },
      tabs: {
        growth: {
          totals: { totalCases, totalBids, totalConversations, totalUsers, totalAttorneys, verifiedAttorneys },
          new7d: { cases: cases7d, bids: bids7d, selectedBids: selectedBids7d },
          new30d: { cases: cases30d, bids: bids30d, selectedBids: selectedBids30d, payments: payments30d.length },
        },
        conversion: {
          funnel30d: conversionFunnel30d,
          rates30d: conversionRates30d,
          categorySupplyDemand30d: buildSupplyDemand(recentCasesForBreakdown, "category"),
          stateSupplyDemand30d: buildSupplyDemand(recentCasesForBreakdown, "stateCode"),
        },
        quality: {
          avgFirstBidResponseHours: avgResponseHours,
          avgFirstAttorneyMessageHours,
          quoteToSelectionRate30d: bids30d > 0 ? Number((selectedBids30d / bids30d).toFixed(2)) : 0,
        },
        risk: {
          summary30d: {
            reports: reports30d.length,
            blacklists: blacklists30d.length,
            ruleHits: ruleHits30d.length,
            activeBlacklists: blacklists30d.filter((b) => b.active).length,
          },
          trends30d: {
            reports: buildDailyTrend(reports30d),
            blacklists: buildDailyTrend(blacklists30d),
            ruleHits: buildDailyTrend(ruleHits30d),
          },
        },
        support: {
          sla30d: supportSla,
          slaRates30d: supportSlaRates,
          ticketCounts30d: { supportTickets: supportTickets30d.length, disputes: disputes30d.length },
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/dashboard failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
