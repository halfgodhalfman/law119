"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";

type Item = {
  id: string;
  scope: string;
  action: string;
  ruleCode: string;
  severity: string;
  matchedText: string | null;
  note: string | null;
  actorUserId: string | null;
  caseId: string | null;
  bidId: string | null;
  conversationId: string | null;
  createdAt: string;
  actor: { email: string; role: string } | null;
  case: { title: string } | null;
};

export default function AdminContentRuleEventsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [topRules, setTopRules] = useState<any[]>([]);
  const [scope, setScope] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (scope) params.set("scope", scope);
    if (action) params.set("action", action);
    if (q.trim()) params.set("q", q.trim());
    params.set("page", String(page));
    params.set("pageSize", "30");
    setLoading(true);
    fetch(`/api/marketplace/admin/content-rule-events?${params.toString()}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d; })
      .then((d) => { setItems(d.items ?? []); setTopRules(d.topRules ?? []); setMeta({ page: d.filters.page, totalPages: d.filters.totalPages, total: d.filters.total }); })
      .finally(() => setLoading(false));
  }, [scope, action, q, page]);

  useEffect(() => setPage(1), [scope, action, q]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">规则命中事件控制台</h1>
            <p className="mt-2 text-sm text-slate-500">查看内容规则命中记录（案件/报价/聊天），用于风控审查和规则调优。</p>
          </div>
          <AdminTabs />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部范围</option><option value="CASE_POST">案件</option><option value="BID_SUBMISSION">报价</option><option value="CHAT_MESSAGE">聊天</option>
            </select>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部动作</option><option value="WARN">WARN</option><option value="REVIEW">REVIEW</option><option value="BLOCK">BLOCK</option><option value="ALLOW">ALLOW</option>
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索 ruleCode / 文本 / Case/Bid/Conversation" className="min-w-[320px] rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <span className="text-sm text-slate-500">共 {meta.total} 条</span>
          </div>

          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Top 命中规则</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {topRules.map((r, i) => (
                <div key={`${r.ruleCode}-${r.scope}-${i}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-900">{r.ruleCode}</p>
                  <p className="text-xs text-slate-500">{r.scope} · {r.action}</p>
                  <p className="mt-1 text-xs text-slate-600">命中 {r._count?._all ?? 0} 次</p>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-3">
            {loading && <p className="text-sm text-slate-500">加载事件中...</p>}
            {items.map((e) => (
              <article key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{e.scope}</span>
                    <span className={`rounded-full px-2 py-1 text-xs ${e.action === "BLOCK" ? "bg-rose-100 text-rose-700" : e.action === "REVIEW" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{e.action}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{e.ruleCode}</span>
                  </div>
                  <span className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{e.note ?? "无说明"}</p>
                {e.matchedText && <p className="mt-1 text-xs text-amber-700">命中文本：{e.matchedText}</p>}
                <p className="mt-1 text-xs text-slate-500">Actor：{e.actor?.email ?? e.actorUserId ?? "未知"} {e.actor ? `(${e.actor.role})` : ""}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {e.caseId && <Link href={`/marketplace/admin/cases/${e.caseId}`} className="underline">案件详情</Link>}
                  {e.bidId && <Link href={`/marketplace/admin/bids/${e.bidId}`} className="underline">报价详情</Link>}
                  {e.conversationId && <Link href={`/marketplace/admin/conversations/${e.conversationId}`} className="underline">会话详情</Link>}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">上一页</button>
            <p className="text-sm text-slate-500">第 {meta.page} / {meta.totalPages} 页</p>
            <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">下一页</button>
          </div>
        </div>
      </main>
    </>
  );
}

