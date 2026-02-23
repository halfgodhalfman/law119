import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import { requireAuthContext } from "../../../lib/auth-context";
import { NavBar } from "../../../components/ui/nav-bar";
import { AttorneyTabs } from "../../../components/attorney/attorney-tabs";
import { LockClosedIcon, CheckCircleIcon, ExclamationTriangleIcon, ChatBubbleIcon, DocumentTextIcon } from "../../../components/ui/icons";

type TaskRow = {
  id: string;
  taskType: "QUOTE" | "FOLLOW_UP" | "CHECKLIST" | "CONVERSATION_REPLY" | "ENGAGEMENT" | "PAYMENT" | "RISK";
  sourceType: "case" | "bid" | "conversation" | "payment" | "engagement";
  sourceId: string;
  priority: number;
  dueAt: Date | null;
  status: "OPEN" | "PENDING_REVIEW" | "IN_PROGRESS";
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  suggestedAction?: string;
  ownerAttorneyId: string;
  isHighValue?: boolean;
  isHighIntent?: boolean;
};

function fmtDate(d?: Date | null) {
  if (!d) return "无截止时间";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
}

function isOverdue(d?: Date | null) {
  return !!d && d.getTime() < Date.now();
}

export default async function AttorneyTasksPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; q?: string; overdueOnly?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const typeFilter = (sp.type ?? "all") as "all" | TaskRow["taskType"];
  const q = (sp.q ?? "").trim().toLowerCase();
  const overdueOnly = sp.overdueOnly === "1";
  const auth = await requireAuthContext().catch(() => null);
  if (!auth || auth.role !== "ATTORNEY" || !auth.attorneyProfileId) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <LockClosedIcon className="mx-auto h-8 w-8 text-rose-600" />
            <p className="mt-3 text-sm text-slate-700">请以律师身份登录后访问任务中心。</p>
          </div>
        </main>
      </>
    );
  }
  const ownerAttorneyId = auth.attorneyProfileId;

  const [conversations, reminders, checklist, bids, engagements, payments] = await Promise.all([
    prisma.conversation.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId, status: "OPEN" },
      include: {
        case: { select: { id: true, title: true, category: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { senderRole: true, createdAt: true, body: true } },
        readStates: { where: { userId: auth.authUserId }, select: { lastReadAt: true } },
        tags: { where: { attorneyProfileId: auth.attorneyProfileId }, select: { tag: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.attorneyFollowUpReminder.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId, status: "OPEN" },
      include: { conversation: { select: { id: true, case: { select: { title: true, category: true } } } } },
      orderBy: [{ dueAt: "asc" }],
      take: 30,
    }),
    prisma.conversationChecklistItem.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId, completed: false },
      include: { conversation: { select: { id: true, case: { select: { title: true, category: true } } } } },
      orderBy: [{ required: "desc" }, { updatedAt: "desc" }],
      take: 30,
    }),
    prisma.bid.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId, status: "PENDING" },
      include: {
        case: {
          select: { id: true, title: true, category: true, quoteDeadline: true, urgency: true, budgetMin: true, budgetMax: true },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 20,
    }),
    prisma.engagementConfirmation.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId, status: { in: ["PENDING_ATTORNEY", "PENDING_CLIENT"] } },
      include: { case: { select: { id: true, title: true, category: true, urgency: true, budgetMin: true, budgetMax: true } } },
      orderBy: [{ updatedAt: "desc" }],
      take: 20,
    }),
    prisma.paymentOrder.findMany({
      where: {
        attorneyProfileId: auth.attorneyProfileId,
        OR: [{ refundReviewStatus: "PENDING_REVIEW" }, { milestones: { some: { releaseReviewStatus: "PENDING_REVIEW" } } }],
      },
      include: {
        case: { select: { id: true, title: true, category: true, urgency: true, budgetMin: true, budgetMax: true } },
        milestones: { where: { releaseReviewStatus: "PENDING_REVIEW" }, select: { id: true, title: true, targetDate: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 20,
    }),
  ]);

  const replyTasks: TaskRow[] = [];
  for (const c of conversations) {
    const latest = c.messages[0];
    if (!latest || latest.senderRole !== "CLIENT") continue;
    const lastReadAt = c.readStates[0]?.lastReadAt ?? null;
    const unreadCount = await prisma.chatMessage.count({
      where: {
        conversationId: c.id,
        senderRole: "CLIENT",
        ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
      },
    });
    if (unreadCount <= 0) continue;
    const hasHighIntent = c.tags.some((t) => t.tag === "HIGH_INTENT");
    const hasHighRisk = c.tags.some((t) => t.tag === "HIGH_RISK" || t.tag === "DISPUTE_RISK");
    replyTasks.push({
      id: `reply-${c.id}`,
      taskType: "CONVERSATION_REPLY",
      sourceType: "conversation",
      sourceId: c.id,
      priority: hasHighRisk ? 115 : hasHighIntent ? 105 : 100,
      dueAt: new Date(latest.createdAt.getTime() + 24 * 60 * 60 * 1000),
      status: "OPEN",
      title: `回复客户消息 · ${c.case.title || c.case.category}`,
      subtitle: `客户新消息 ${unreadCount} 条`,
      href: `/chat/${c.id}`,
      badge: "待回复",
      suggestedAction: "优先回复客户，再决定是否发起补件或跟进提醒",
      ownerAttorneyId,
      isHighIntent: hasHighIntent,
      isHighValue: false,
    });
    if (hasHighRisk) {
      replyTasks.push({
        id: `risk-${c.id}`,
        taskType: "RISK",
        sourceType: "conversation",
        sourceId: c.id,
        priority: 125,
        dueAt: new Date(latest.createdAt.getTime() + 12 * 60 * 60 * 1000),
        status: "OPEN",
        title: `高风险会话复核 · ${c.case.title || c.case.category}`,
        subtitle: "检测到高风险/争议风险标签",
        href: `/chat/${c.id}`,
        badge: "风险",
        suggestedAction: "先复核沟通内容，必要时联系平台或升级风控",
        ownerAttorneyId,
      });
    }
  }

  const isHighValueCase = (input?: { urgency?: string | null; budgetMax?: unknown; budgetMin?: unknown }) => {
    const max = input?.budgetMax != null ? Number(input.budgetMax) : null;
    const min = input?.budgetMin != null ? Number(input.budgetMin) : null;
    return (
      (typeof max === "number" && !Number.isNaN(max) && max >= 3000) ||
      (typeof min === "number" && !Number.isNaN(min) && min >= 3000) ||
      input?.urgency === "HIGH" ||
      input?.urgency === "URGENT"
    );
  };

  const rows: TaskRow[] = [
    ...replyTasks,
    ...reminders.map<TaskRow>((r) => ({
      id: `rem-${r.id}`,
      taskType: "FOLLOW_UP" as const,
      sourceType: "conversation" as const,
      sourceId: r.conversation.id,
      priority: r.dueAt.getTime() < Date.now() ? 120 : 80,
      dueAt: r.dueAt,
      status: "OPEN" as const,
      title: r.title,
      subtitle: `${r.conversation.case.title || r.conversation.case.category} · 跟进提醒`,
      href: `/marketplace/conversations/${r.conversation.id}/workflow`,
      badge: "跟进",
      suggestedAction: "完成本次跟进后标记完成或重设提醒",
      ownerAttorneyId,
      isHighValue: false,
      isHighIntent: false,
    })),
    ...checklist.map<TaskRow>((c) => ({
      id: `chk-${c.id}`,
      taskType: "CHECKLIST" as const,
      sourceType: "conversation" as const,
      sourceId: c.conversation.id,
      priority: c.required ? 90 : 60,
      dueAt: null,
      status: "OPEN" as const,
      title: c.title,
      subtitle: `${c.conversation.case.title || c.conversation.case.category} · ${c.required ? "必需补件" : "补件"}`,
      href: `/marketplace/conversations/${c.conversation.id}/workflow`,
      badge: c.required ? "必需" : "补件",
      suggestedAction: "催促客户补齐材料并在工作流中勾选完成",
      ownerAttorneyId,
      isHighValue: false,
      isHighIntent: false,
    })),
    ...bids.map<TaskRow>((b) => ({
      id: `bid-${b.id}`,
      taskType: "QUOTE" as const,
      sourceType: "bid" as const,
      sourceId: b.id,
      priority: b.case.quoteDeadline && b.case.quoteDeadline.getTime() < Date.now() ? 30 : 70,
      dueAt: b.case.quoteDeadline ?? null,
      status: "OPEN" as const,
      title: `跟进报价 · ${b.case.title || b.case.category}`,
      subtitle: `报价版本 v${b.version} · PENDING`,
      href: `/marketplace/cases/${b.case.id}`,
      badge: "报价",
      suggestedAction: "检查报价是否需要根据新信息调整后再提交",
      ownerAttorneyId,
      isHighIntent: false,
      isHighValue: isHighValueCase(b.case),
    })),
    ...engagements.map<TaskRow>((e) => ({
      id: `eng-${e.id}`,
      taskType: "ENGAGEMENT" as const,
      sourceType: "engagement" as const,
      sourceId: e.id,
      priority: e.status === "PENDING_ATTORNEY" ? 110 : 85,
      dueAt: null,
      status: e.status === "PENDING_ATTORNEY" ? "OPEN" : "IN_PROGRESS",
      title: `委托确认待处理 · ${e.case?.title || e.case?.category || "案件"}`,
      subtitle: `状态 ${e.status}`,
      href: `/marketplace/engagements/${e.id}`,
      badge: "委托确认",
      suggestedAction: e.status === "PENDING_ATTORNEY" ? "完成冲突检查并确认服务边界" : "等待客户确认，可先沟通解释条款",
      ownerAttorneyId,
      isHighValue: isHighValueCase(e.case ?? undefined),
      isHighIntent: false,
    })),
    ...payments.flatMap((p) => {
      const items: TaskRow[] = [];
      if (p.refundReviewStatus === "PENDING_REVIEW") {
        items.push({
          id: `pay-refund-${p.id}`,
          taskType: "PAYMENT",
          sourceType: "payment",
          sourceId: p.id,
          priority: 95,
          dueAt: null,
          status: "PENDING_REVIEW",
          title: `退款审核进行中 · ${p.title}`,
          subtitle: `支付状态 ${p.status}`,
          href: `/marketplace/payments/${p.id}`,
          badge: "退款",
          suggestedAction: "关注退款审核结果并准备补充说明（如需）",
          ownerAttorneyId,
          isHighValue: isHighValueCase(p.case ?? undefined),
          isHighIntent: false,
        });
      }
      for (const m of p.milestones) {
        items.push({
          id: `pay-mil-${m.id}`,
          taskType: "PAYMENT",
          sourceType: "payment",
          sourceId: p.id,
          priority: 88,
          dueAt: m.targetDate ?? null,
          status: "PENDING_REVIEW",
          title: `里程碑释放待审核 · ${m.title}`,
          subtitle: `${p.title}`,
          href: `/marketplace/payments/${p.id}`,
          badge: "里程碑",
          suggestedAction: "跟进客户确认与平台审核，准备交付证明材料",
          ownerAttorneyId,
          isHighValue: isHighValueCase(p.case ?? undefined),
          isHighIntent: false,
        });
      }
      return items;
    }),
  ]
    .sort((a, b) => {
      const overdueA = isOverdue(a.dueAt) ? 1 : 0;
      const overdueB = isOverdue(b.dueAt) ? 1 : 0;
      if (overdueA !== overdueB) return overdueB - overdueA;
      const highValueA = a.isHighValue ? 1 : 0;
      const highValueB = b.isHighValue ? 1 : 0;
      if (highValueA !== highValueB) return highValueB - highValueA;
      const highIntentA = a.isHighIntent ? 1 : 0;
      const highIntentB = b.isHighIntent ? 1 : 0;
      if (highIntentA !== highIntentB) return highIntentB - highIntentA;
      if (a.priority !== b.priority) return b.priority - a.priority;
      const at = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bt = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return at - bt;
    });

  const filteredRows = rows.filter((r) => {
    if (overdueOnly && !isOverdue(r.dueAt)) return false;
    if (typeFilter !== "all" && r.taskType !== typeFilter) return false;
    if (q) {
      const text = [r.title, r.subtitle, r.badge ?? "", r.taskType, r.suggestedAction ?? ""].join(" ").toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const summary = {
    total: rows.length,
    overdue: rows.filter((r) => isOverdue(r.dueAt)).length,
    reply: rows.filter((r) => r.taskType === "CONVERSATION_REPLY").length,
    workflow: rows.filter((r) => r.taskType === "FOLLOW_UP" || r.taskType === "CHECKLIST").length,
    risk: rows.filter((r) => r.taskType === "RISK").length,
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <AttorneyTabs />
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Lawyer Tasks</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">任务中心</h1>
              <p className="mt-2 text-sm text-slate-500">统一查看待回复、跟进提醒、补件清单、报价跟进、委托确认与支付相关任务。</p>
              <p className="mt-1 text-xs text-slate-400">排序逻辑：逾期优先 {"->"} 高价值案件优先 {"->"} 高意向会话优先 {"->"} 即将截止优先。</p>
            </div>
            <Link href="/attorney/workflow" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">打开工作流页</Link>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">总任务</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
              <p className="text-xs text-rose-700">逾期任务</p>
              <p className="mt-1 text-2xl font-bold text-rose-900">{summary.overdue}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p className="text-xs text-amber-700">待回复任务</p>
              <p className="mt-1 text-2xl font-bold text-amber-900">{summary.reply}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
              <p className="text-xs text-indigo-700">工作流任务</p>
              <p className="mt-1 text-2xl font-bold text-indigo-900">{summary.workflow}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
              <p className="text-xs text-rose-700">风险处理任务</p>
              <p className="mt-1 text-2xl font-bold text-rose-900">{summary.risk}</p>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <form action="/attorney/tasks" className="flex flex-wrap items-center gap-2">
              <select name="type" defaultValue={typeFilter} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="all">全部任务</option>
                <option value="CONVERSATION_REPLY">会话回复任务</option>
                <option value="QUOTE">报价任务</option>
                <option value="FOLLOW_UP">跟进任务</option>
                <option value="CHECKLIST">补件任务</option>
                <option value="ENGAGEMENT">委托确认任务</option>
                <option value="PAYMENT">回款/里程碑任务</option>
                <option value="RISK">风险处理任务</option>
              </select>
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" name="overdueOnly" value="1" defaultChecked={overdueOnly} />
                仅看逾期
              </label>
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="搜索任务标题/说明..."
                className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">筛选</button>
              {(typeFilter !== "all" || overdueOnly || q) && (
                <Link href="/attorney/tasks" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">重置</Link>
              )}
              <span className="ml-auto text-sm text-slate-500">当前 {filteredRows.length} / {rows.length} 条</span>
            </form>
          </div>

          <div className="space-y-3">
            {filteredRows.map((task) => (
              <Link key={task.id} href={task.href} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="mt-0.5">
                    {task.taskType === "CONVERSATION_REPLY" ? (
                      <ChatBubbleIcon className="h-5 w-5 text-blue-600" />
                    ) : task.taskType === "CHECKLIST" ? (
                      <DocumentTextIcon className="h-5 w-5 text-indigo-600" />
                    ) : task.taskType === "FOLLOW_UP" || task.taskType === "RISK" ? (
                      <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                    ) : (
                      <CheckCircleIcon className="h-5 w-5 text-slate-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                      {task.badge && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{task.badge}</span>}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{task.taskType}</span>
                      {task.isHighValue && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">高价值</span>}
                      {task.isHighIntent && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">高意向</span>}
                      {isOverdue(task.dueAt) && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] text-rose-700">逾期</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{task.subtitle}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      截止：{fmtDate(task.dueAt)} · 状态：{task.status} · 来源：{task.sourceType}/{task.sourceId.slice(-6)}
                    </p>
                    {task.suggestedAction && (
                      <p className="mt-1 text-xs text-slate-600">建议动作：{task.suggestedAction}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {filteredRows.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                {rows.length === 0 ? "当前没有待处理任务，保持良好响应节奏。" : "当前筛选下没有任务。"}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
