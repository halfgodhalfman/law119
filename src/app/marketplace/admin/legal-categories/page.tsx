"use client";

import { useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

const CATEGORIES = ["IMMIGRATION", "CRIMINAL", "CIVIL", "REAL_ESTATE", "FAMILY", "BUSINESS", "ESTATE_PLAN", "LABOR", "TAX", "OTHER"] as const;

type Item = {
  id: string;
  category: string;
  slug: string;
  nameZh: string;
  nameEn: string;
  group: string | null;
  enabled: boolean;
  sortOrder: number;
  hot: boolean;
  homepageFeatured: boolean;
  homepageFeaturedOrder: number;
};

const emptyForm = {
  category: "IMMIGRATION",
  slug: "",
  nameZh: "",
  nameEn: "",
  group: "",
  enabled: true,
  sortOrder: 0,
  hot: false,
  homepageFeatured: false,
  homepageFeaturedOrder: 0,
};

export default function AdminLegalCategoriesPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const isAdmin = viewer.user?.role === "ADMIN";
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [enabled, setEnabled] = useState("");
  const [homepageOnly, setHomepageOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({ total: 0, enabled: 0, homepageFeatured: 0, hot: 0 });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (enabled) params.set("enabled", enabled);
    if (homepageOnly) params.set("homepageOnly", "1");
    const r = await fetch(`/api/marketplace/admin/legal-categories?${params.toString()}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setError(j.error || "加载失败");
    else {
      setItems(j.items ?? []);
      setSummary(j.summary ?? { total: 0, enabled: 0, homepageFeatured: 0, hot: 0 });
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    void load();
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [q, category, enabled, homepageOnly]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return [...map.entries()];
  }, [items]);

  async function submit() {
    setSaving(true);
    const method = editingId ? "PATCH" : "POST";
    const body = {
      ...(editingId ? { id: editingId } : {}),
      ...form,
      group: form.group?.trim() ? form.group.trim() : null,
    };
    const r = await fetch("/api/marketplace/admin/legal-categories", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
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
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin Legal Categories</h1>
            <p className="mt-2 text-sm text-slate-500">管理法律子类目启用状态、排序、热门与首页推荐配置。</p>
          </div>
          <AdminTabs />
          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}
          {isAdmin && (
            <>
              <div className="mb-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">总数 <span className="font-semibold">{summary.total}</span></div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">启用 <span className="font-semibold text-emerald-700">{summary.enabled}</span></div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">首页推荐 <span className="font-semibold text-indigo-700">{summary.homepageFeatured}</span></div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">热门 <span className="font-semibold text-rose-700">{summary.hot}</span></div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.05fr_1.6fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-900">{editingId ? "编辑子类目" : "新增子类目"}</h2>
                  <div className="mt-3 space-y-3">
                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm((f: any) => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="slug" value={form.slug} onChange={(e) => setForm((f: any) => ({ ...f, slug: e.target.value }))} />
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="中文名" value={form.nameZh} onChange={(e) => setForm((f: any) => ({ ...f, nameZh: e.target.value }))} />
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="英文名" value={form.nameEn} onChange={(e) => setForm((f: any) => ({ ...f, nameEn: e.target.value }))} />
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="分组（可选）" value={form.group} onChange={(e) => setForm((f: any) => ({ ...f, group: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-2">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f: any) => ({ ...f, enabled: e.target.checked }))} />启用</label>
                      <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"><input type="checkbox" checked={form.hot} onChange={(e) => setForm((f: any) => ({ ...f, hot: e.target.checked }))} />热门</label>
                      <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm col-span-2"><input type="checkbox" checked={form.homepageFeatured} onChange={(e) => setForm((f: any) => ({ ...f, homepageFeatured: e.target.checked }))} />首页推荐类目</label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="列表排序" value={form.sortOrder} onChange={(e) => setForm((f: any) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))} />
                      <input type="number" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="首页排序" value={form.homepageFeaturedOrder} onChange={(e) => setForm((f: any) => ({ ...f, homepageFeaturedOrder: Number(e.target.value) || 0 }))} />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" disabled={saving} onClick={() => void submit()} className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm text-indigo-700 disabled:opacity-50">{editingId ? "保存" : "创建"}</button>
                      <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">重置</button>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 grid gap-2 md:grid-cols-4">
                    <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="搜索 slug/名称/分组" value={q} onChange={(e) => setQ(e.target.value)} />
                    <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="">全部大类</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={enabled} onChange={(e) => setEnabled(e.target.value)}>
                      <option value="">全部状态</option>
                      <option value="true">启用</option>
                      <option value="false">停用</option>
                    </select>
                  </div>
                  <label className="mb-3 inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={homepageOnly} onChange={(e) => setHomepageOnly(e.target.checked)} />只看首页推荐</label>
                  {loading && <p className="text-sm text-slate-500">加载中...</p>}
                  {error && <p className="text-sm text-rose-700">{error}</p>}
                  <div className="space-y-4">
                    {grouped.map(([cat, rows]) => (
                      <div key={cat} className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2 text-sm font-semibold text-slate-900">{cat} <span className="text-xs text-slate-500">({rows.length})</span></div>
                        <div className="space-y-2">
                          {rows.map((row) => (
                            <div key={row.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-slate-900">{row.nameZh}</span>
                                <span className="text-xs text-slate-500">{row.nameEn}</span>
                                <span className="rounded-full bg-white px-2 py-0.5 text-xs border border-slate-200">{row.slug}</span>
                                {!row.enabled && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">停用</span>}
                                {row.hot && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">热门</span>}
                                {row.homepageFeatured && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">首页推荐 #{row.homepageFeaturedOrder}</span>}
                              </div>
                              <p className="mt-1 text-xs text-slate-500">分组：{row.group || "-"} / 排序：{row.sortOrder}</p>
                              <div className="mt-2 flex gap-2 flex-wrap">
                                <button type="button" onClick={() => { setEditingId(row.id); setForm({ ...row, group: row.group ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded border border-slate-300 px-2 py-1 text-xs">编辑</button>
                                <button type="button" onClick={async () => { await fetch('/api/marketplace/admin/legal-categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, enabled: !row.enabled }) }); await load(); }} className="rounded border border-slate-300 px-2 py-1 text-xs">{row.enabled ? "停用" : "启用"}</button>
                                <button type="button" onClick={async () => { await fetch('/api/marketplace/admin/legal-categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, homepageFeatured: !row.homepageFeatured }) }); await load(); }} className="rounded border border-slate-300 px-2 py-1 text-xs">{row.homepageFeatured ? "取消首页推荐" : "设为首页推荐"}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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
