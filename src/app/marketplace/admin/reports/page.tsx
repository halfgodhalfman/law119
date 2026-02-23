"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type ReportItem = {
  id: string;
  conversationId: string;
  reporterUserId: string;
  reporterRole: string;
  targetUserId: string | null;
  targetRole: string | null;
  reportedMessageId: string | null;
  reportedMessageExcerpt: string | null;
  category: string;
  details: string | null;
  evidenceSnapshot: Array<{ id: string; senderRole: string; body: string; createdAt: string }> | null;
  evidenceCount: number | null;
  attachments: Array<{ id: string; fileName: string | null; url: string; mimeType: string | null; sizeBytes: number | null; createdAt: string }>;
  status: string;
  adminNote: string | null;
  handledByUserId: string | null;
  handledAt: string | null;
  createdAt: string;
  reporter: { email: string };
  targetUser: { email: string } | null;
  conversation: { caseId: string; case: { title: string } };
};

export default function AdminReportsPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [note, setNote] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});
  const isAdmin = viewer.user?.role === "ADMIN";

  function feedback(id: string, msg: string) {
    setRowMsg((m) => ({ ...m, [id]: msg }));
    setTimeout(() => setRowMsg((m) => { const n = { ...m }; delete n[id]; return n; }), 1800);
  }

  async function runAction(reportId: string, action: "review" | "resolve" | "dismiss" | "blacklist_target" | "clear_blacklist") {
    setActioning(reportId);
    try {
      const r = await fetch(`/api/marketplace/admin/reports/${reportId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNote: note[reportId]?.trim() || undefined }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "操作失败");
      setItems((prev) => prev.map((it) => it.id === reportId ? { ...it, ...(data.report ?? {}) } : it));
      feedback(reportId, "已处理");
    } catch (e) {
      feedback(reportId, e instanceof Error ? e.message : "操作失败");
    } finally {
      setActioning(null);
    }
  }

  async function runTemplate(reportId: string, template: "warning_only" | "temp_mute_24h" | "temp_mute_7d" | "global_blacklist_permanent") {
    setActioning(reportId);
    try {
      const r = await fetch(`/api/marketplace/admin/reports/${reportId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, adminNote: note[reportId]?.trim() || undefined }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "操作失败");
      setItems((prev) => prev.map((it) => (it.id === reportId ? { ...it, ...(data.report ?? {}) } : it)));
      feedback(reportId, "已套用处罚模板");
    } catch (e) {
      feedback(reportId, e instanceof Error ? e.message : "操作失败");
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
    if (category) params.set("category", category);
    if (q.trim()) params.set("q", q.trim());
    params.set("page", String(page));
    params.set("pageSize", "20");
    fetch(`/api/marketplace/admin/reports?${params.toString()}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d; })
      .then((d) => {
        setItems(d.items ?? []);
        setMeta({ page: d.filters?.page ?? 1, totalPages: d.filters?.totalPages ?? 1, total: d.filters?.total ?? 0 });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, status, category, q, page]);

  useEffect(() => setPage(1), [status, category, q]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">举报处理中心</h1>
            <p className="mt-2 text-sm text-slate-500">平台受理客户/律师举报，并执行审核、驳回、黑名单处理。</p>
          </div>
          <AdminTabs />
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部状态</option><option value="PENDING">PENDING</option><option value="REVIEWING">REVIEWING</option><option value="RESOLVED">RESOLVED</option><option value="DISMISSED">DISMISSED</option>
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部类型</option>{["HARASSMENT","SPAM","FRAUD","THREAT","INAPPROPRIATE","PRIVACY","OTHER"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索举报ID/会话ID/内容" className="min-w-[280px] rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <span className="text-sm text-slate-500">共 {meta.total} 条</span>
          </div>
          {loading && <p className="text-sm text-slate-500">加载举报中...</p>}
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <div className="grid gap-4">
            {items.map((r) => (
              <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{r.status}</span>
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">{r.category}</span>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">{r.reporterRole} 举报 {r.targetRole ?? "-"}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{r.conversation.case.title}</p>
                    <p className="mt-1 text-xs text-slate-500 break-all">Report: {r.id} · Conversation: {r.conversationId}</p>
                    <p className="mt-1 text-xs text-slate-500 break-all">举报人：{r.reporter.email} ({r.reporterUserId})</p>
                    <p className="mt-1 text-xs text-slate-500 break-all">被举报人：{r.targetUser?.email ?? "未知"} {r.targetUserId ? `(${r.targetUserId})` : ""}</p>
                    {r.reportedMessageId && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                        <p className="text-xs font-semibold text-amber-800">绑定举报消息</p>
                        <p className="mt-1 text-[11px] text-amber-700 break-all">Message ID: {r.reportedMessageId}</p>
                        {r.reportedMessageExcerpt && <p className="mt-1 text-xs text-amber-700 line-clamp-3">{r.reportedMessageExcerpt}</p>}
                      </div>
                    )}
                    {r.details && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{r.details}</p>}
                    {(r.evidenceSnapshot?.length ?? 0) > 0 && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-600">证据快照（{r.evidenceCount ?? r.evidenceSnapshot?.length} 条）</p>
                        <div className="mt-2 space-y-1">
                          {r.evidenceSnapshot!.slice(-5).map((m) => (
                            <div key={`${r.id}-${m.id}`} className="text-xs text-slate-700">
                              <span className="font-medium">{m.senderRole}</span>
                              <span className="mx-1 text-slate-400">·</span>
                              <span className="text-slate-500">{new Date(m.createdAt).toLocaleString()}</span>
                              <p className="mt-0.5 line-clamp-2 text-slate-600">{m.body}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(r.attachments?.length ?? 0) > 0 && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold text-slate-600">证据附件（{r.attachments.length} 个）</p>
                        <div className="mt-2 space-y-1">
                          {r.attachments.map((a) => (
                            <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0">
                                <p className="truncate text-slate-700">{a.fileName ?? a.id}</p>
                                <p className="text-slate-500">{a.mimeType ?? "file"} · {a.sizeBytes ? `${(a.sizeBytes / 1024).toFixed(1)} KB` : "-"}</p>
                              </div>
                              <a href={a.url} target="_blank" rel="noreferrer" className="underline text-slate-600">打开</a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {r.adminNote && <p className="mt-2 text-xs text-amber-700">管理员备注：{r.adminNote}</p>}
                    <div className="mt-2 flex gap-2 text-xs">
                      <Link href={`/marketplace/admin/conversations/${r.conversationId}`} className="underline">会话详情</Link>
                      <Link href={`/chat/${r.conversationId}`} className="underline">打开会话</Link>
                    </div>
                  </div>
                  <div className="flex min-w-[280px] flex-col gap-2">
                    <textarea rows={2} value={note[r.id] ?? ""} onChange={(e) => setNote((m) => ({ ...m, [r.id]: e.target.value }))} placeholder="处理备注（可选）" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={actioning === r.id} onClick={() => void runAction(r.id, "review")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">开始审核</button>
                      <button type="button" disabled={actioning === r.id} onClick={() => void runAction(r.id, "dismiss")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">驳回举报</button>
                      <button type="button" disabled={actioning === r.id} onClick={() => void runAction(r.id, "resolve")} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">标记已处理</button>
                      <button type="button" disabled={actioning === r.id} onClick={() => void runAction(r.id, "blacklist_target")} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">执行黑名单</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={actioning === r.id} onClick={() => void runTemplate(r.id, "warning_only")} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        警告模板
                      </button>
                      <button type="button" disabled={actioning === r.id} onClick={() => void runTemplate(r.id, "temp_mute_24h")} className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                        24h 会话禁言
                      </button>
                      <button type="button" disabled={actioning === r.id} onClick={() => void runTemplate(r.id, "temp_mute_7d")} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        7天 会话禁言
                      </button>
                      <button type="button" disabled={actioning === r.id} onClick={() => void runTemplate(r.id, "global_blacklist_permanent")} className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-xs text-purple-700">
                        永久全平台拉黑
                      </button>
                    </div>
                    <button type="button" disabled={actioning === r.id} onClick={() => void runAction(r.id, "clear_blacklist")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">解除举报方黑名单</button>
                    {rowMsg[r.id] && <p className="text-xs text-slate-600 text-center">{rowMsg[r.id]}</p>}
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
