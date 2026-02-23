"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type Ticket = {
  id: string;
  status: string;
  priority: string;
  category: string;
  title: string;
  assignedAdminUserId: string | null;
  slaDueAt: string | null;
  firstResponseAt: string | null;
  createdAt: string;
  updatedAt: string;
  conversationId: string | null;
  caseId: string | null;
  bidId: string | null;
  createdBy: { email: string; role: string };
  assignedAdmin: { email: string } | null;
};

type Template = { code: string; title: string; body: string };

export default function AdminDisputesPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [items, setItems] = useState<Ticket[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [internalNote, setInternalNote] = useState<Record<string, boolean>>({});
  const [replying, setReplying] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const isAdmin = viewer.user?.role === "ADMIN";

  function toast(id: string, msg: string) {
    setRowMsg((m) => ({ ...m, [id]: msg }));
    setTimeout(() => setRowMsg((m) => { const n = { ...m }; delete n[id]; return n; }), 1800);
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    params.set("page", String(page));
    params.set("pageSize", "20");
    const r = await fetch(`/api/marketplace/admin/disputes?${params.toString()}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || "加载失败");
      setLoading(false);
      return;
    }
    setItems(j.items ?? []);
    setTemplates(j.templates ?? []);
    setMeta({ page: j.filters?.page ?? 1, totalPages: j.filters?.totalPages ?? 1, total: j.filters?.total ?? 0 });
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { setLoading(false); return; }
    void load();
  }, [authLoading, isAdmin, status, q, page]);

  useEffect(() => setPage(1), [status, q]);

  async function updateTicket(id: string, body: Record<string, unknown>) {
    setUpdating(id);
    try {
      const r = await fetch(`/api/marketplace/disputes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "更新失败");
      await load();
      toast(id, "已更新");
    } catch (e) {
      toast(id, e instanceof Error ? e.message : "更新失败");
    } finally {
      setUpdating(null);
    }
  }

  async function sendReply(id: string, body: string, isTemplate = false) {
    setReplying(id);
    try {
      const r = await fetch(`/api/marketplace/disputes/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, isTemplate, isInternalNote: internalNote[id] ?? false }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "发送失败");
      setReplyText((m) => ({ ...m, [id]: "" }));
      await load();
      toast(id, "已发送回复");
    } catch (e) {
      toast(id, e instanceof Error ? e.message : "发送失败");
    } finally {
      setReplying(null);
    }
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">争议工单处理中心</h1>
            <p className="mt-2 text-sm text-slate-500">客服介入、工单状态、SLA 与模板回复工作台。</p>
          </div>
          <AdminTabs />
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部状态</option>
              {["OPEN","UNDER_REVIEW","WAITING_PARTY","RESOLVED","CLOSED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索工单ID/标题/Case/Bid/Conversation" className="min-w-[320px] rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <span className="text-sm text-slate-500">共 {meta.total} 条</span>
          </div>
          {loading && <p className="text-sm text-slate-500">加载工单中...</p>}
          {error && <p className="text-sm text-rose-700">{error}</p>}

          <div className="grid gap-4">
            {items.map((t) => {
              const slaOverdue = t.slaDueAt && new Date(t.slaDueAt).getTime() < Date.now() && !["RESOLVED","CLOSED"].includes(t.status);
              return (
                <article key={t.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${slaOverdue ? "border-rose-300" : "border-slate-200"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{t.status}</span>
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">{t.priority}</span>
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">{t.category}</span>
                        {slaOverdue && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">SLA 已超时</span>}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                      <p className="mt-1 text-xs text-slate-500">Ticket {t.id} · 发起人 {t.createdBy.email} ({t.createdBy.role})</p>
                      <p className="mt-1 text-xs text-slate-500">
                        SLA: {t.slaDueAt ? new Date(t.slaDueAt).toLocaleString() : "未设置"} · 首响: {t.firstResponseAt ? new Date(t.firstResponseAt).toLocaleString() : "未响应"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Link href={`/marketplace/disputes/${t.id}`} className="underline">工单详情</Link>
                        {t.conversationId && <Link href={`/chat/${t.conversationId}`} className="underline">打开会话</Link>}
                        {t.caseId && <Link href={`/marketplace/admin/cases/${t.caseId}`} className="underline">案件详情</Link>}
                        {t.bidId && <Link href={`/marketplace/admin/bids/${t.bidId}`} className="underline">报价详情</Link>}
                      </div>
                    </div>
                    <div className="w-full lg:w-[420px] space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" disabled={updating === t.id} onClick={() => void updateTicket(t.id, { status: "UNDER_REVIEW" })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs">开始处理</button>
                        <button type="button" disabled={updating === t.id} onClick={() => void updateTicket(t.id, { status: "WAITING_PARTY" })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs">待当事人回复</button>
                        <button type="button" disabled={updating === t.id} onClick={() => void updateTicket(t.id, { status: "RESOLVED" })} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">标记已解决</button>
                        <button type="button" disabled={updating === t.id} onClick={() => void updateTicket(t.id, { status: "CLOSED" })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs">关闭工单</button>
                      </div>

                      <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                        defaultValue=""
                        onChange={(e) => {
                          const tpl = templates.find((x) => x.code === e.target.value);
                          if (!tpl) return;
                          setReplyText((m) => ({ ...m, [t.id]: tpl.body }));
                          e.currentTarget.value = "";
                        }}
                      >
                        <option value="">选择模板回复...</option>
                        {templates.map((tpl) => <option key={tpl.code} value={tpl.code}>{tpl.title}</option>)}
                      </select>

                      <textarea
                        rows={3}
                        value={replyText[t.id] ?? ""}
                        onChange={(e) => setReplyText((m) => ({ ...m, [t.id]: e.target.value }))}
                        placeholder="输入客服回复或内部备注..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <input type="checkbox" checked={internalNote[t.id] ?? false} onChange={(e) => setInternalNote((m) => ({ ...m, [t.id]: e.target.checked }))} />
                        作为内部备注（仅管理员可见）
                      </label>
                      <button type="button" disabled={replying === t.id || !(replyText[t.id] ?? "").trim()} onClick={() => void sendReply(t.id, (replyText[t.id] ?? "").trim(), false)} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                        {replying === t.id ? "发送中..." : "发送回复 / 备注"}
                      </button>
                      {rowMsg[t.id] && <p className="text-center text-xs text-slate-600">{rowMsg[t.id]}</p>}
                    </div>
                  </div>
                </article>
              );
            })}
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

