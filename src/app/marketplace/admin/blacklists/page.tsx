"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type BlacklistItem = {
  id: string;
  conversationId: string | null;
  scope: "CONVERSATION" | "GLOBAL";
  blockerUserId: string;
  blockedUserId: string;
  reason: string | null;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  deactivatedAt: string | null;
  blocker: { email: string };
  blocked: { email: string };
  deactivatedBy: { email: string } | null;
  conversation: { caseId: string; case: { title: string } } | null;
};

export default function AdminBlacklistsPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [rowReason, setRowReason] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});
  const isAdmin = viewer.user?.role === "ADMIN";

  function feedback(id: string, msg: string) {
    setRowMsg((m) => ({ ...m, [id]: msg }));
    setTimeout(() => setRowMsg((m) => { const n = { ...m }; delete n[id]; return n; }), 1800);
  }

  async function runAction(id: string, action: "activate" | "deactivate") {
    setActioning(id);
    try {
      const r = await fetch(`/api/marketplace/admin/blacklists/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: rowReason[id]?.trim() || undefined }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "操作失败");
      setItems((prev) => prev.map((it) => it.id === id ? { ...it, ...data.blacklist } : it));
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
    if (!activeOnly) params.set("activeOnly", "0");
    if (q.trim()) params.set("q", q.trim());
    params.set("page", String(page));
    params.set("pageSize", "20");
    fetch(`/api/marketplace/admin/blacklists?${params.toString()}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d; })
      .then((d) => {
        setItems(d.items ?? []);
        setMeta({ page: d.filters?.page ?? 1, totalPages: d.filters?.totalPages ?? 1, total: d.filters?.total ?? 0 });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, q, activeOnly, page]);

  useEffect(() => setPage(1), [q, activeOnly]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">黑名单处理中心</h1>
            <p className="mt-2 text-sm text-slate-500">查看、恢复、重新激活通信黑名单记录。</p>
          </div>
          <AdminTabs />
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索用户邮箱/ID/原因" className="min-w-[320px] rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
              仅看生效中
            </label>
            <span className="text-sm text-slate-500">共 {meta.total} 条</span>
          </div>
          {loading && <p className="text-sm text-slate-500">加载黑名单中...</p>}
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <div className="grid gap-4">
            {items.map((b) => (
              <article key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs ${b.active ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>{b.active ? "ACTIVE" : "INACTIVE"}</span>
                      <span className={`rounded-full px-2 py-1 text-xs ${b.scope === "GLOBAL" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {b.scope === "GLOBAL" ? "全平台拉黑" : "仅本会话禁言"}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-xs ${b.expiresAt ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                        {b.expiresAt ? "临时拉黑" : "永久"}
                      </span>
                      {b.conversationId && <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">会话来源</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{b.blocker.email} 拉黑 {b.blocked.email}</p>
                    <p className="mt-1 text-xs text-slate-500 break-all">Blacklist ID: {b.id}</p>
                    <p className="mt-1 text-xs text-slate-500 break-all">Blocker: {b.blockerUserId} · Blocked: {b.blockedUserId}</p>
                    {b.reason && <p className="mt-2 text-sm text-slate-700">{b.reason}</p>}
                    <p className="mt-1 text-xs text-slate-500">创建：{new Date(b.createdAt).toLocaleString()} · 更新：{new Date(b.updatedAt).toLocaleString()}</p>
                    {b.expiresAt && <p className="mt-1 text-xs text-amber-700">到期自动解除：{new Date(b.expiresAt).toLocaleString()}</p>}
                    {b.deactivatedAt && <p className="mt-1 text-xs text-slate-500">解除：{new Date(b.deactivatedAt).toLocaleString()} {b.deactivatedBy?.email ? `· ${b.deactivatedBy.email}` : ""}</p>}
                    {b.conversation && (
                      <div className="mt-2 flex gap-2 text-xs">
                        <Link href={`/marketplace/admin/conversations/${b.conversationId}`} className="underline">会话详情</Link>
                        <Link href={`/chat/${b.conversationId}`} className="underline">打开会话</Link>
                        <Link href={`/marketplace/admin/cases/${b.conversation.caseId}`} className="underline">案件详情</Link>
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-[240px] flex-col gap-2">
                    <textarea rows={2} value={rowReason[b.id] ?? ""} onChange={(e) => setRowReason((m) => ({ ...m, [b.id]: e.target.value }))} placeholder="处理备注（可选）" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
                    <button type="button" disabled={actioning === b.id} onClick={() => void runAction(b.id, b.active ? "deactivate" : "activate")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-50">
                      {b.active ? "解除黑名单" : "重新激活黑名单"}
                    </button>
                    {rowMsg[b.id] && <p className="text-xs text-slate-600 text-center">{rowMsg[b.id]}</p>}
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
