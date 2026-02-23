"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

const AUDIENCES = ["GENERAL", "CLIENT", "ATTORNEY"] as const;
type FaqItem = {
  id: string;
  audience: string;
  category: string | null;
  question: string;
  answer: string;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  updatedAt: string;
};

const emptyForm = { audience: "GENERAL", category: "", question: "", answer: "", active: true, featured: false, sortOrder: 0 };

export default function AdminFaqPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const isAdmin = viewer.user?.role === "ADMIN";
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audienceFilter, setAudienceFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<any>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (audienceFilter) p.set("audience", audienceFilter);
    if (activeFilter) p.set("active", activeFilter);
    if (q.trim()) p.set("q", q.trim());
    const r = await fetch(`/api/marketplace/admin/faqs?${p.toString()}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setError(j.error || "加载失败");
    else { setItems(j.items ?? []); setError(null); }
    setLoading(false);
  }

  useEffect(() => { if (!authLoading && isAdmin) void load(); }, [authLoading, isAdmin]);
  useEffect(() => { if (!isAdmin) return; const t = setTimeout(() => void load(), 180); return () => clearTimeout(t); }, [audienceFilter, activeFilter, q]);

  async function submit() {
    const method = editingId ? "PATCH" : "POST";
    const body = editingId ? { id: editingId, ...form, category: form.category || null } : { ...form, category: form.category || null };
    const r = await fetch("/api/marketplace/admin/faqs", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return alert(j.error || "保存失败");
    setForm(emptyForm); setEditingId(null); await load();
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin FAQ</h1>
            <p className="mt-2 text-sm text-slate-500">维护 FAQ、启用停用、排序与首页精选（featured）。</p>
          </div>
          <AdminTabs />
          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}
          {isAdmin && (
            <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold">{editingId ? "编辑 FAQ" : "新增 FAQ"}</h2>
                <div className="mt-3 space-y-3">
                  <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.audience} onChange={(e) => setForm((f:any)=>({ ...f, audience: e.target.value }))}>
                    {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="分类（可选，如 billing / disputes / case-posting）" value={form.category} onChange={(e)=>setForm((f:any)=>({ ...f, category: e.target.value }))} />
                  <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} placeholder="问题" value={form.question} onChange={(e)=>setForm((f:any)=>({ ...f, question: e.target.value }))} />
                  <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={6} placeholder="答案" value={form.answer} onChange={(e)=>setForm((f:any)=>({ ...f, answer: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e)=>setForm((f:any)=>({ ...f, active: e.target.checked }))} />启用</label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e)=>setForm((f:any)=>({ ...f, featured: e.target.checked }))} />精选</label>
                  </div>
                  <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.sortOrder} onChange={(e)=>setForm((f:any)=>({ ...f, sortOrder: Number(e.target.value)||0 }))} />
                  <div className="flex gap-2">
                    <button type="button" onClick={()=>void submit()} className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">{editingId ? "保存" : "创建"}</button>
                    <button type="button" onClick={()=>{ setEditingId(null); setForm(emptyForm); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">重置</button>
                  </div>
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 grid gap-2 md:grid-cols-4">
                  <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="搜索问题/答案/分类" value={q} onChange={(e)=>setQ(e.target.value)} />
                  <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={audienceFilter} onChange={(e)=>setAudienceFilter(e.target.value)}>
                    <option value="">全部对象</option>{AUDIENCES.map((a)=><option key={a} value={a}>{a}</option>)}
                  </select>
                  <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={activeFilter} onChange={(e)=>setActiveFilter(e.target.value)}>
                    <option value="">全部状态</option><option value="true">启用</option><option value="false">停用</option>
                  </select>
                </div>
                {loading && <p className="text-sm text-slate-500">加载中...</p>}
                {error && <p className="text-sm text-rose-700">{error}</p>}
                <div className="space-y-3">
                  {items.map((it) => (
                    <div key={it.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{it.audience}</span>
                        {it.category && <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs">{it.category}</span>}
                        {it.featured && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">精选</span>}
                        <span className={`rounded-full px-2 py-0.5 text-xs ${it.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{it.active ? '启用' : '停用'}</span>
                        <span className="text-xs text-slate-500">sort {it.sortOrder}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-900">{it.question}</p>
                      <p className="mt-1 line-clamp-3 text-xs text-slate-600 whitespace-pre-wrap">{it.answer}</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={()=>{ setEditingId(it.id); setForm({ ...it, category: it.category ?? '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="rounded border border-slate-300 px-2 py-1 text-xs">编辑</button>
                        <button type="button" onClick={async()=>{ await fetch('/api/marketplace/admin/faqs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id, active: !it.active }) }); await load(); }} className="rounded border border-slate-300 px-2 py-1 text-xs">{it.active ? '停用' : '启用'}</button>
                      </div>
                    </div>
                  ))}
                  {!loading && items.length === 0 && <p className="text-xs text-slate-500">暂无 FAQ。</p>}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
