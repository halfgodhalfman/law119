export const dynamic = "force-dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "../../../lib/prisma";
import { requireAuthContext } from "../../../lib/auth-context";
import { NavBar } from "../../../components/ui/nav-bar";
import { AttorneyTabs } from "../../../components/attorney/attorney-tabs";
import { LockClosedIcon } from "../../../components/ui/icons";
import { computeAttorneyTier } from "@/lib/attorney-trust";

function num(v: unknown) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function usd(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function pct(v?: number | null) {
  return `${Math.round((v ?? 0) * 100)}%`;
}

function mins(v?: number | null) {
  if (v == null) return "N/A";
  if (v < 60) return `${Math.round(v)}m`;
  return `${Math.floor(v / 60)}h ${Math.round(v % 60)}m`;
}

function grade(score: number) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  return "C";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sparkline(values: number[], stroke = "#0f172a") {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const w = 240;
  const h = 52;
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full">
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} />
    </svg>
  );
}

function FunnelBar({ label, value, max, note }: { label: string; value: number; max: number; note?: string }) {
  const ratio = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-600">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-slate-900" style={{ width: `${ratio}%` }} />
      </div>
      {note && <p className="mt-1 text-[11px] text-slate-500">{note}</p>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function AttorneyAnalyticsPage() {
  const auth = await requireAuthContext().catch(() => null);
  if (!auth || auth.role !== "ATTORNEY" || !auth.attorneyProfileId) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <LockClosedIcon className="mx-auto h-8 w-8 text-rose-600" />
            <p className="mt-3 text-sm text-slate-700">请以律师身份登录后访问数据分析页。</p>
          </div>
        </main>
      </>
    );
  }

  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const attorney = await prisma.attorneyProfile.findUnique({
    where: { id: auth.attorneyProfileId },
    include: {
      user: { select: { id: true, email: true } },
      serviceAreas: { select: { stateCode: true } },
      specialties: { select: { category: true } },
      languages: { select: { language: true } },
    },
  });

  if (!attorney) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-700">律师档案不存在。</p>
          </div>
        </main>
      </>
    );
  }

  const serviceStates = new Set(attorney.serviceAreas.map((a) => a.stateCode).filter(Boolean));
  const specialtyCats = new Set(attorney.specialties.map((s) => s.category));

  const [
    snapshots,
    bids30,
    acceptedBids30,
    engagements30,
    conversations30,
    payments30,
    allCases30,
    allBids30,
    reports30,
    ruleHits30,
    activeBlacklists,
    openDisputes30,
    overdueFollowups,
    clientReviewAgg,
  ] = await Promise.all([
    prisma.attorneyScoreSnapshot.findMany({
      where: { attorneyId: auth.attorneyProfileId },
      orderBy: [{ periodEnd: "asc" }],
      take: 120,
    }),
    prisma.bid.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId, createdAt: { gte: d30 } },
      select: { id: true, status: true, createdAt: true, caseId: true, case: { select: { title: true } } },
    }),
    prisma.bid.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId, status: "ACCEPTED", createdAt: { gte: d30 } },
      select: { id: true, caseId: true, createdAt: true },
    }),
    prisma.engagementConfirmation.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId, createdAt: { gte: d30 } },
      select: { id: true, status: true, bidId: true, createdAt: true },
    }),
    prisma.conversation.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId, createdAt: { gte: d30 } },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { senderRole: true, createdAt: true },
        },
        case: { select: { id: true } },
      },
    }),
    prisma.paymentOrder.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId, createdAt: { gte: d30 } },
      include: { case: { select: { category: true } }, milestones: { select: { status: true, releaseReviewStatus: true, amount: true } } },
    }),
    prisma.case.findMany({
      where: { createdAt: { gte: d30 } },
      select: { id: true, category: true, stateCode: true, status: true },
    }),
    prisma.bid.findMany({
      where: { createdAt: { gte: d30 }, status: { not: "WITHDRAWN" } },
      select: { id: true, status: true, case: { select: { category: true, stateCode: true } } },
    }),
    prisma.conversationReport.count({
      where: { conversation: { attorneyProfileId: auth.attorneyProfileId }, createdAt: { gte: d30 } },
    }),
    prisma.contentRuleEvent.count({
      where: {
        createdAt: { gte: d30 },
        OR: [{ conversation: { attorneyProfileId: auth.attorneyProfileId } }, { bid: { attorneyProfileId: auth.attorneyProfileId } }],
      },
    }),
    prisma.userBlacklist.count({
      where: {
        blockedUserId: attorney.userId,
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    prisma.disputeTicket.count({
      where: { attorneyProfileId: auth.attorneyProfileId, createdAt: { gte: d30 } },
    }),
    prisma.attorneyFollowUpReminder.count({
      where: { attorneyProfileId: auth.attorneyProfileId, status: "OPEN", dueAt: { lt: now } },
    }),
    prisma.attorneyClientReview.aggregate({
      where: {
        attorneyId: auth.attorneyProfileId,
        status: "PUBLISHED",
        createdAt: { gte: d30 },
      },
      _avg: { ratingOverall: true },
      _count: { _all: true },
    }),
  ]);

  const daily = snapshots.filter((s) => s.period === "DAILY").slice(-30);
  const weekly = snapshots.filter((s) => s.period === "WEEKLY").slice(-12);
  const latest = snapshots[snapshots.length - 1] ?? null;
  const previous30 = daily.length > 1 ? daily[Math.max(0, daily.length - 30)] ?? null : null;

  const firstAttorneyMessageDurationsMins = conversations30
    .map((c) => {
      const created = c.createdAt.getTime();
      const firstAttorneyMessage = c.messages.find((m) => m.senderRole === "ATTORNEY");
      if (!firstAttorneyMessage) return null;
      return Math.round((firstAttorneyMessage.createdAt.getTime() - created) / 60000);
    })
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const responseWithin24hCount = firstAttorneyMessageDurationsMins.filter((v) => v <= 24 * 60).length;
  const response24hRate =
    conversations30.length > 0 ? responseWithin24hCount / conversations30.length : 0;

  const avgFirstBidMinutes = latest?.avgFirstBidMinutes ?? null;
  const avgFirstMessageMinutes =
    latest?.avgFirstMessageMinutes ?? (firstAttorneyMessageDurationsMins.length
      ? Math.round(firstAttorneyMessageDurationsMins.reduce((a, b) => a + b, 0) / firstAttorneyMessageDurationsMins.length)
      : null);

  const selectedCount = acceptedBids30.length;
  const engagedCount = engagements30.filter((e) => ["ACTIVE", "PENDING_CLIENT", "PENDING_ATTORNEY", "CONFIRMED"].includes(e.status)).length;
  const paidCreatedCount = payments30.length;

  const matchingExposureEstimate = allCases30.filter((c) => {
    const stateMatch = serviceStates.size === 0 || serviceStates.has(c.stateCode);
    const categoryMatch = specialtyCats.size === 0 || specialtyCats.has(c.category);
    return stateMatch || categoryMatch;
  }).length;
  const detailProxyCases = new Set<string>([
    ...bids30.map((b) => b.caseId),
    ...conversations30.map((c) => c.caseId).filter((id): id is string => Boolean(id)),
  ]).size;

  const selectedBidIds = new Set(acceptedBids30.map((b) => b.id));
  const engagedBidIds = new Set(engagements30.map((e) => e.bidId));
  const quoteConversionRate = bids30.length ? selectedCount / bids30.length : 0;
  const engagementConversionRate = selectedCount ? engagedCount / selectedCount : 0;
  const paymentConversionRate = engagedCount ? paidCreatedCount / engagedCount : 0;

  const heldAmount = payments30.reduce((sum, p) => sum + num(p.amountHeld), 0);
  const releasedAmount = payments30.reduce((sum, p) => sum + num(p.amountReleased), 0);
  const refundedAmount = payments30.reduce((sum, p) => sum + num(p.amountRefunded), 0);
  const pendingReleaseAmount = payments30.reduce(
    (sum, p) =>
      sum +
      p.milestones
        .filter((m) => m.releaseReviewStatus === "PENDING_REVIEW" || m.status === "READY_FOR_RELEASE")
        .reduce((s, m) => s + num(m.amount), 0),
    0,
  );
  const incomeByCategory = new Map<string, number>();
  for (const p of payments30) {
    const key = p.case?.category ?? "UNCATEGORIZED";
    incomeByCategory.set(key, (incomeByCategory.get(key) ?? 0) + num(p.amountReleased));
  }
  const incomeByCategoryRows = Array.from(incomeByCategory.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const demandByCategory = new Map<string, { cases: number; effectiveBids: number }>();
  for (const c of allCases30) {
    const rec = demandByCategory.get(c.category) ?? { cases: 0, effectiveBids: 0 };
    rec.cases += 1;
    demandByCategory.set(c.category, rec);
  }
  for (const b of allBids30) {
    const key = b.case.category;
    const rec = demandByCategory.get(key) ?? { cases: 0, effectiveBids: 0 };
    rec.effectiveBids += 1;
    demandByCategory.set(key, rec);
  }
  const demandByState = new Map<string, { cases: number; effectiveBids: number }>();
  for (const c of allCases30) {
    const rec = demandByState.get(c.stateCode) ?? { cases: 0, effectiveBids: 0 };
    rec.cases += 1;
    demandByState.set(c.stateCode, rec);
  }
  for (const b of allBids30) {
    const key = b.case.stateCode;
    const rec = demandByState.get(key) ?? { cases: 0, effectiveBids: 0 };
    rec.effectiveBids += 1;
    demandByState.set(key, rec);
  }
  const categoryRows = Array.from(demandByCategory.entries()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.cases - a.cases).slice(0, 8);
  const stateRows = Array.from(demandByState.entries()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.cases - a.cases).slice(0, 8);

  const credentialsComponents = {
    identity: attorney.isVerified ? 8 : 0,
    bar: attorney.barNumberVerified ? 8 : 0,
    barState: attorney.barState ? 3 : 0,
    practiceStates: attorney.serviceAreas.length > 0 ? 3 : 0,
    profileCompleteness: Math.round((Math.min(100, attorney.profileCompletenessScore) / 100) * 3),
  };
  const credentialsScore = clamp(
    credentialsComponents.identity +
      credentialsComponents.bar +
      credentialsComponents.barState +
      credentialsComponents.practiceStates +
      credentialsComponents.profileCompleteness,
    0,
    25,
  );

  const responseComponents = {
    firstBid:
      avgFirstBidMinutes != null ? (avgFirstBidMinutes <= 60 ? 8 : avgFirstBidMinutes <= 240 ? 5 : 2) : 2,
    firstMessage:
      avgFirstMessageMinutes != null ? (avgFirstMessageMinutes <= 60 ? 7 : avgFirstMessageMinutes <= 240 ? 4 : 1) : 1,
    todoTimeliness: overdueFollowups === 0 ? 5 : overdueFollowups <= 3 ? 3 : 1,
  };
  const responseScore = clamp(responseComponents.firstBid + responseComponents.firstMessage + responseComponents.todoTimeliness, 0, 20);

  const conversionComponents = {
    quoteSelected: Math.round(quoteConversionRate * 10),
    selectedToEngagement: Math.round(engagementConversionRate * 10),
  };
  const conversionScore = clamp(conversionComponents.quoteSelected + conversionComponents.selectedToEngagement, 0, 20);

  const customerRatingAvg = clientReviewAgg._avg.ratingOverall ?? null;
  const customerRatingCount = clientReviewAgg._count._all ?? 0;
  const customerRatingComponent =
    customerRatingAvg != null && customerRatingCount > 0
      ? clamp(Math.round((customerRatingAvg / 5) * 6), 0, 6)
      : 6;
  const serviceComponents = {
    customerRating: customerRatingComponent,
    completion: Math.round((latest?.completionRate ?? 0) * 10),
    disputePenaltyReversal: Math.max(0, 4 - Math.round((latest?.disputeRate ?? 0) * 20)),
  };
  const serviceScore = clamp(serviceComponents.customerRating + serviceComponents.completion + serviceComponents.disputePenaltyReversal, 0, 20);

  const complianceComponents = {
    base: 15,
    reportPenalty: Math.min(6, reports30),
    ruleHitPenalty: Math.min(4, Math.round(ruleHits30 / 5)),
    blacklistPenalty: Math.min(3, activeBlacklists),
    sanctionPenalty: Math.min(2, openDisputes30 > 0 ? 1 : 0),
  };
  const complianceScore = clamp(
    complianceComponents.base -
      complianceComponents.reportPenalty -
      complianceComponents.ruleHitPenalty -
      complianceComponents.blacklistPenalty -
      complianceComponents.sanctionPenalty,
    0,
    15,
  );
  const trustTotal = credentialsScore + responseScore + conversionScore + serviceScore + complianceScore;
  const trustGrade = grade(trustTotal);
  const attorneyTier = computeAttorneyTier({
    trustScore: trustTotal,
    barVerified: attorney.barNumberVerified,
    identityVerified: attorney.isVerified,
    reviewCount: customerRatingCount,
    reviewAvg: customerRatingAvg,
    qualityScore: latest?.qualityScore ?? null,
    complianceRiskScore: latest?.complianceRiskScore ?? null,
  });

  const trustTrendSeries = daily.map((s) => {
    const resp = Math.max(0, Math.min(20, (s.avgFirstBidMinutes && s.avgFirstBidMinutes <= 60 ? 8 : 4) + (s.avgFirstMessageMinutes && s.avgFirstMessageMinutes <= 60 ? 7 : 3) + 5));
    const conv = Math.max(0, Math.min(20, Math.round((s.bidConversionRate ?? 0) * 10) + Math.round(((s.metadata as { engagementConversionRate?: number } | null)?.engagementConversionRate ?? 0) * 10)));
    const serv = Math.max(
      0,
      Math.min(20, Math.round((s.completionRate ?? 0) * 10) + customerRatingComponent + Math.max(0, 4 - Math.round((s.disputeRate ?? 0) * 20))),
    );
    const comp = Math.max(0, Math.min(15, 15 - Math.min(6, s.reportsCount) - Math.min(4, Math.round((s.ruleHitCount ?? 0) / 5)) - Math.min(3, s.activeBlacklistCount)));
    return credentialsScore + resp + conv + serv + comp;
  });
  const trustTrendDelta = trustTrendSeries.length >= 2 ? trustTrendSeries[trustTrendSeries.length - 1] - trustTrendSeries[0] : 0;
  const trustTrendRecentAvg =
    trustTrendSeries.length > 0
      ? Math.round(trustTrendSeries.slice(-7).reduce((a, b) => a + b, 0) / Math.max(trustTrendSeries.slice(-7).length, 1))
      : trustTotal;
  const trustTrendBaseAvg =
    trustTrendSeries.length > 7
      ? Math.round(trustTrendSeries.slice(0, Math.max(1, trustTrendSeries.length - 7)).reduce((a, b) => a + b, 0) / Math.max(trustTrendSeries.length - 7, 1))
      : trustTotal;

  const trustSuggestions: string[] = [];
  if (!attorney.isVerified) trustSuggestions.push("完成律师实名认证，提高资质分与客户信任度。");
  if (!attorney.barNumberVerified) trustSuggestions.push("完成 Bar License 验证，提升平台信任展示与推荐权重。");
  if (attorney.profileCompletenessScore < 80) trustSuggestions.push("补充头像、事务所、简介、服务州和擅长领域，提升资料完整度。");
  if ((avgFirstBidMinutes ?? 9999) > 240) trustSuggestions.push("首报时长偏慢，建议开启案件大厅推荐提醒并优先处理高价值案件。");
  if ((avgFirstMessageMinutes ?? 9999) > 240) trustSuggestions.push("首条消息响应偏慢，建议先处理“待你回复”会话任务。");
  if (quoteConversionRate < 0.15) trustSuggestions.push("报价转化率偏低，建议使用报价模板并强化服务范围说明，避免仅价格竞争。");
  if (engagementConversionRate < 0.5 && selectedCount > 0) trustSuggestions.push("被选中后委托确认率偏低，建议在沟通中提前解释服务边界与委托流程。");
  if (reports30 > 0 || ruleHits30 > 0) trustSuggestions.push("近期存在投诉/规则命中，建议复盘沟通用语与资料要求模板。");

  const trustSuggestionItems = trustSuggestions.map((text) => ({
    text,
    priority:
      /实名认证|Bar License|Bar 验证/.test(text) ? "high" : /首报时长|首条消息|待你回复/.test(text) ? "high" : /转化率|委托确认率/.test(text) ? "medium" : "medium",
  }));

  const trustDimensions = [
    {
      label: "资质分（25）",
      score: credentialsScore,
      max: 25,
      detail: `实名 ${attorney.isVerified ? "已验证" : "未验证"} / Bar ${attorney.barNumberVerified ? "已验证" : "未验证"} / 完整度 ${attorney.profileCompletenessScore}`,
      bullets: [
        `实名认证：${credentialsComponents.identity}/8`,
        `Bar 验证：${credentialsComponents.bar}/8`,
        `执业州信息完整：${credentialsComponents.barState + credentialsComponents.practiceStates}/6`,
        `资料完整度：${credentialsComponents.profileCompleteness}/3`,
      ],
    },
    {
      label: "响应分（20）",
      score: responseScore,
      max: 20,
      detail: `首报 ${mins(avgFirstBidMinutes)} / 首消息 ${mins(avgFirstMessageMinutes)} / 逾期提醒 ${overdueFollowups}`,
      bullets: [
        `首报时长：${responseComponents.firstBid}/8`,
        `首消息时长：${responseComponents.firstMessage}/7`,
        `待办处理及时性：${responseComponents.todoTimeliness}/5`,
      ],
    },
    {
      label: "转化分（20）",
      score: conversionScore,
      max: 20,
      detail: `报价转化率 ${pct(quoteConversionRate)} / 委托确认率 ${pct(engagementConversionRate)}`,
      bullets: [
        `报价被选中率：${conversionComponents.quoteSelected}/10`,
        `被选中后委托确认率：${conversionComponents.selectedToEngagement}/10`,
      ],
    },
    {
      label: "服务分（20）",
      score: serviceScore,
      max: 20,
      detail:
        customerRatingCount > 0
          ? `客户评分 ${customerRatingAvg?.toFixed(1) ?? "-"}（${customerRatingCount} 条） / 完成率 ${pct(latest?.completionRate)} / 争议率 ${pct(latest?.disputeRate)}`
          : `完成率 ${pct(latest?.completionRate)} / 争议率 ${pct(latest?.disputeRate)} / 客户评分暂用中性基线`,
      bullets: [
        customerRatingCount > 0
          ? `客户评分：${serviceComponents.customerRating}/6（均分 ${customerRatingAvg?.toFixed(1)} / 5，${customerRatingCount} 条评价）`
          : `客户评分：${serviceComponents.customerRating}/6（评价系统上线前中性基线）`,
        `完成率：${serviceComponents.completion}/10`,
        `争议率反向扣分后得分：${serviceComponents.disputePenaltyReversal}/4`,
      ],
    },
    {
      label: "合规分（15）",
      score: complianceScore,
      max: 15,
      detail: `举报 ${reports30} / 风控命中 ${ruleHits30} / 活跃黑名单 ${activeBlacklists}`,
      bullets: [
        `基准分：${complianceComponents.base}/15`,
        `举报率扣分：-${complianceComponents.reportPenalty}`,
        `风控命中率扣分：-${complianceComponents.ruleHitPenalty}`,
        `黑名单/处罚记录扣分：-${complianceComponents.blacklistPenalty + complianceComponents.sanctionPenalty}`,
      ],
    },
  ] as const;

  const avgComplaintRateTrend = daily.map((s) => Math.round((s.complaintRate ?? 0) * 100));
  const avgDisputeRateTrend = daily.map((s) => Math.round((s.disputeRate ?? 0) * 100));
  const avgResponseTrend = daily.map((s) => s.avgFirstMessageMinutes ?? 0);

  const funnelMax = Math.max(matchingExposureEstimate, 1);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <AttorneyTabs />
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Attorney Analytics</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">数据分析（收入 / 转化 / 响应率）</h1>
              <p className="mt-2 text-sm text-slate-500">
                聚合律师经营数据、转化漏斗、响应效率与信用评分，帮助提升留存与接单转化率。
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/attorney/revenue" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">收入与业绩</Link>
              <Link href="/attorney/tasks" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">任务中心</Link>
            </div>
          </div>

          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Lawyer Trust Score</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{trustTotal}<span className="ml-1 text-lg text-slate-500">/100</span></p>
              <p className="mt-1 text-xs text-slate-500">等级 {trustGrade} · 律师层级 {attorneyTier.label} · 近30天 {trustTrendDelta >= 0 ? "+" : ""}{trustTrendDelta} 分</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">报价转化率（30天）</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{pct(quoteConversionRate)}</p>
              <p className="mt-1 text-xs text-slate-500">{acceptedBids30.length} / {bids30.length} 报价被选中</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">24h 内响应率</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{pct(response24hRate)}</p>
              <p className="mt-1 text-xs text-slate-500">会话创建后 24h 内首条律师消息</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">平均首条消息时长</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{mins(avgFirstMessageMinutes)}</p>
              <p className="mt-1 text-xs text-slate-500">平均首报 {mins(avgFirstBidMinutes)}</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <div className="space-y-6">
              <Section
                title="1. 漏斗图（30天）"
                subtitle="推荐案件曝光为当前匹配案件估算（MVP），建议后续增加详情页浏览埋点。"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <FunnelBar label="推荐案件曝光（估算）" value={matchingExposureEstimate} max={funnelMax} note="按执业州/擅长领域匹配的30天案件量" />
                  <FunnelBar label="查看详情（代理）" value={detailProxyCases} max={funnelMax} note="以互动代理值（报价或创建会话）近似" />
                  <FunnelBar label="提交报价" value={bids30.length} max={funnelMax} />
                  <FunnelBar label="被选中" value={selectedCount} max={funnelMax} />
                  <FunnelBar label="委托确认" value={engagedCount} max={funnelMax} />
                  <FunnelBar label="支付创建" value={paidCreatedCount} max={funnelMax} />
                </div>
              </Section>

              <Section title="2. 响应效率" subtitle="建议重点关注 24h 响应率与首消息时长，直接影响客户信任与转化。">
                <div className="grid gap-3 md:grid-cols-3">
                  <Metric label="平均首报时长" value={mins(avgFirstBidMinutes)} />
                  <Metric label="平均首条消息时长" value={mins(avgFirstMessageMinutes)} />
                  <Metric label="24h内响应率" value={pct(response24hRate)} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <TrendCard title="首消息时长趋势（分钟）" chart={sparkline(avgResponseTrend, "#0f766e")} />
                  <TrendCard title="投诉率趋势（%）" chart={sparkline(avgComplaintRateTrend, "#dc2626")} />
                </div>
              </Section>

              <Section title="3. 转化表现" subtitle="聚焦报价 -> 被选中 -> 委托确认 -> 支付创建的关键转化。">
                <div className="grid gap-3 md:grid-cols-3">
                  <Metric label="报价转化率" value={pct(quoteConversionRate)} />
                  <Metric label="委托确认率" value={pct(engagementConversionRate)} />
                  <Metric label="支付转化率" value={pct(paymentConversionRate)} />
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <Row label="报价数（30天）" value={String(bids30.length)} />
                  <Row label="被选中报价数" value={String(selectedCount)} />
                  <Row label="委托确认数" value={String(engagedCount)} />
                  <Row label="支付单创建数" value={String(paidCreatedCount)} />
                </div>
              </Section>

              <Section title="4. 收入概览" subtitle="托管与回款状态 + 按案件类型收入分布（按已释放金额）。">
                <div className="grid gap-3 md:grid-cols-4">
                  <Metric label="已托管（Held）" value={usd(heldAmount)} />
                  <Metric label="待释放里程碑" value={usd(pendingReleaseAmount)} />
                  <Metric label="已释放" value={usd(releasedAmount)} />
                  <Metric label="退款中/已退款" value={usd(refundedAmount)} />
                </div>
                <div className="mt-4 space-y-2">
                  {incomeByCategoryRows.map((row) => (
                    <div key={row.category} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <span className="text-slate-700">{row.category}</span>
                      <span className="font-semibold text-slate-900">{usd(row.amount)}</span>
                    </div>
                  ))}
                  {incomeByCategoryRows.length === 0 && <p className="text-sm text-slate-500">暂无已释放收入分布。</p>}
                </div>
              </Section>
            </div>

            <div className="space-y-6">
              <Section title="Lawyer Trust Score" subtitle="五维评分（100分） + 等级，用于专业感、推荐排序与客户信任展示。">
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">总分 / 等级</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{trustTotal} / 100</p>
                  <p className="mt-1 text-sm text-slate-600">等级：{trustGrade}</p>
                  <div className="mt-3">{sparkline(trustTrendSeries, "#111827")}</div>
                  <p className="mt-1 text-xs text-slate-500">
                    最近30天趋势（基于快照与资质分重算）· 最近7天均值 {trustTrendRecentAvg} / 前序均值 {trustTrendBaseAvg}
                  </p>
                </div>
                <div className="space-y-2">
                  {trustDimensions.map((d) => (
                    <ScoreRow key={d.label} label={d.label} score={d.score} max={d.max} detail={d.detail} bullets={d.bullets} />
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-800">改进建议（自动生成）</p>
                  <ul className="mt-2 space-y-2 text-xs text-amber-900">
                    {(trustSuggestionItems.length
                      ? trustSuggestionItems
                      : [{ text: "当前表现稳定，建议保持响应速度并持续优化报价转化。", priority: "low" as const }]).map((s) => (
                      <li key={s.text} className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] ${
                            s.priority === "high"
                              ? "bg-rose-100 text-rose-700"
                              : s.priority === "medium"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {s.priority === "high" ? "高优先级" : s.priority === "medium" ? "中优先级" : "保持"}
                        </span>
                        <span>{s.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">评分口径说明（MVP）</p>
                  <ul className="mt-2 list-disc pl-4 text-[11px] text-slate-600 space-y-1">
                    <li>评分周期以最近 30 天行为数据为主，资质分使用当前律师档案状态。</li>
                    <li>客户评价系统尚未完全上线时，服务分中的“客户评分”采用中性基线，避免误伤律师。</li>
                    <li>后续接入真实评价/处罚分级后，建议将服务分与合规分口径沉淀到平台统一文档。</li>
                  </ul>
                </div>
              </Section>

              <Section title="供需视图（30天）" subtitle="用于判断你所在领域是否供需失衡，优化接单策略。">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-600">类目供需（案件数 vs 有效报价数）</p>
                    <div className="space-y-2">
                      {categoryRows.map((r) => (
                        <div key={r.key} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700">{r.key}</span>
                            <span className="font-semibold text-slate-900">{r.cases} / {r.effectiveBids}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">案件 {r.cases} · 有效报价 {r.effectiveBids}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-600">州别供需（案件数 vs 有效报价数）</p>
                    <div className="space-y-2">
                      {stateRows.map((r) => (
                        <div key={r.key} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700">{r.key}</span>
                            <span className="font-semibold text-slate-900">{r.cases} / {r.effectiveBids}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">案件 {r.cases} · 有效报价 {r.effectiveBids}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="风险与质量趋势（30天）" subtitle="关注争议率、投诉率与规则命中趋势，避免影响律师信用与曝光。">
                <div className="grid gap-3">
                  <TrendCard title="争议率趋势（%）" chart={sparkline(avgDisputeRateTrend, "#d97706")} />
                  <TrendCard title="投诉率趋势（%）" chart={sparkline(avgComplaintRateTrend, "#dc2626")} />
                  <TrendCard title="响应时长趋势（首消息/分钟）" chart={sparkline(avgResponseTrend, "#0f766e")} />
                </div>
              </Section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function TrendCard({ title, chart }: { title: string; chart: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{title}</p>
      <div className="mt-2">{chart ?? <div className="h-14 rounded bg-slate-100" />}</div>
    </div>
  );
}

function ScoreRow({
  label,
  score,
  max,
  detail,
  bullets,
}: {
  label: string;
  score: number;
  max: number;
  detail: string;
  bullets?: readonly string[];
}) {
  const pctWidth = Math.max(0, Math.min(100, (score / max) * 100));
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{score}/{max}</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-slate-900" style={{ width: `${pctWidth}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-2 list-disc pl-4 text-[11px] text-slate-600 space-y-1">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
