import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import { requireAuthContext } from "../../../lib/auth-context";
import { NavBar } from "../../../components/ui/nav-bar";
import { AttorneyTabs } from "../../../components/attorney/attorney-tabs";
import { ChatBubbleIcon, InboxIcon, LockClosedIcon } from "../../../components/ui/icons";

function fmt(dt: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(dt);
}

export default async function AttorneyConversationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string; q?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const filter = (sp.filter ?? "all") as "all" | "unread" | "awaiting_reply" | "high_risk" | "stale_24h";
  const q = (sp.q ?? "").trim().toLowerCase();
  const auth = await requireAuthContext().catch(() => null);
  if (!auth || auth.role !== "ATTORNEY" || !auth.attorneyProfileId) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <LockClosedIcon className="mx-auto h-8 w-8 text-rose-600" />
            <p className="mt-3 text-sm text-slate-700">请以律师身份登录后访问会话中心。</p>
          </div>
        </main>
      </>
    );
  }

  const conversations = await prisma.conversation.findMany({
    where: { attorneyProfileId: auth.attorneyProfileId },
    include: {
      case: { select: { id: true, title: true, category: true, stateCode: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { senderRole: true, body: true, createdAt: true },
      },
      tags: { select: { tag: true } },
      readStates: {
        where: { userId: auth.authUserId },
        select: { lastReadAt: true },
      },
      disputeTickets: {
        where: { status: { in: ["OPEN", "UNDER_REVIEW", "WAITING_PARTY"] } },
        select: { id: true, status: true, priority: true },
        take: 3,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const unreadCounts = await Promise.all(
    conversations.map(async (c) => {
      const lastReadAt = c.readStates[0]?.lastReadAt ?? null;
      const count = await prisma.chatMessage.count({
        where: {
          conversationId: c.id,
          senderRole: "CLIENT",
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      });
      return [c.id, count] as const;
    }),
  );
  const unreadMap = new Map(unreadCounts);

  const summary = {
    total: conversations.length,
    open: conversations.filter((c) => c.status === "OPEN").length,
    unreadConversations: conversations.filter((c) => (unreadMap.get(c.id) ?? 0) > 0).length,
    awaitingReply: conversations.filter((c) => {
      const latest = c.messages[0];
      return latest?.senderRole === "CLIENT" && (unreadMap.get(c.id) ?? 0) > 0;
    }).length,
    stale24h: conversations.filter((c) => {
      const latest = c.messages[0];
      if (!latest) return false;
      return Date.now() - latest.createdAt.getTime() > 24 * 60 * 60 * 1000;
    }).length,
    highRisk: conversations.filter((c) => c.tags.some((t) => t.tag === "HIGH_RISK")).length,
  };

  const filteredConversations = conversations.filter((c) => {
    const latest = c.messages[0];
    const unread = unreadMap.get(c.id) ?? 0;
    const needsReply = latest?.senderRole === "CLIENT" && unread > 0;
    const highRisk = c.tags.some((t) => t.tag === "HIGH_RISK");
    const stale24h = latest ? Date.now() - latest.createdAt.getTime() > 24 * 60 * 60 * 1000 : false;
    const textBlob = [c.case.title, c.case.category, c.case.stateCode, c.id, latest?.body ?? ""].join(" ").toLowerCase();
    if (q && !textBlob.includes(q)) return false;
    if (filter === "unread") return unread > 0;
    if (filter === "awaiting_reply") return needsReply;
    if (filter === "high_risk") return highRisk;
    if (filter === "stale_24h") return stale24h;
    return true;
  });

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <AttorneyTabs />
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Attorney Messages</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">会话中心</h1>
              <p className="mt-2 text-sm text-slate-500">集中处理客户沟通、未读消息、风险标签与争议会话。</p>
              <p className="mt-1 text-xs text-slate-400">建议优先处理：待你回复 → 高风险 → 24h 未跟进会话。</p>
            </div>
            <div className="flex gap-2">
              <Link href="/attorney/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">返回总览</Link>
              <Link href="/attorney/cases" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">我的案件</Link>
            </div>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["全部会话", summary.total],
              ["进行中", summary.open],
              ["有未读", summary.unreadConversations],
              ["待你回复", summary.awaitingReply],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {[
                ["all", "全部", summary.total],
                ["awaiting_reply", "待你回复", summary.awaitingReply],
                ["unread", "有未读", summary.unreadConversations],
                ["high_risk", "高风险", summary.highRisk],
                ["stale_24h", "24h未跟进", summary.stale24h],
              ].map(([value, label, count]) => (
                <Link
                  key={value}
                  href={`/attorney/conversations?filter=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  className={`rounded-full border px-3 py-1.5 text-xs ${filter === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {label} · {count}
                </Link>
              ))}
              <form action="/attorney/conversations" className="ml-auto flex items-center gap-2">
                <input type="hidden" name="filter" value={filter} />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="搜索案件/会话/消息..."
                  className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">
                  搜索
                </button>
                {(q || filter !== "all") && (
                  <Link href="/attorney/conversations" className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">
                    重置
                  </Link>
                )}
              </form>
            </div>
          </div>

          <div className="space-y-4">
            {filteredConversations.map((c) => {
              const latest = c.messages[0];
              const unread = unreadMap.get(c.id) ?? 0;
              const needsReply = latest?.senderRole === "CLIENT" && unread > 0;
              return (
                <article key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{c.status}</span>
                        {unread > 0 && <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700">未读 {unread}</span>}
                        {needsReply && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">待你回复</span>}
                        {c.tags.some((t) => t.tag === "HIGH_RISK") && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">高风险</span>}
                        {c.tags.some((t) => t.tag === "HIGH_INTENT") && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">高意向</span>}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{c.case.title || `${c.case.category} case`}</p>
                      <p className="mt-1 text-xs text-slate-500">{c.case.category} · {c.case.stateCode} · 会话ID {c.id}</p>
                      {latest && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p className="text-xs text-slate-600">
                            <span className="font-medium">{latest.senderRole === "CLIENT" ? "客户" : latest.senderRole === "ATTORNEY" ? "律师" : "系统"}</span>
                            {" · "}
                            {fmt(latest.createdAt)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-700">{latest.body}</p>
                        </div>
                      )}
                      {c.disputeTickets.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {c.disputeTickets.map((t) => (
                            <Link key={t.id} href={`/marketplace/disputes/${t.id}`} className="rounded-full bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
                              争议 {t.priority}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link href={`/chat/${c.id}`} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                        打开聊天
                      </Link>
                      <Link href={`/marketplace/conversations/${c.id}/workflow`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">
                        工作流面板
                      </Link>
                      <Link href={`/marketplace/cases/${c.case.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">
                        案件详情
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
            {filteredConversations.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                <InboxIcon className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                {conversations.length === 0 ? "暂无会话。客户选择你的报价后会自动创建会话。" : "当前筛选下暂无会话。"}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
