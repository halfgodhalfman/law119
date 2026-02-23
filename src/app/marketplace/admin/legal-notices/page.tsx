"use client";

import { useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

const NOTICE_TYPES = ["TERMS", "PRIVACY", "ATTORNEY_TERMS", "CLIENT_TERMS", "ADVERTISING_DISCLAIMER"] as const;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

type NoticeItem = {
  id: string;
  noticeType: string;
  title: string;
  versionLabel: string;
  bodyMarkdown: string;
  summary: string | null;
  status: string;
  effectiveAt: string | null;
  publishedAt: string | null;
  supersedesId: string | null;
  createdAt: string;
  updatedAt: string;
  supersedes?: { id: string; versionLabel: string; noticeType: string } | null;
};

const emptyForm = {
  noticeType: "TERMS",
  title: "",
  versionLabel: "v1.0",
  bodyMarkdown: "",
  summary: "",
  status: "DRAFT",
  effectiveAt: "",
  supersedesId: "",
};

export default function AdminLegalNoticesPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const isAdmin = viewer.user?.role === "ADMIN";
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (typeFilter) p.set("noticeType", typeFilter);
    if (statusFilter) p.set("status", statusFilter);
    if (q.trim()) p.set("q", q.trim());
    const r = await fetch(`/api/marketplace/admin/legal-notices?${p.toString()}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setError(j.error || "加载失败");
    else { setItems(j.items ?? []); setError(null); }
    setLoading(false);
  }

  useEffect(() => { if (!authLoading && isAdmin) void load(); }, [authLoading, isAdmin]);
  useEffect(() => { if (!isAdmin) return; const t = setTimeout(() => void load(), 180); return () => clearTimeout(t); }, [typeFilter, statusFilter, q]);

  const optionsForSupersedes = useMemo(
    () => items.filter((n) => n.noticeType === form.noticeType && n.id !== editingId),
    [items, form.noticeType, editingId]
  );

  async function submit() {
    const method = editingId ? "PATCH" : "POST";
    const body = {
      ...(editingId ? { id: editingId } : {}),
      ...form,
      summary: form.summary?.trim() ? form.summary.trim() : null,
      effectiveAt: form.effectiveAt ? new Date(form.effectiveAt).toISOString() : null,
      supersedesId: form.supersedesId || null,
    };
    const r = await fetch("/api/marketplace/admin/legal-notices", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return alert(j.error || "保存失败");
    setEditingId(null);
    setForm(emptyForm);
    await load();
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin Legal Notices</h1>
            <p className="mt-2 text-sm text-slate-500">维护风险文案/免责声明版本，支持草稿、发布、归档与版本衔接。</p>
          </div>
          <AdminTabs />
          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}
          {isAdmin && (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1.5fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">{editingId ? "编辑版本" : "新建版本"}</h2>
                <div className="mt-3 space-y-3">
                  <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.noticeType} onChange={(e)=>setForm((f:any)=>({ ...f, noticeType: e.target.value, supersedesId: '' }))}>
                    {NOTICE_TYPES.map((t)=><option key={t} value={t}>{t}</option>)}
                  </select>
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="标题" value={form.title} onChange={(e)=>setForm((f:any)=>({ ...f, title: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="版本号，如 v1.1" value={form.versionLabel} onChange={(e)=>setForm((f:any)=>({ ...f, versionLabel: e.target.value }))} />
                    <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.status} onChange={(e)=>setForm((f:any)=>({ ...f, status: e.target.value }))}>
                      {STATUSES.map((s)=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} placeholder="版本说明（summary）" value={form.summary} onChange={(e)=>setForm((f:any)=>({ ...f, summary: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.effectiveAt} onChange={(e)=>setForm((f:any)=>({ ...f, effectiveAt: e.target.value }))} />
                    <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.supersedesId} onChange={(e)=>setForm((f:any)=>({ ...f, supersedesId: e.target.value }))}>
                      <option value="">不指定 supersedes</option>
                      {optionsForSupersedes.map((n)=><option key={n.id} value={n.id}>{n.versionLabel} ({n.status})</option>)}
                    </select>
                  </div>
                  <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" rows={10} placeholder="Markdown 正文" value={form.bodyMarkdown} onChange={(e)=>setForm((f:any)=>({ ...f, bodyMarkdown: e.target.value }))} />
                  <div className="flex gap-2">
                    <button type="button" onClick={()=>void submit()} className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">{editingId ? "保存版本" : "创建版本"}</button>
                    <button type="button" onClick={()=>{ setEditingId(null); setForm(emptyForm); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">重置</button>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 grid gap-2 md:grid-cols-4">
                  <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="搜索标题/版本/正文" value={q} onChange={(e)=>setQ(e.target.value)} />
                  <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value)}>
                    <option value="">全部文案类型</option>{NOTICE_TYPES.map((t)=><option key={t} value={t}>{t}</option>)}
                  </select>
                  <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
                    <option value="">全部状态</option>{STATUSES.map((s)=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {loading && <p className="text-sm text-slate-500">加载中...</p>}
                {error && <p className="text-sm text-rose-700">{error}</p>}
                <div className="space-y-3">
                  {items.map((n)=> (
                    <div key={n.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{n.noticeType}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${n.status==='PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : n.status==='DRAFT' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{n.status}</span>
                        <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs">{n.versionLabel}</span>
                        {n.supersedes && <span className="text-xs text-slate-500">supersedes {n.supersedes.versionLabel}</span>}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{n.title}</p>
                      {n.summary && <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap">{n.summary}</p>}
                      <p className="mt-1 text-xs text-slate-500">生效：{n.effectiveAt ? new Date(n.effectiveAt).toLocaleString() : '-'} / 发布：{n.publishedAt ? new Date(n.publishedAt).toLocaleString() : '-'}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" onClick={()=>{ setEditingId(n.id); setForm({ noticeType: n.noticeType, title: n.title, versionLabel: n.versionLabel, bodyMarkdown: n.bodyMarkdown, summary: n.summary ?? '', status: n.status, effectiveAt: n.effectiveAt ? new Date(n.effectiveAt).toISOString().slice(0,16) : '', supersedesId: n.supersedesId ?? '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="rounded border border-slate-300 px-2 py-1 text-xs">编辑</button>
                        {n.status !== 'PUBLISHED' && (
                          <button type="button" onClick={async()=>{ await fetch('/api/marketplace/admin/legal-notices', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: n.id, status: 'PUBLISHED' }) }); await load(); }} className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">发布此版本</button>
                        )}
                        {n.status !== 'ARCHIVED' && (
                          <button type="button" onClick={async()=>{ await fetch('/api/marketplace/admin/legal-notices', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: n.id, status: 'ARCHIVED' }) }); await load(); }} className="rounded border border-slate-300 px-2 py-1 text-xs">归档</button>
                        )}
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-slate-600">查看正文预览（前 400 字）</summary>
                        <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-700">{n.bodyMarkdown.slice(0, 400)}{n.bodyMarkdown.length > 400 ? '\n...' : ''}</pre>
                      </details>
                    </div>
                  ))}
                  {!loading && items.length === 0 && <p className="text-xs text-slate-500">暂无版本。</p>}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
