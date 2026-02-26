"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { ClientTabs } from "@/components/client/client-tabs";

type DashboardData = {
  summary: {
    cases: { pendingSelect: number; inProgress: number; completed: number };
    conversations: { awaitingReply: number; newMessages24h: number };
    payments: { milestoneConfirmationsPending: number; refunding: number };
    support: { disputesInProgress: number; disputesNeedReply: number; reportsPending: number; notificationsUnread?: number };
  };
  modules: {
    cases: Array<any>;
    conversations: Array<any>;
    payments: Array<any>;
    disputes: Array<any>;
    reports: Array<any>;
    notifications: Array<any>;
  };
  supportContact?: { channels?: Array<{ type: string; label: string; href?: string; hint?: string }> };
};

function StatCard({ title, value, hint, tone = "slate" }: { title: string; value: number; hint: string; tone?: "slate" | "amber" | "emerald" | "rose" }) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-slate-200 bg-white text-slate-900";
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{hint}</p>
    </div>
  );
}

export default function ClientCenterPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideReminder, setHideReminder] = useState(false);

  useEffect(() => {
    try {
      setHideReminder(window.localStorage.getItem("law119.clientCenter.hideReminder") === "1");
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const r = await fetch("/api/marketplace/client/dashboard", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error || "加载客户后台失败");
        setLoading(false);
        return;
      }
      setData(j);
      setError(null);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <ClientTabs />
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Client Center</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">客户后台工作台</h1>
              <p className="mt-2 text-sm text-slate-500">统一管理案件、与律师沟通、支付托管、投诉举报与平台支持。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/marketplace/post-case" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">发布案件</Link>
              <Link href="/marketplace/client-conversations" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">消息中心</Link>
              <Link href="/marketplace/payments" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100">
                📋 履约里程碑
              </Link>
              <Link href="/marketplace/support-center" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">支持中心</Link>
            </div>
          </div>

          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          {data && (
            <>
              {!hideReminder && (
              <section className="sticky top-3 z-10 mb-6 rounded-2xl border border-indigo-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">待处理提醒</p>
                    <p className="mt-1 text-sm text-slate-700">
                      未读通知 <span className="font-semibold text-slate-900">{data.summary.support.notificationsUnread ?? 0}</span> ·
                      待回复会话 <span className="font-semibold text-slate-900">{data.summary.conversations.awaitingReply}</span> ·
                      待确认里程碑 <span className="font-semibold text-slate-900">{data.summary.payments.milestoneConfirmationsPending}</span> ·
                      待我补充争议 <span className="font-semibold text-slate-900">{data.summary.support.disputesNeedReply}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(data.summary.support.notificationsUnread ?? 0) > 0 && (
                      <Link href="/marketplace/notifications?status=UNREAD" className="rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-indigo-700">
                        查看未读通知
                      </Link>
                    )}
                    {data.summary.conversations.awaitingReply > 0 && (
                      <Link href="/marketplace/client-conversations?status=awaiting_client" className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-700">
                        去回复会话
                      </Link>
                    )}
                    {data.summary.payments.milestoneConfirmationsPending > 0 && (
                      <Link href="/marketplace/payments" className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-emerald-700">
                        去确认里程碑
                      </Link>
                    )}
                    {data.summary.support.disputesNeedReply > 0 && (
                      <Link href="/marketplace/disputes" className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-rose-700">
                        补充争议材料
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setHideReminder(true);
                        try { window.localStorage.setItem("law119.clientCenter.hideReminder", "1"); } catch {}
                      }}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                    >
                      忽略提醒
                    </button>
                  </div>
                </div>
              </section>
              )}

              {hideReminder && (
                <div className="mb-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setHideReminder(false);
                      try { window.localStorage.removeItem("law119.clientCenter.hideReminder"); } catch {}
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    恢复待处理提醒条
                  </button>
                </div>
              )}

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="待选律师" value={data.summary.cases.pendingSelect} hint="已发布案件中尚未完成律师选择" tone="amber" />
                <StatCard title="待回复会话" value={data.summary.conversations.awaitingReply} hint="律师已回复，等待你继续沟通" tone="slate" />
                <StatCard title="待确认里程碑" value={data.summary.payments.milestoneConfirmationsPending} hint="律师已申请释放，等待你确认" tone="emerald" />
                <StatCard title="支持待处理" value={data.summary.support.disputesInProgress + data.summary.support.reportsPending} hint="争议工单/举报仍在处理中" tone="rose" />
              </section>

              <div className="mt-6 grid gap-5 xl:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">我的案件</h2>
                    <Link href="/marketplace/my-cases" className="text-sm underline">查看全部</Link>
                  </div>
                  <div className="space-y-3">
                    {data.modules.cases.map((c) => (
                      <div key={c.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{c.lifecycle}</span>
                          {c.quoteDeadlinePassed && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">报价已截止</span>}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{c.title}</p>
                        <p className="mt-1 text-xs text-slate-500">报价 {c._count?.bids ?? 0} · 会话 {c._count?.conversations ?? 0}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <Link href={`/marketplace/cases/${c.id}`} className="underline">案件详情</Link>
                          <Link href={`/marketplace/cases/${c.id}/select`} className="underline">选择律师</Link>
                          {(c.lifecycle === "MATCHED" || c.lifecycle === "COMPLETED") && (
                            <Link href="/marketplace/payments" className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 hover:bg-amber-200">
                              查看履约进度 →
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                    {data.modules.cases.length === 0 && <p className="text-sm text-slate-500">暂无案件，先发布一个案子开始匹配律师。</p>}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">平台通知中心</h2>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700">
                        未读 {data.summary.support.notificationsUnread ?? 0}
                      </span>
                      <Link href="/marketplace/notifications" className="text-sm underline">查看全部</Link>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {data.modules.notifications.map((n) => (
                      <div key={n.id} className={`rounded-xl border p-3 ${n.status === "UNREAD" ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200"}`}>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{n.type}</span>
                          {n.status === "UNREAD" && <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700">未读</span>}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{n.title}</p>
                        {n.body && <p className="mt-1 line-clamp-2 text-xs text-slate-600">{n.body}</p>}
                        <div className="mt-2 flex gap-2 text-xs">
                          <span className="text-slate-500">{new Date(n.createdAt).toLocaleString()}</span>
                          {n.linkUrl && <Link href={n.linkUrl} className="underline">打开</Link>}
                        </div>
                      </div>
                    ))}
                    {data.modules.notifications.length === 0 && <p className="text-sm text-slate-500">暂无平台通知。</p>}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">我的会话（待回复 / 新消息）</h2>
                    <Link href="/marketplace/client-conversations" className="text-sm underline">消息中心</Link>
                  </div>
                  <div className="space-y-3">
                    {data.modules.conversations.map((c) => (
                      <div key={c.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex flex-wrap gap-2">
                          {c.flags?.awaitingClientReply && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">待你回复</span>}
                          {c.flags?.newMessage24h && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">24h 新消息</span>}
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{c.status}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{c.case?.title ?? `Case ${c.caseId}`}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          律师：
                          {[
                            c.attorney?.firstName,
                            c.attorney?.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ") || c.attorney?.user?.email || "Attorney"}
                          {c.attorney?.firmName ? ` · ${c.attorney.firmName}` : ""}
                        </p>
                        {c.latestMessage && <p className="mt-1 line-clamp-2 text-xs text-slate-600">{c.latestMessage.body}</p>}
                        <div className="mt-2 flex gap-2 text-xs">
                          <Link href={`/chat/${c.id}`} className="underline">打开会话</Link>
                          {c.disputeTickets?.[0] && <Link href={`/marketplace/disputes/${c.disputeTickets[0].id}`} className="underline">相关工单</Link>}
                        </div>
                      </div>
                    ))}
                    {data.modules.conversations.length === 0 && <p className="text-sm text-slate-500">暂无会话，选择律师后会自动创建会话。</p>}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">我的支付（待确认里程碑 / 退款中）</h2>
                    <Link href="/marketplace/payments" className="text-sm underline">支付列表</Link>
                  </div>
                  <div className="space-y-3">
                    {data.modules.payments.map((p) => (
                      <div key={p.id} className={`rounded-xl border p-3 ${p.holdBlockedByDispute ? "border-rose-200 bg-rose-50" : "border-slate-200"}`}>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{p.status}</span>
                          {p.milestonesAwaitingClient > 0 && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">待确认 {p.milestonesAwaitingClient}</span>}
                          {p.refunding && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">退款中</span>}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{p.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{p.currency} {p.amountTotal}</p>
                        <div className="mt-2 text-xs">
                          <Link href={`/marketplace/payments/${p.id}`} className="underline">查看支付详情 / 里程碑确认</Link>
                        </div>
                      </div>
                    ))}
                    {data.modules.payments.length === 0 && <p className="text-sm text-slate-500">暂无支付单记录。</p>}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">我的投诉 / 争议 + 联系平台</h2>
                    <Link href="/marketplace/support-center" className="text-sm underline">支持中心</Link>
                  </div>
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">争议处理中</p>
                        <p className="mt-1 text-xl font-bold text-slate-900">{data.summary.support.disputesInProgress}</p>
                        <p className="text-xs text-slate-500">待我补充：{data.summary.support.disputesNeedReply}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">举报处理中</p>
                        <p className="mt-1 text-xl font-bold text-slate-900">{data.summary.support.reportsPending}</p>
                        <p className="text-xs text-slate-500">会话中可继续提交举报</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/marketplace/disputes" className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">争议工单</Link>
                      <Link href="/marketplace/support-center" className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">举报记录 / FAQ / 联系平台</Link>
                      <Link href="/marketplace/support-tickets" className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">客服消息单</Link>
                      <Link href="/marketplace/notifications" className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">平台通知中心</Link>
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                      <p className="font-semibold">一键联系平台（客服/管理员入口）</p>
                      <p className="mt-1">优先通过“争议工单”提交问题；如在会话中发现骚扰/诈骗/威胁，请直接在聊天页点击“举报”或“举报此消息”。</p>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
