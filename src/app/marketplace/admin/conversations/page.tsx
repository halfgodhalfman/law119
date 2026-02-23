"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { AdminTabs } from "@/components/admin/admin-tabs";

type ConversationItem = {
  id: string;
  bidId: string;
  caseId: string;
  attorneyProfileId: string;
  clientProfileId: string | null;
  status: string;
  consultationAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  flags: string[];
  sensitiveHits: string[];
  disputeHits: string[];
  latestMessage: { body: string; senderRole: string; createdAt: string } | null;
  case: { title: string; category: string; status: string };
  attorneyName: string;
  clientName: string;
  attorney: { user: { email: string } };
  client: { user: { email: string } } | null;
  _count: { messages: number; disclaimerAcceptances: number };
};

export default function AdminConversationsPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [reason, setReason] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});
  const isAdmin = viewer.user?.role === "ADMIN";

  function feedback(id: string, msg: string) {
    setRowMsg((m) => ({ ...m, [id]: msg }));
    setTimeout(() => setRowMsg((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    }), 1800);
  }

  async function runAction(id: string, action: "close" | "reopen" | "mark_complaint" | "clear_flags") {
    setActioning(id);
    try {
      const r = await fetch(`/api/marketplace/admin/conversations/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason[id]?.trim() || undefined }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "操作失败");
      if (action === "close" || action === "reopen") {
        setItems((prev) => prev.map((it) => it.id === id ? { ...it, status: action === "close" ? "CLOSED" : "OPEN" } : it));
      } else {
        // refresh flags snapshot after mark/clear
        setItems((prev) => prev.map((it) => (
          it.id === id
            ? {
                ...it,
                flags:
                  action === "mark_complaint"
                    ? Array.from(new Set([...it.flags, "complaint_marked"]))
                    : it.flags.filter((f) => f !== "complaint_marked"),
              }
            : it
        )));
      }
      feedback(id, "已更新");
    } catch (e) {
      feedback(id, e instanceof Error ? e.message : "操作失败");
    } finally {
      setActioning(null);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    if (flaggedOnly) params.set("flaggedOnly", "1");
    params.set("page", String(page));
    params.set("pageSize", "20");
    fetch(`/api/marketplace/admin/conversations?${params.toString()}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d; })
      .then((d) => {
        setItems(d.items ?? []);
        setMeta({ page: d.filters?.page ?? 1, totalPages: d.filters?.totalPages ?? 1, total: d.filters?.total ?? 0 });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, status, q, flaggedOnly, page]);

  useEffect(() => setPage(1), [status, q, flaggedOnly]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">沟通管理</h1>
            <p className="mt-2 text-sm text-slate-500">会话列表、投诉标记、敏感词/争议排查入口。</p>
          </div>
          <AdminTabs />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部状态</option><option value="OPEN">OPEN</option><option value="CLOSED">CLOSED</option>
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索会话/案件标题/消息" className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-64" />
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} /> 只看已标记/疑似异常</label>
            <span className="text-sm text-slate-500">共 {meta.total} 条</span>
          </div>
          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}
          {loading && isAdmin && <p className="text-sm text-slate-500">加载会话列表中...</p>}
          {error && isAdmin && <p className="text-sm text-rose-700">加载失败：{error}</p>}
          <div className="grid gap-4">
            {items.map((c) => (
              <article key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{c.status}</span>
                      {c.flags.map((f) => <span key={`${c.id}-${f}`} className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">{f}</span>)}
                      {c.consultationAcceptedAt && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">已接受咨询</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{c.case.title}</p>
                    <p className="mt-1 text-xs text-slate-500 break-all">Conversation: {c.id} · Case: {c.caseId} · Bid: {c.bidId}</p>
                    <p className="mt-1 text-sm text-slate-600">律师：{c.attorneyName || "未填写姓名"}（{c.attorney.user.email}）</p>
                    <p className="mt-1 text-sm text-slate-600">发布方：{c.clientName || "匿名/未填写"}{c.client?.user.email ? `（${c.client.user.email}）` : ""}</p>
                    {c.sensitiveHits.length > 0 && <p className="mt-1 text-xs text-rose-700">敏感词：{c.sensitiveHits.join("、")}</p>}
                    {c.disputeHits.length > 0 && <p className="mt-1 text-xs text-amber-700">争议词：{c.disputeHits.join("、")}</p>}
                    <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 line-clamp-3">{c.latestMessage?.body || "暂无消息"}</p>
                  </div>
                  <div className="flex min-w-[220px] flex-col gap-2">
                    <Link href={`/marketplace/admin/conversations/${c.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-center hover:bg-slate-50">后台详情</Link>
                    <Link href={`/chat/${c.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-center hover:bg-slate-50">打开会话</Link>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => runAction(c.id, c.status === "OPEN" ? "close" : "reopen")} disabled={actioning === c.id} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-50">{c.status === "OPEN" ? "关闭会话" : "重开会话"}</button>
                      <button type="button" onClick={() => runAction(c.id, "mark_complaint")} disabled={actioning === c.id} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 disabled:opacity-50">标记投诉</button>
                    </div>
                    <button type="button" onClick={() => runAction(c.id, "clear_flags")} disabled={actioning === c.id} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-50">清除标记</button>
                    <textarea value={reason[c.id] ?? ""} onChange={(e) => setReason((m) => ({ ...m, [c.id]: e.target.value }))} rows={2} placeholder="投诉/审核备注" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
                    {rowMsg[c.id] && <p className="text-xs text-slate-600 text-center">{rowMsg[c.id]}</p>}
                  </div>
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
