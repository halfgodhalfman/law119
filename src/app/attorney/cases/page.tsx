import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import { requireAuthContext } from "../../../lib/auth-context";
import { NavBar } from "../../../components/ui/nav-bar";
import { AttorneyTabs } from "../../../components/attorney/attorney-tabs";
import { LockClosedIcon } from "../../../components/ui/icons";

function fmt(v: Date | null | undefined) {
  if (!v) return "未记录";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(v);
}

export default async function AttorneyCasesPage() {
  const auth = await requireAuthContext().catch(() => null);
  if (!auth || auth.role !== "ATTORNEY" || !auth.attorneyProfileId) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <LockClosedIcon className="mx-auto h-8 w-8 text-rose-600" />
            <p className="mt-3 text-sm text-slate-700">请以律师身份登录后访问我的案件。</p>
          </div>
        </main>
      </>
    );
  }

  const bids = await prisma.bid.findMany({
    where: { attorneyProfileId: auth.attorneyProfileId },
    include: {
      case: {
        include: {
          conversations: {
            where: { attorneyProfileId: auth.attorneyProfileId },
            include: {
              readStates: { where: { userId: auth.authUserId }, select: { lastReadAt: true } },
              messages: { orderBy: { createdAt: "desc" }, take: 1, select: { senderRole: true, createdAt: true, body: true } },
            },
          },
          disputeTickets: { where: { attorneyProfileId: auth.attorneyProfileId, status: { in: ["OPEN", "UNDER_REVIEW", "WAITING_PARTY"] } }, select: { id: true, status: true } },
          paymentOrders: {
            where: { attorneyProfileId: auth.attorneyProfileId },
            include: { milestones: { select: { id: true, status: true, releaseReviewStatus: true } } },
          },
          engagementConfirmations: {
            where: { attorneyProfileId: auth.attorneyProfileId },
            select: { id: true, status: true, updatedAt: true },
          },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
  });

  const rows = await Promise.all(
    bids.map(async (b) => {
      const convo = b.case.conversations[0] ?? null;
      const readState = convo?.readStates[0] ?? null;
      const unreadClientMessages = convo
        ? await prisma.chatMessage.count({
            where: {
              conversationId: convo.id,
              senderRole: "CLIENT",
              ...(readState?.lastReadAt ? { createdAt: { gt: readState.lastReadAt } } : {}),
            },
          })
        : 0;
      const engagement = b.case.engagementConfirmations[0] ?? null;
      const payment = b.case.paymentOrders[0] ?? null;
      const pendingMilestones = payment?.milestones.filter((m) => m.releaseReviewStatus === "PENDING_REVIEW" || m.status === "READY_FOR_RELEASE").length ?? 0;

      let group: "pending_contact" | "pending_engagement" | "in_progress" | "pending_payout" | "completed" = "pending_contact";
      if (!convo) group = "pending_contact";
      else if (engagement && engagement.status !== "ACTIVE") group = "pending_engagement";
      else if (payment && pendingMilestones > 0) group = "pending_payout";
      else if (b.case.status === "CLOSED" || (payment && (payment.status === "RELEASED" || payment.status === "REFUNDED"))) group = "completed";
      else group = "in_progress";

      return {
        bid: b,
        case: b.case,
        conversation: convo,
        engagement,
        payment,
        unreadClientMessages,
        pendingMilestones,
        group,
      };
    }),
  );

  const grouped = {
    pending_contact: rows.filter((r) => r.group === "pending_contact"),
    pending_engagement: rows.filter((r) => r.group === "pending_engagement"),
    in_progress: rows.filter((r) => r.group === "in_progress"),
    pending_payout: rows.filter((r) => r.group === "pending_payout"),
    completed: rows.filter((r) => r.group === "completed"),
  };

  const groupDefs: Array<[keyof typeof grouped, string]> = [
    ["pending_contact", "待沟通"],
    ["pending_engagement", "待委托确认"],
    ["in_progress", "进行中"],
    ["pending_payout", "待回款"],
    ["completed", "已完成"],
  ];

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <AttorneyTabs />
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Attorney Cases</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">我的案件（律师侧）</h1>
              <p className="mt-2 text-sm text-slate-500">按沟通/委托/履约/回款阶段查看律师已参与案件，并跟踪消息、里程碑和争议状态。</p>
            </div>
            <div className="flex gap-2">
              <Link href="/marketplace/my-bids" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">我的报价</Link>
              <Link href="/attorney/tasks" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">任务中心</Link>
            </div>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {groupDefs.map(([key, label]) => (
              <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{grouped[key].length}</p>
              </div>
            ))}
          </div>

          <div className="space-y-8">
            {groupDefs.map(([key, label]) => (
              <section key={key}>
                <h2 className="mb-3 text-sm font-semibold text-slate-700">{label}</h2>
                <div className="space-y-3">
                  {grouped[key].map((row) => {
                    const latestMsg = row.conversation?.messages[0];
                    return (
                      <article key={row.bid.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{row.case.category}</span>
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">Case {row.case.status}</span>
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">Bid {row.bid.status}</span>
                              {row.engagement && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">委托 {row.engagement.status}</span>}
                              {row.unreadClientMessages > 0 && <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700">未读消息 {row.unreadClientMessages}</span>}
                              {(row.case.disputeTickets?.length ?? 0) > 0 && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">争议 {row.case.disputeTickets.length}</span>}
                              {row.pendingMilestones > 0 && <span className="rounded-full bg-teal-100 px-2 py-1 text-xs text-teal-700">待释放里程碑 {row.pendingMilestones}</span>}
                            </div>
                            <p className="text-sm font-semibold text-slate-900">{row.case.title || `${row.case.category} case`}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              客户状态：{row.conversation ? (latestMsg?.senderRole === "CLIENT" ? "等待律师回复" : "等待客户回复/处理中") : "未开始沟通"} ·
                              风险/争议状态：{(row.case.disputeTickets?.length ?? 0) > 0 ? "有争议处理中" : "正常"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              里程碑状态：{row.payment ? `${row.payment.status}${row.pendingMilestones ? ` · 待释放 ${row.pendingMilestones}` : ""}` : "未创建支付单"} · 最近更新 {fmt(row.case.updatedAt)}
                            </p>
                            {latestMsg && (
                              <p className="mt-2 line-clamp-1 text-xs text-slate-600">
                                最新消息（{latestMsg.senderRole} · {fmt(latestMsg.createdAt)}）：{latestMsg.body}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Link href={`/marketplace/cases/${row.case.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 text-center">
                              案件详情（律师）
                            </Link>
                            {row.conversation && (
                              <Link href={`/chat/${row.conversation.id}`} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 text-center">
                                打开会话
                              </Link>
                            )}
                            {row.engagement && (
                              <Link href={`/marketplace/engagements/${row.engagement.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 text-center">
                                委托确认单
                              </Link>
                            )}
                            {row.payment && (
                              <Link href={`/marketplace/payments/${row.payment.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 text-center">
                                支付/里程碑
                              </Link>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {grouped[key].length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                      当前分组暂无案件。
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
