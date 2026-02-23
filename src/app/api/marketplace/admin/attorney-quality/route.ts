import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { syncAttorneySystemBadges } from "@/lib/attorney-badges";

type Period = "7d" | "30d";

function getWindow(period: Period) {
  const now = new Date();
  const days = period === "7d" ? 7 : 30;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end: now, days };
}

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const period = ((url.searchParams.get("period") ?? "30d").trim() as Period) || "30d";
    const sort = (url.searchParams.get("sort") ?? "risk_desc").trim();
    const q = (url.searchParams.get("q") ?? "").trim();
    const riskOnly = url.searchParams.get("riskOnly") === "1";
    const highConversionOnly = url.searchParams.get("highConversionOnly") === "1";
    const refreshSnapshots = url.searchParams.get("refreshSnapshots") === "1";
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);

    const { start, end, days } = getWindow(period);
    const periodType = period === "7d" ? "WEEKLY" : "DAILY";

    const attorneys = await prisma.attorneyProfile.findMany({
      where: q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { firmName: { contains: q, mode: "insensitive" } },
              { user: { is: { email: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : undefined,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        firmName: true,
        isVerified: true,
        reviewStatus: true,
        user: { select: { id: true, email: true } },
        bids: {
          where: { createdAt: { gte: start, lte: end } },
          select: {
            id: true,
            status: true,
            createdAt: true,
            case: { select: { createdAt: true } },
          },
        },
        conversations: {
          where: { createdAt: { gte: start, lte: end } },
          select: {
            id: true,
            status: true,
            createdAt: true,
            messages: {
              where: { senderRole: "ATTORNEY" as never },
              orderBy: { createdAt: "asc" },
              take: 1,
              select: { createdAt: true },
            },
          },
        },
        disputeTickets: {
          where: { createdAt: { gte: start, lte: end } },
          select: { id: true, status: true, resolvedAt: true },
        },
        paymentOrders: {
          where: { createdAt: { gte: start, lte: end } },
          select: { id: true, status: true },
        },
      },
    });

    const attorneyUserIds = attorneys.map((a) => a.user.id);
    const attorneyIds = attorneys.map((a) => a.id);

    const [reports, blacklists, ruleEvents] = await Promise.all([
      prisma.conversationReport.findMany({
        where: {
          targetUserId: { in: attorneyUserIds },
          createdAt: { gte: start, lte: end },
        },
        select: { id: true, targetUserId: true, status: true },
      }),
      prisma.userBlacklist.findMany({
        where: {
          blockedUserId: { in: attorneyUserIds },
          active: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { id: true, blockedUserId: true },
      }),
      prisma.contentRuleEvent.findMany({
        where: {
          actorUserId: { in: attorneyUserIds },
          createdAt: { gte: start, lte: end },
        },
        select: { id: true, actorUserId: true, action: true },
      }),
    ]);

    const reportMap = new Map<string, number>();
    const blacklistMap = new Map<string, number>();
    const ruleMap = new Map<string, { total: number; blocks: number }>();
    for (const r of reports) {
      if (!r.targetUserId) continue;
      reportMap.set(r.targetUserId, (reportMap.get(r.targetUserId) ?? 0) + 1);
    }
    for (const b of blacklists) blacklistMap.set(b.blockedUserId, (blacklistMap.get(b.blockedUserId) ?? 0) + 1);
    for (const e of ruleEvents) {
      const curr = ruleMap.get(e.actorUserId ?? "") ?? { total: 0, blocks: 0 };
      curr.total += 1;
      if (String(e.action) === "BLOCK") curr.blocks += 1;
      ruleMap.set(e.actorUserId ?? "", curr);
    }

    const computed = attorneys.map((a) => {
      const bidResponseMins = a.bids
        .map((b) => Math.round((b.createdAt.getTime() - b.case.createdAt.getTime()) / 60000))
        .filter((v) => v >= 0);
      const msgResponseMins = a.conversations
        .map((c) => c.messages[0]?.createdAt ? Math.round((c.messages[0].createdAt.getTime() - c.createdAt.getTime()) / 60000) : null)
        .filter((v): v is number => v != null && v >= 0);

      const bidsCount = a.bids.length;
      const acceptedBidsCount = a.bids.filter((b) => b.status === "ACCEPTED").length;
      const conversationsCount = a.conversations.length;
      const closedConversationsCount = a.conversations.filter((c) => c.status === "CLOSED").length;
      const disputesCount = a.disputeTickets.length;
      const resolvedDisputesCount = a.disputeTickets.filter((d) => d.status === "RESOLVED" || d.status === "CLOSED").length;
      const paymentOrdersCount = a.paymentOrders.length;
      const refundLinkedCount = a.paymentOrders.filter((p) => ["REFUND_PENDING", "REFUNDED"].includes(String(p.status))).length;
      const reportsCount = reportMap.get(a.user.id) ?? 0;
      const ruleHits = ruleMap.get(a.user.id) ?? { total: 0, blocks: 0 };
      const activeBlacklistCount = blacklistMap.get(a.user.id) ?? 0;

      const avgFirstBidMinutes = bidResponseMins.length ? Math.round(bidResponseMins.reduce((s, v) => s + v, 0) / bidResponseMins.length) : null;
      const avgFirstMessageMinutes = msgResponseMins.length ? Math.round(msgResponseMins.reduce((s, v) => s + v, 0) / msgResponseMins.length) : null;
      const bidConversionRate = bidsCount > 0 ? acceptedBidsCount / bidsCount : 0;
      const completionRate = conversationsCount > 0 ? closedConversationsCount / conversationsCount : 0;
      const disputeRate = conversationsCount > 0 ? disputesCount / conversationsCount : 0;
      const complaintRate = conversationsCount > 0 ? reportsCount / conversationsCount : 0;
      const refundLinkedRate = paymentOrdersCount > 0 ? refundLinkedCount / paymentOrdersCount : 0;

      const complianceRiskScore = clampScore(
        reportsCount * 12 +
          disputesCount * 8 +
          ruleHits.total * 3 +
          ruleHits.blocks * 8 +
          activeBlacklistCount * 20 +
          (a.isVerified ? -5 : 5),
      );
      const qualityScore = clampScore(
        70 +
          (bidConversionRate * 20) +
          (completionRate * 15) -
          (complaintRate * 20) -
          (disputeRate * 15) -
          (complianceRiskScore * 0.35) -
          ((avgFirstBidMinutes ?? 24 * 60) > 24 * 60 ? 10 : 0) -
          ((avgFirstMessageMinutes ?? 24 * 60) > 24 * 60 ? 8 : 0),
      );

      return {
        attorneyId: a.id,
        attorneyName: [a.firstName, a.lastName].filter(Boolean).join(" ") || "未填写姓名",
        email: a.user.email,
        firmName: a.firmName,
        isVerified: a.isVerified,
        reviewStatus: a.reviewStatus,
        bidsCount,
        acceptedBidsCount,
        conversationsCount,
        closedConversationsCount,
        reportsCount,
        disputesCount,
        resolvedDisputesCount,
        refundLinkedCount,
        paymentOrdersCount,
        ruleHitCount: ruleHits.total,
        ruleBlockCount: ruleHits.blocks,
        activeBlacklistCount,
        avgFirstBidMinutes,
        avgFirstMessageMinutes,
        bidConversionRate: Number(bidConversionRate.toFixed(3)),
        completionRate: Number(completionRate.toFixed(3)),
        disputeRate: Number(disputeRate.toFixed(3)),
        complaintRate: Number(complaintRate.toFixed(3)),
        refundLinkedRate: Number(refundLinkedRate.toFixed(3)),
        complianceRiskScore,
        qualityScore,
      };
    });

    if (refreshSnapshots) {
      await prisma.$transaction(
        computed.map((c) =>
          prisma.attorneyScoreSnapshot.upsert({
            where: {
              attorneyId_period_periodStart: {
                attorneyId: c.attorneyId,
                period: periodType as any,
                periodStart: start,
              },
            },
            create: {
              attorneyId: c.attorneyId,
              period: periodType as any,
              periodStart: start,
              periodEnd: end,
              bidsCount: c.bidsCount,
              acceptedBidsCount: c.acceptedBidsCount,
              conversationsCount: c.conversationsCount,
              closedConversationsCount: c.closedConversationsCount,
              reportsCount: c.reportsCount,
              disputesCount: c.disputesCount,
              resolvedDisputesCount: c.resolvedDisputesCount,
              refundLinkedCount: c.refundLinkedCount,
              paymentOrdersCount: c.paymentOrdersCount,
              ruleHitCount: c.ruleHitCount,
              ruleBlockCount: c.ruleBlockCount,
              activeBlacklistCount: c.activeBlacklistCount,
              avgFirstBidMinutes: c.avgFirstBidMinutes,
              avgFirstMessageMinutes: c.avgFirstMessageMinutes,
              bidConversionRate: c.bidConversionRate,
              completionRate: c.completionRate,
              disputeRate: c.disputeRate,
              complaintRate: c.complaintRate,
              refundLinkedRate: c.refundLinkedRate,
              complianceRiskScore: c.complianceRiskScore,
              qualityScore: c.qualityScore,
              metadata: { days },
            },
            update: {
              periodEnd: end,
              bidsCount: c.bidsCount,
              acceptedBidsCount: c.acceptedBidsCount,
              conversationsCount: c.conversationsCount,
              closedConversationsCount: c.closedConversationsCount,
              reportsCount: c.reportsCount,
              disputesCount: c.disputesCount,
              resolvedDisputesCount: c.resolvedDisputesCount,
              refundLinkedCount: c.refundLinkedCount,
              paymentOrdersCount: c.paymentOrdersCount,
              ruleHitCount: c.ruleHitCount,
              ruleBlockCount: c.ruleBlockCount,
              activeBlacklistCount: c.activeBlacklistCount,
              avgFirstBidMinutes: c.avgFirstBidMinutes,
              avgFirstMessageMinutes: c.avgFirstMessageMinutes,
              bidConversionRate: c.bidConversionRate,
              completionRate: c.completionRate,
              disputeRate: c.disputeRate,
              complaintRate: c.complaintRate,
              refundLinkedRate: c.refundLinkedRate,
              complianceRiskScore: c.complianceRiskScore,
              qualityScore: c.qualityScore,
              metadata: { days },
            },
          }),
        ),
      );
      await Promise.allSettled(computed.map((c) => syncAttorneySystemBadges(c.attorneyId)));
    }

    let filtered = computed;
    if (riskOnly) filtered = filtered.filter((r) => r.complianceRiskScore >= 50);
    if (highConversionOnly) filtered = filtered.filter((r) => r.bidConversionRate >= 0.2);

    filtered.sort((a, b) => {
      if (sort === "conversion_desc") return b.bidConversionRate - a.bidConversionRate || b.bidsCount - a.bidsCount;
      if (sort === "quality_desc") return b.qualityScore - a.qualityScore;
      if (sort === "response_asc") return (a.avgFirstBidMinutes ?? 1e9) - (b.avgFirstBidMinutes ?? 1e9);
      return b.complianceRiskScore - a.complianceRiskScore || a.qualityScore - b.qualityScore;
    });

    const total = filtered.length;
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);

    const snapshots = await prisma.attorneyScoreSnapshot.findMany({
      where: { period: periodType as any, periodStart: start },
      orderBy: [{ qualityScore: "desc" }],
      take: 5,
      select: {
        attorneyId: true,
        qualityScore: true,
        complianceRiskScore: true,
        bidConversionRate: true,
        period: true,
        periodStart: true,
        attorney: { select: { firstName: true, lastName: true } },
      },
    });

    const trendWindowStart =
      period === "7d"
        ? new Date(end.getTime() - 12 * 7 * 24 * 60 * 60 * 1000)
        : new Date(end.getTime() - 12 * 30 * 24 * 60 * 60 * 1000);
    const trendSnapshots = await prisma.attorneyScoreSnapshot.findMany({
      where: {
        period: periodType as any,
        periodStart: { gte: trendWindowStart },
      },
      orderBy: { periodStart: "asc" },
      select: {
        periodStart: true,
        qualityScore: true,
        complianceRiskScore: true,
        avgFirstBidMinutes: true,
        avgFirstMessageMinutes: true,
        bidConversionRate: true,
        complaintRate: true,
        disputeRate: true,
      },
    });
    const trendBuckets = new Map<string, {
      periodStart: string;
      count: number;
      qualityTotal: number;
      riskTotal: number;
      bidSlaValues: number[];
      msgSlaValues: number[];
      conversionTotal: number;
      complaintRateTotal: number;
      disputeRateTotal: number;
    }>();
    for (const s of trendSnapshots) {
      const key = s.periodStart.toISOString();
      const bucket = trendBuckets.get(key) ?? {
        periodStart: key,
        count: 0,
        qualityTotal: 0,
        riskTotal: 0,
        bidSlaValues: [],
        msgSlaValues: [],
        conversionTotal: 0,
        complaintRateTotal: 0,
        disputeRateTotal: 0,
      };
      bucket.count += 1;
      bucket.qualityTotal += s.qualityScore;
      bucket.riskTotal += s.complianceRiskScore;
      bucket.conversionTotal += s.bidConversionRate;
      bucket.complaintRateTotal += s.complaintRate;
      bucket.disputeRateTotal += s.disputeRate;
      if (s.avgFirstBidMinutes != null) bucket.bidSlaValues.push(s.avgFirstBidMinutes);
      if (s.avgFirstMessageMinutes != null) bucket.msgSlaValues.push(s.avgFirstMessageMinutes);
      trendBuckets.set(key, bucket);
    }
    const trendSeries = [...trendBuckets.values()].map((b) => ({
      periodStart: b.periodStart,
      attorneyCount: b.count,
      avgQualityScore: b.count ? Math.round(b.qualityTotal / b.count) : 0,
      avgRiskScore: b.count ? Math.round(b.riskTotal / b.count) : 0,
      avgBidConversionRate: b.count ? Number((b.conversionTotal / b.count).toFixed(3)) : 0,
      avgComplaintRate: b.count ? Number((b.complaintRateTotal / b.count).toFixed(3)) : 0,
      avgDisputeRate: b.count ? Number((b.disputeRateTotal / b.count).toFixed(3)) : 0,
      avgFirstBidMinutes: b.bidSlaValues.length ? Math.round(b.bidSlaValues.reduce((x, y) => x + y, 0) / b.bidSlaValues.length) : null,
      avgFirstMessageMinutes: b.msgSlaValues.length ? Math.round(b.msgSlaValues.reduce((x, y) => x + y, 0) / b.msgSlaValues.length) : null,
    }));

    return NextResponse.json({
      ok: true,
      items,
      filters: { period, sort, q, riskOnly, highConversionOnly, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      snapshotsTop: snapshots.map((s) => ({
        ...s,
        attorneyName: [s.attorney.firstName, s.attorney.lastName].filter(Boolean).join(" ") || "未填写姓名",
      })),
      trendSeries,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/attorney-quality failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
