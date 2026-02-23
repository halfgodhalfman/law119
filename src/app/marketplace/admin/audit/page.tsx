"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type AuditItem = {
  id: string;
  type: string;
  at: string;
  title: string;
  detail: string;
  action?: string;
  eventCode?: string;
  entityType?: string;
  actionCode?: string;
  actorLabel?: string;
  metadata?: { key?: string; diff?: Record<string, { before: unknown; after: unknown }> | null } | null;
  refs?: { caseId?: string; bidId?: string; conversationId?: string; operatorId?: string; senderUserId?: string; attorneyProfileId?: string };
};

export default function AdminAuditPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [sources, setSources] = useState<string[]>([]);
  const isAdmin = viewer.user?.role === "ADMIN";

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (q.trim()) params.set("q", q.trim());
    if (actionFilter) params.set("action", actionFilter);
    if (entityTypeFilter) params.set("entityType", entityTypeFilter);
    params.set("page", String(page));
    params.set("pageSize", "30");
    fetch(`/api/marketplace/admin/audit?${params.toString()}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d; })
      .then((d) => {
        setItems(d.items ?? []);
        setMeta({ page: d.filters?.page ?? 1, totalPages: d.filters?.totalPages ?? 1, total: d.filters?.total ?? 0 });
        setSources(d.sources ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, type, q, actionFilter, entityTypeFilter, page]);

  useEffect(() => setPage(1), [type, q, actionFilter, entityTypeFilter]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">审计中心</h1>
            <p className="mt-2 text-sm text-slate-500">聚合案件状态日志、报价版本、会话标记与近期消息。</p>
          </div>
          <AdminTabs />
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部类型</option>
              <option value="case_status">案件状态</option>
              <option value="bid_version">报价版本</option>
              <option value="conversation_flag">会话标记</option>
              <option value="conversation_message">会话消息</option>
              <option value="admin_action">后台动作</option>
              <option value="attachment_access">附件访问</option>
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索 Case/Bid/Conversation/原因/消息" className="min-w-[320px] rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} placeholder="动作代码（如 USER_ROLE_UPDATE）" className="min-w-[240px] rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部实体</option>
              {["CASE", "BID", "USER", "ATTORNEY", "REPORT", "BLACKLIST", "CONVERSATION", "SUPPORT_TICKET", "NOTIFICATION"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <a
              href={`/api/marketplace/admin/audit?${new URLSearchParams({
                ...(type ? { type } : {}),
                ...(q.trim() ? { q: q.trim() } : {}),
                ...(actionFilter ? { action: actionFilter } : {}),
                ...(entityTypeFilter ? { entityType: entityTypeFilter } : {}),
                format: "csv",
              }).toString()}`}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              导出 CSV
            </a>
            <span className="text-sm text-slate-500">共 {meta.total} 条</span>
          </div>
          {sources.length > 0 && <p className="mb-3 text-xs text-slate-500">日志源：{sources.join(" / ")}</p>}
          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}
          {loading && isAdmin && <p className="text-sm text-slate-500">加载审计日志中...</p>}
          {error && isAdmin && <p className="text-sm text-rose-700">加载失败：{error}</p>}

          <div className="space-y-3">
            {items.map((e) => (
              <article key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{e.type}</span>
                    {e.entityType && <span className="rounded-full bg-white border border-slate-200 px-2 py-1 text-xs">{e.entityType}</span>}
                    {e.actionCode && <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-1 text-xs text-indigo-700">{e.actionCode}</span>}
                    <h2 className="text-sm font-semibold text-slate-900">{e.title}</h2>
                  </div>
                  <span className="text-xs text-slate-500">{new Date(e.at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap break-words">{e.detail}</p>
                {e.actorLabel && <p className="mt-2 text-xs text-slate-500">操作人：{e.actorLabel}</p>}
                {e.type === "admin_action" && e.metadata?.diff && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">字段变更 Diff</p>
                    <div className="mt-2 grid gap-2">
                      {Object.entries(e.metadata.diff).map(([field, values]) => (
                        <div key={`${e.id}-${field}`} className="rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs text-slate-700">
                          <span className="font-semibold text-slate-900">{field}</span>
                          <span className="mx-2 text-slate-400">{String((values as any).before ?? (values as any).old ?? "null")}</span>
                          <span className="text-slate-400">-&gt;</span>
                          <span className="mx-2 text-emerald-700">{String((values as any).after ?? (values as any).new ?? "null")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {e.refs?.caseId && <Link href={`/marketplace/admin/cases/${e.refs.caseId}`} className="underline text-slate-700">案件详情</Link>}
                  {e.refs?.bidId && <Link href={`/marketplace/admin/bids/${e.refs.bidId}`} className="underline text-slate-700">报价详情</Link>}
                  {e.refs?.conversationId && <Link href={`/marketplace/admin/conversations/${e.refs.conversationId}`} className="underline text-slate-700">会话详情</Link>}
                  {e.refs?.conversationId && <Link href={`/chat/${e.refs.conversationId}`} className="underline text-slate-700">打开会话</Link>}
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
