export const dynamic = "force-dynamic";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { formatRelativeTime, summarizeCaseDescription } from "../../../lib/case-redaction";
import { RespondIntentForm } from "../../../components/respond-intent-form";
import { requireAuthContext } from "../../../lib/auth-context";
import { LEGAL_CATEGORIES, LANGUAGES, URGENCY_LEVELS } from "../../../types/case-form";
import { NavBar } from "../../../components/ui/nav-bar";
import { AttorneyTabs } from "../../../components/attorney/attorney-tabs";
import { AttorneyRecommendationFeed } from "../../../components/attorney/attorney-recommendation-feed";
import {
  ScalesIcon,
  ShieldCheckIcon,
  MapPinIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  InboxIcon,
  Squares2x2Icon,
  StarIcon,
  MapIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ChatBubbleIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ArrowRightIcon,
} from "../../../components/ui/icons";

type SearchParamsShape = {
  sort?: "latest" | "urgency";
  category?: string;
  state?: string;
  language?: string;
  urgency?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParamsShape>;
};

const URGENCY_STYLES: Record<string, { bar: string; badge: string; label: string; dot?: boolean }> = {
  LOW: { bar: "bg-slate-400", badge: "bg-slate-100 text-slate-700", label: "Low" },
  MEDIUM: { bar: "bg-blue-500", badge: "bg-blue-100 text-blue-700", label: "Medium" },
  HIGH: { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-700", label: "High" },
  URGENT: { bar: "bg-rose-500", badge: "bg-rose-100 text-rose-700", label: "URGENT", dot: true },
};

const CATEGORY_ICONS: Record<string, string> = {
  IMMIGRATION: "✈️",
  CIVIL: "⚖️",
  CRIMINAL: "🛡️",
  FAMILY: "🏠",
  LABOR: "💼",
  BUSINESS: "🏢",
  REAL_ESTATE: "🏘️",
  ESTATE_PLAN: "📜",
  TAX: "🧾",
  OTHER: "📋",
};

function buildServiceAreaFilter(areas: { stateCode: string; zipCode: string | null }[]): Prisma.CaseWhereInput[] {
  return areas.map((area) => ({
    stateCode: area.stateCode,
    ...(area.zipCode
      ? {
          OR: [{ zipCode: area.zipCode }, { zipCode: { startsWith: area.zipCode.slice(0, 3) } }],
        }
      : {}),
  }));
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value);
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatMinutesLabel(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "N/A";
  if (value < 60) return `${Math.round(value)}m`;
  const hours = Math.floor(value / 60);
  const mins = Math.round(value % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function isOverdue(date?: Date | null) {
  return !!date && date.getTime() < Date.now();
}

export default async function AttorneyDashboardPage({ searchParams }: PageProps) {
  const params: SearchParamsShape = searchParams ? await searchParams : {};

  const auth = await requireAuthContext().catch(() => null);
  if (!auth || !auth.attorneyProfileId || auth.role !== "ATTORNEY") {
    return (
      <>
        <NavBar />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center">
            <div className="h-14 w-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LockClosedIcon className="h-7 w-7 text-rose-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Attorney Access Required</h2>
            <p className="text-slate-500 text-sm mt-2 mb-6">
              Please sign in with an attorney account to access this dashboard.
              <span className="block text-slate-400 mt-1">请使用律师账户登录。</span>
            </p>
            <Link
              href="/auth/sign-in?role=attorney"
              className="inline-block bg-slate-900 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Sign In as Attorney / 律师登录
            </Link>
          </div>
        </div>
      </>
    );
  }

  const attorney = await prisma.attorneyProfile.findUnique({
    where: { id: auth.attorneyProfileId },
    include: {
      user: { select: { id: true, email: true } },
      specialties: true,
      serviceAreas: true,
      languages: true,
    },
  });

  if (!attorney) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center">
            <div className="h-14 w-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="h-7 w-7 text-rose-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Profile Not Found</h2>
            <p className="text-slate-500 text-sm mt-2">Attorney profile could not be loaded. Please contact support.</p>
          </div>
        </div>
      </>
    );
  }

  if (attorney.specialties.length === 0 || attorney.serviceAreas.length === 0) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white rounded-2xl border border-amber-200 shadow-sm p-8 text-center">
            <div className="h-14 w-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Complete Your Profile</h2>
            <p className="text-slate-500 text-sm mt-2 mb-6">
              Add your specialties and service areas to start seeing matched cases.
              <span className="block text-slate-400 mt-1">请完善专业领域和服务地区，以查看匹配案件。</span>
            </p>
            <Link
              href="/attorney/onboarding"
              className="inline-block bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Complete Profile / 完善资料
            </Link>
          </div>
        </div>
      </>
    );
  }

  const matchedCasesPromise = prisma.case.findMany({
    where: {
      status: { in: ["OPEN", "MATCHING"] },
      category: { in: attorney.specialties.map((item) => item.category) },
      OR: buildServiceAreaFilter(attorney.serviceAreas),
      ...(params.category ? { category: params.category as any } : {}),
      ...(params.state ? { stateCode: params.state.toUpperCase() } : {}),
      ...(params.language ? { preferredLanguage: params.language as any } : {}),
      ...(params.urgency ? { urgency: params.urgency as any } : {}),
    },
    include: {
      bids: {
        where: { attorneyProfileId: attorney.id },
        select: { id: true },
      },
      _count: {
        select: {
          contentRuleEvents: true,
          disputeTickets: true,
          bids: true,
        },
      },
    },
    orderBy: params.sort === "latest" ? [{ createdAt: "desc" }] : [{ urgency: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  const pendingBidsPromise = prisma.bid.findMany({
    where: { attorneyProfileId: attorney.id, status: "PENDING" },
    include: {
      case: {
        select: {
          id: true,
          title: true,
          category: true,
          urgency: true,
          stateCode: true,
          quoteDeadline: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 6,
  });

  const recentConversationsPromise = prisma.conversation.findMany({
    where: { attorneyProfileId: attorney.id },
    include: {
      case: { select: { id: true, title: true, category: true, urgency: true, stateCode: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, senderRole: true, body: true, createdAt: true },
      },
      tags: { select: { tag: true } },
      readStates: {
        where: { userId: auth.authUserId },
        select: { lastReadAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  const [ 
    matchedCases,
    pendingBids,
    recentConversations,
    remindersOpen,
    remindersOverdue,
    checklistOpen,
    unreadNotifications,
    weeklySnapshot,
    engagementPending,
    engagementActive,
    paymentAgg,
    paymentReviewCounts,
    reportPending,
    disputeOpen,
    highRiskTags,
    recentRuleHits,
    reminderRows,
    checklistRows,
    disputeRows,
    bids7Count,
    acceptedBids7Count,
    engagementsFromAccepted7Count,
    monthlyPayments,
    pendingMilestoneAgg,
    releasedThisMonthEvents,
    refundPendingOrders,
  ] = await Promise.all([
    matchedCasesPromise,
    pendingBidsPromise,
    recentConversationsPromise,
    prisma.attorneyFollowUpReminder.count({
      where: { attorneyProfileId: attorney.id, status: "OPEN" },
    }),
    prisma.attorneyFollowUpReminder.count({
      where: { attorneyProfileId: attorney.id, status: "OPEN", dueAt: { lt: new Date() } },
    }),
    prisma.conversationChecklistItem.count({
      where: { attorneyProfileId: attorney.id, completed: false },
    }),
    prisma.userNotification.count({
      where: { userId: auth.authUserId, status: "UNREAD" },
    }),
    prisma.attorneyScoreSnapshot.findFirst({
      where: { attorneyId: attorney.id },
      orderBy: [{ periodEnd: "desc" }],
    }),
    prisma.engagementConfirmation.count({
      where: { attorneyProfileId: attorney.id, status: { in: ["PENDING_ATTORNEY", "PENDING_CLIENT"] } },
    }),
    prisma.engagementConfirmation.count({
      where: { attorneyProfileId: attorney.id, status: "ACTIVE" },
    }),
    prisma.paymentOrder.aggregate({
      where: { attorneyProfileId: attorney.id },
      _sum: { amountHeld: true, amountReleased: true, amountRefunded: true },
      _count: { id: true },
    }),
    prisma.paymentOrder.groupBy({
      by: ["status"],
      where: { attorneyProfileId: attorney.id },
      _count: { _all: true },
    }),
    prisma.conversationReport.count({
      where: { conversation: { attorneyProfileId: attorney.id }, status: { in: ["PENDING", "REVIEWING"] } },
    }),
    prisma.disputeTicket.count({
      where: { attorneyProfileId: attorney.id, status: { in: ["OPEN", "UNDER_REVIEW", "WAITING_PARTY"] } },
    }),
    prisma.conversationTag.count({
      where: { attorneyProfileId: attorney.id, tag: "HIGH_RISK" },
    }),
    prisma.contentRuleEvent.count({
      where: {
        OR: [{ actorUserId: auth.authUserId }, { conversation: { attorneyProfileId: attorney.id } }],
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.attorneyFollowUpReminder.findMany({
      where: { attorneyProfileId: attorney.id, status: "OPEN" },
      include: { conversation: { select: { id: true, case: { select: { id: true, title: true, category: true, urgency: true, budgetMax: true } } } } },
      orderBy: [{ dueAt: "asc" }],
      take: 12,
    }),
    prisma.conversationChecklistItem.findMany({
      where: { attorneyProfileId: attorney.id, completed: false },
      include: { conversation: { select: { id: true, case: { select: { id: true, title: true, category: true, urgency: true, budgetMax: true } } } } },
      orderBy: [{ required: "desc" }, { updatedAt: "desc" }],
      take: 12,
    }),
    prisma.disputeTicket.findMany({
      where: { attorneyProfileId: attorney.id, status: { in: ["OPEN", "UNDER_REVIEW", "WAITING_PARTY"] } },
      include: { case: { select: { id: true, title: true, category: true, urgency: true, budgetMax: true } }, conversation: { select: { id: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
    prisma.bid.count({
      where: { attorneyProfileId: attorney.id, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.bid.count({
      where: { attorneyProfileId: attorney.id, status: "ACCEPTED", createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.engagementConfirmation.count({
      where: {
        attorneyProfileId: attorney.id,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        status: { in: ["PENDING_CLIENT", "PENDING_ATTORNEY", "ACTIVE"] },
      },
    }),
    prisma.paymentOrder.aggregate({
      where: {
        attorneyProfileId: attorney.id,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        status: { in: ["PAID_HELD", "PARTIALLY_RELEASED", "RELEASED", "REFUND_PENDING", "REFUNDED"] },
      },
      _sum: { amountHeld: true },
    }),
    prisma.paymentMilestone.aggregate({
      where: {
        paymentOrder: { attorneyProfileId: attorney.id },
        OR: [{ releaseReviewStatus: "PENDING_REVIEW" }, { status: "READY_FOR_RELEASE" }],
      },
      _sum: { amount: true },
    }),
    prisma.paymentEvent.aggregate({
      where: {
        paymentOrder: { attorneyProfileId: attorney.id },
        type: "MILESTONE_RELEASED",
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { amount: true },
    }),
    prisma.paymentOrder.aggregate({
      where: { attorneyProfileId: attorney.id, status: "REFUND_PENDING" },
      _sum: { amountHeld: true },
    }),
  ]);

  const unreadCounts = await Promise.all(
    recentConversations.map(async (conversation) => {
      const lastReadAt = conversation.readStates[0]?.lastReadAt ?? null;
      const count = await prisma.chatMessage.count({
        where: {
          conversationId: conversation.id,
          senderRole: "CLIENT",
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      });
      return [conversation.id, count] as const;
    }),
  );

  const unreadMap = new Map(unreadCounts);
  const respondedCount = matchedCases.filter((c) => c.bids.length > 0).length;
  const uniqueStates = [...new Set(attorney.serviceAreas.map((a) => a.stateCode))];
  const initials =
    ((attorney.firstName?.[0] ?? "") + (attorney.lastName?.[0] ?? "")).toUpperCase() ||
    (attorney.user.email?.[0] ?? "A").toUpperCase();
  const profileCompleteness = attorney.profileCompletenessScore ?? 0;
  const totalUnreadConversations = recentConversations.filter((c) => (unreadMap.get(c.id) ?? 0) > 0).length;
  const replyNeededConversations = recentConversations.filter((c) => {
    const latest = c.messages[0];
    return latest?.senderRole === "CLIENT" && (unreadMap.get(c.id) ?? 0) > 0;
  }).length;
  const inProgressCases = recentConversations.filter((c) => c.status === "OPEN");
  const reviewPendingPayments = paymentReviewCounts
    .filter((row) => row.status === "REFUND_PENDING")
    .reduce((sum, row) => sum + row._count._all, 0);
  const noFollowUp24hCount = recentConversations.filter(
    (c) => c.status === "OPEN" && c.updatedAt.getTime() < Date.now() - 24 * 60 * 60 * 1000,
  ).length;

  const highValueCase = (c?: { urgency?: string; budgetMax?: Prisma.Decimal | number | null }) => {
    const b = decimalToNumber(c?.budgetMax as any);
    return (c?.urgency === "HIGH" || c?.urgency === "URGENT") || b >= 5000;
  };

  const todoPriorityRows = [
    ...pendingBids.slice(0, 6).map((b) => ({
      id: `bid-${b.id}`,
      kind: "待报价",
      title: b.case.title || `${b.case.category} case`,
      href: "/marketplace/my-bids?group=todo&sort=todo_first",
      overdue: !!b.case.quoteDeadline && b.case.quoteDeadline.getTime() < Date.now(),
      highValue: highValueCase({ urgency: b.case.urgency, budgetMax: null }),
      highIntent: false,
      newMessage: false,
      dueAt: b.case.quoteDeadline ?? null,
    })),
    ...recentConversations
      .filter((c) => {
        const latest = c.messages[0];
        return latest?.senderRole === "CLIENT" && (unreadMap.get(c.id) ?? 0) > 0;
      })
      .slice(0, 8)
      .map((c) => ({
        id: `reply-${c.id}`,
        kind: "待回复",
        title: c.case.title || `${c.case.category} case`,
        href: "/attorney/conversations",
        overdue: c.updatedAt.getTime() < Date.now() - 24 * 60 * 60 * 1000,
        highValue: highValueCase({ urgency: c.case.urgency as any, budgetMax: null }),
        highIntent: c.tags.some((t) => t.tag === "HIGH_INTENT"),
        newMessage: true,
        dueAt: c.updatedAt,
      })),
    ...checklistRows.slice(0, 6).map((c) => ({
      id: `check-${c.id}`,
      kind: c.required ? "待补件(必需)" : "待补件",
      title: c.conversation.case.title || `${c.conversation.case.category} case`,
      href: "/attorney/workflow",
      overdue: false,
      highValue: highValueCase(c.conversation.case as any),
      highIntent: false,
      newMessage: false,
      dueAt: null as Date | null,
    })),
    ...reminderRows.slice(0, 6).map((r) => ({
      id: `rem-${r.id}`,
      kind: "待跟进",
      title: r.title,
      href: "/attorney/workflow",
      overdue: r.dueAt.getTime() < Date.now(),
      highValue: highValueCase(r.conversation.case as any),
      highIntent: false,
      newMessage: false,
      dueAt: r.dueAt,
    })),
    ...disputeRows.slice(0, 6).map((d) => ({
      id: `dis-${d.id}`,
      kind: "待处理争议",
      title: d.title,
      href: "/marketplace/disputes",
      overdue: !!d.slaDueAt && d.slaDueAt.getTime() < Date.now(),
      highValue: highValueCase((d.case ?? undefined) as any),
      highIntent: false,
      newMessage: false,
      dueAt: d.slaDueAt ?? null,
    })),
  ]
    .sort((a, b) => {
      const rank = (x: typeof a) =>
        (x.overdue ? 1000 : 0) + (x.highValue ? 100 : 0) + (x.highIntent ? 10 : 0) + (x.newMessage ? 1 : 0);
      const ra = rank(a);
      const rb = rank(b);
      if (rb !== ra) return rb - ra;
      const at = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bt = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return at - bt;
    })
    .slice(0, 8);

  const riskItems = [
    { label: "高风险会话标签", value: highRiskTags, tone: "amber" },
    { label: "待处理举报", value: reportPending, tone: "rose" },
    { label: "进行中争议", value: disputeOpen, tone: "orange" },
    { label: "近7天规则命中", value: recentRuleHits, tone: "slate" },
  ];

  const revenueHeld = decimalToNumber(paymentAgg._sum.amountHeld);
  const revenueReleased = decimalToNumber(paymentAgg._sum.amountReleased);
  const revenueRefunded = decimalToNumber(paymentAgg._sum.amountRefunded);
  const monthHeld = decimalToNumber(monthlyPayments._sum.amountHeld);
  const pendingMilestoneAmount = decimalToNumber(pendingMilestoneAgg._sum.amount);
  const releasedThisMonth = decimalToNumber(releasedThisMonthEvents._sum.amount);
  const refundPendingAmount = decimalToNumber(refundPendingOrders._sum.amountHeld);
  const caseWinRate7 = bids7Count > 0 ? acceptedBids7Count / bids7Count : 0;
  const engagementConfirmRate7 = acceptedBids7Count > 0 ? engagementsFromAccepted7Count / acceptedBids7Count : 0;

  const recommendationItems = matchedCases.map((item) => {
    const recommendationReasons: string[] = [];
    if (item.bids.length === 0) recommendationReasons.push("未报价");
    if (attorney.specialties.some((s) => s.category === item.category)) recommendationReasons.push("类目匹配");
    if (attorney.serviceAreas.some((a) => a.stateCode === item.stateCode)) recommendationReasons.push("州匹配");
    if (item.quoteDeadline && item.quoteDeadline.getTime() <= Date.now() + 24 * 60 * 60 * 1000 && item.quoteDeadline.getTime() > Date.now()) {
      recommendationReasons.push("24h内截止");
    }
    if (decimalToNumber(item.budgetMax) >= 5000) recommendationReasons.push("高预算");
    if (item.urgency === "HIGH" || item.urgency === "URGENT") recommendationReasons.push("高紧急度");

    const riskHints: string[] = [];
    if ((item._count?.contentRuleEvents ?? 0) > 0) riskHints.push("敏感词命中");
    if ((item._count?.disputeTickets ?? 0) > 0) riskHints.push("高争议风险");
    if (!item.descriptionMasked || item.descriptionMasked.trim().length < 20) riskHints.push("资料不足");

    return {
      id: item.id,
      title: item.title,
      category: String(item.category),
      urgency: String(item.urgency),
      preferredLanguage: String(item.preferredLanguage),
      stateCode: item.stateCode,
      zipCode: item.zipCode,
      summary: summarizeCaseDescription(item.description),
      createdAtLabel: formatRelativeTime(item.createdAt),
      quoteDeadlineLabel: item.quoteDeadline ? formatRelativeTime(item.quoteDeadline) : null,
      quoteDeadlinePassed: !!item.quoteDeadline && item.quoteDeadline.getTime() < Date.now(),
      alreadyResponded: item.bids.length > 0,
      existingBidId: item.bids[0]?.id,
      recommendationReasons,
      riskHints,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavBar />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <AttorneyTabs />

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold">
                {initials}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {attorney.firstName && attorney.lastName ? `${attorney.firstName} ${attorney.lastName}` : "Attorney Dashboard"}
                </h1>
                <p className="text-sm text-slate-500">
                  Lawyer Command Center · 律师工作台总览
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
                      attorney.barNumberVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    <ShieldCheckIcon className="h-3.5 w-3.5" />
                    {attorney.barNumberVerified ? "Bar Verified" : "Bar Verification Pending"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                    <MapIcon className="h-3.5 w-3.5" />
                    {uniqueStates.join(", ")}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                    <StarIcon className="h-3.5 w-3.5" />
                    Profile Completeness {profileCompleteness}%
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
              <Link href="/marketplace/case-hall?sort=recommended" className="rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50">
                案件大厅
              </Link>
              <Link href="/marketplace/my-bids" className="rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50">
                我的报价
              </Link>
              <Link href="/attorney/onboarding" className="rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50">
                档案与信任
              </Link>
              <Link href="/marketplace/notifications" className="rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50">
                通知中心 {unreadNotifications > 0 ? `(${unreadNotifications})` : ""}
              </Link>
            </div>
          </div>
        </section>

        {/* Dashboard modules */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                  今日待办
                </h2>
                <Link href="/attorney/tasks" className="text-xs text-slate-500 hover:text-slate-900">
                  查看全部 <ArrowRightIcon className="inline h-3 w-3" />
                </Link>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[
                  { label: "待报价", value: pendingBids.length, href: "/marketplace/my-bids?group=todo&sort=todo_first" },
                  { label: "待回复", value: replyNeededConversations, href: "/attorney/conversations" },
                  { label: "待补件", value: checklistOpen, href: "/attorney/workflow" },
                  { label: "待跟进", value: remindersOpen, href: "/attorney/workflow" },
                  { label: "待处理争议", value: disputeOpen, href: "/marketplace/disputes" },
                ].map((item) => (
                  <Link key={item.label} href={item.href} className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{item.value}</p>
                  </Link>
                ))}
              </div>
              <div className="space-y-2">
                {todoPriorityRows.map((row) => (
                  <Link key={row.id} href={row.href} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{row.kind}</p>
                      <p className="truncate text-sm font-medium text-slate-900">{row.title}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 justify-end">
                      {row.overdue && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700">超时</span>}
                      {row.highValue && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">高价值</span>}
                      {row.highIntent && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">高意向</span>}
                      {row.newMessage && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">新消息</span>}
                    </div>
                  </Link>
                ))}
                {todoPriorityRows.length === 0 && <p className="text-sm text-slate-500">当前没有优先待办。</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" id="conversations">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ChatBubbleIcon className="h-4 w-4 text-blue-600" />
                  待回复会话
                </h2>
                <span className="text-xs text-slate-500">会话摘要</span>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-3">
                {[
                  ["待我回复会话数", replyNeededConversations],
                  ["新消息会话数", totalUnreadConversations],
                  ["24h未跟进会话数", noFollowUp24hCount],
                  ["高风险会话标签数", highRiskTags],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] text-slate-500">{label}</p>
                    <p className="text-base font-semibold text-slate-900">{value as number}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {recentConversations.length === 0 ? (
                  <p className="text-sm text-slate-500">暂无会话。客户选择你的报价后将自动创建会话。</p>
                ) : (
                  recentConversations.map((conversation) => {
                    const latest = conversation.messages[0];
                    const unread = unreadMap.get(conversation.id) ?? 0;
                    const needsReply = latest?.senderRole === "CLIENT" && unread > 0;
                    return (
                      <div key={conversation.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {conversation.case.title || `${conversation.case.category} case`}
                          </p>
                          {needsReply && (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                              待你回复
                            </span>
                          )}
                          {unread > 0 && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                              未读 {unread}
                            </span>
                          )}
                          {conversation.tags.some((t) => t.tag === "HIGH_RISK") && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              高风险
                            </span>
                          )}
                          <span className="ml-auto text-xs text-slate-400">{formatRelativeTime(conversation.updatedAt)}</span>
                        </div>
                        {latest && (
                          <p className="mt-1 line-clamp-1 text-xs text-slate-600">
                            {latest.senderRole === "CLIENT" ? "客户" : latest.senderRole === "ATTORNEY" ? "律师" : "系统"}: {latest.body}
                          </p>
                        )}
                        <div className="mt-2 flex gap-2">
                          <Link
                            href={`/chat/${conversation.id}`}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                          >
                            进入会话
                          </Link>
                          <Link
                            href={`/marketplace/conversations/${conversation.id}/workflow`}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            工作流侧栏
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" id="bids">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <DocumentTextIcon className="h-4 w-4 text-amber-600" />
                  待处理报价
                </h2>
                <Link href="/marketplace/my-bids" className="text-xs text-slate-500 hover:text-slate-900">
                  我的报价 <ArrowRightIcon className="inline h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {pendingBids.length === 0 ? (
                  <p className="text-sm text-slate-500">暂无待处理报价。去案件大厅查看推荐案件。</p>
                ) : (
                  pendingBids.map((bid) => (
                    <div key={bid.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {bid.case.title || `${bid.case.category} case`}
                        </p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                          {bid.case.category}
                        </span>
                        {bid.case.quoteDeadline && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              isOverdue(bid.case.quoteDeadline)
                                ? "bg-rose-50 text-rose-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {isOverdue(bid.case.quoteDeadline) ? "已过截止" : "报价进行中"}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-slate-400">{formatRelativeTime(bid.updatedAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {bid.case.stateCode} · 版本 v{bid.version} · 状态 {bid.status}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="xl:col-span-5 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <BriefcaseIcon className="h-4 w-4 text-indigo-600" />
                进行中案件
              </h2>
              <div className="space-y-3">
                {inProgressCases.length === 0 ? (
                  <p className="text-sm text-slate-500">当前无进行中案件会话。</p>
                ) : (
                  inProgressCases.slice(0, 5).map((conversation) => (
                    <Link
                      key={conversation.id}
                      href={`/chat/${conversation.id}`}
                      className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                          {conversation.case.category}
                        </span>
                        <span className="text-xs text-slate-400">{conversation.case.stateCode}</span>
                        <span className="ml-auto text-xs text-slate-400">{formatRelativeTime(conversation.updatedAt)}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900 line-clamp-1">
                        {conversation.case.title || `${conversation.case.category} case`}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <StarIcon className="h-4 w-4 text-emerald-600" />
                本周表现
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">7天报价数</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{bids7Count}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">报价转化率</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{Math.round((weeklySnapshot?.bidConversionRate ?? caseWinRate7) * 100)}%</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">平均首报时长</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{formatMinutesLabel(weeklySnapshot?.avgFirstBidMinutes)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">平均首条消息时长</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{formatMinutesLabel(weeklySnapshot?.avgFirstMessageMinutes)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">案件成交率（被选中率）</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{Math.round(caseWinRate7 * 100)}%</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">委托确认率（被选中→委托）</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{Math.round(engagementConfirmRate7 * 100)}%</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" id="workflow">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
                风险提醒
              </h2>
              <div className="space-y-2">
                {riskItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.tone === "rose"
                          ? "bg-rose-50 text-rose-700"
                          : item.tone === "amber"
                          ? "bg-amber-50 text-amber-700"
                          : item.tone === "orange"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/marketplace/admin/reports" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50">
                  举报中心
                </Link>
                <Link href="/marketplace/disputes" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50">
                  我的争议工单
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" id="revenue">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ScalesIcon className="h-4 w-4 text-emerald-600" />
                收入概览
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">本月已托管金额</p>
                  <p className="mt-1 text-lg font-bold text-emerald-900">{formatUsd(monthHeld)}</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-xs text-blue-700">待释放里程碑金额</p>
                  <p className="mt-1 text-lg font-bold text-blue-900">{formatUsd(pendingMilestoneAmount)}</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-3">
                  <p className="text-xs text-rose-700">退款中金额</p>
                  <p className="mt-1 text-lg font-bold text-rose-900">{formatUsd(refundPendingAmount)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">本月已释放金额</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{formatUsd(releasedThisMonth)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">累计托管 {formatUsd(revenueHeld)}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">累计已释放 {formatUsd(revenueReleased)}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">累计退款 {formatUsd(revenueRefunded)}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">待审核退款 {reviewPendingPayments}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">进行中委托 {engagementActive}</span>
                <Link href="/marketplace/payments" className="rounded-full border border-slate-200 px-2.5 py-1 hover:bg-slate-50">
                  查看支付与托管
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Existing matching feed preserved, reframed as "新案件推荐" */}
        <section className="mt-8" id="recommended-cases">
          <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Squares2x2Icon className="h-5 w-5 text-amber-600" />
                新案件推荐
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Matching cases in {uniqueStates.join(", ")} · {attorney.specialties.length} specialties
              </p>
            </div>
            <div className="text-sm text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
              {matchedCases.length} cases found · 已回应 {respondedCount}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { title: "Matched Cases", zh: "匹配案件", value: matchedCases.length, icon: Squares2x2Icon, accent: false },
              { title: "Responded", zh: "已回应", value: respondedCount, icon: CheckCircleIcon, accent: true },
              { title: "Specialties", zh: "专业领域", value: attorney.specialties.length, icon: StarIcon, accent: false },
              { title: "States", zh: "服务州份", value: uniqueStates.length, icon: MapIcon, accent: false },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className={`rounded-2xl border p-4 ${s.accent ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-3 ${s.accent ? "bg-amber-100" : "bg-slate-100"}`}>
                    <Icon className={`h-4 w-4 ${s.accent ? "text-amber-600" : "text-slate-600"}`} />
                  </div>
                  <p className={`text-2xl font-bold ${s.accent ? "text-amber-700" : "text-slate-900"}`}>{s.value}</p>
                  <p className="text-xs font-medium text-slate-600 mt-0.5">{s.title}</p>
                  <p className="text-[10px] text-slate-400">{s.zh}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <FunnelIcon className="h-4 w-4 text-slate-500" />
              Filter Cases / 筛选案件
            </h3>
            <form className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Sort / 排序</label>
                <select
                  name="sort"
                  defaultValue={params.sort ?? "urgency"}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="urgency">By Urgency / 按紧急程度</option>
                  <option value="latest">Latest First / 最新优先</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Category / 类别</label>
                <select
                  name="category"
                  defaultValue={params.category ?? ""}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Categories</option>
                  {LEGAL_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">State / 州份</label>
                <input
                  name="state"
                  defaultValue={params.state ?? ""}
                  placeholder="e.g. CA"
                  maxLength={2}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Language / 语言</label>
                <select
                  name="language"
                  defaultValue={params.language ?? ""}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Languages</option>
                  {LANGUAGES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Urgency / 紧急</label>
                <select
                  name="urgency"
                  defaultValue={params.urgency ?? ""}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Urgency</option>
                  {URGENCY_LEVELS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="col-span-2 sm:col-span-3 lg:col-span-5 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
                Apply Filters / 应用筛选
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {matchedCases.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <InboxIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-700 font-semibold">No Matching Cases / 暂无匹配案件</h3>
                <p className="text-slate-400 text-sm mt-1">
                  No cases match your current filters and service areas. Try adjusting your filters.
                  <span className="block text-xs mt-1">请调整筛选条件后重试。</span>
                </p>
              </div>
            )}

            {matchedCases.length > 0 && <AttorneyRecommendationFeed items={recommendationItems} />}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" id="settings">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <UserCircleIcon className="h-4 w-4 text-slate-600" />
            通知与偏好（Settings）
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            下一步建议完善：通知偏好（邮件/站内）、报价模板管理、推荐筛选偏好、免打扰时段。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/marketplace/notifications" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50">
              打开通知中心
            </Link>
            <Link href="/attorney/onboarding" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50">
              更新律师档案与信任信息
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
