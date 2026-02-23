"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type ReplyTemplateItem = {
  id: string;
  scene: string;
  title: string;
  body: string;
  active: boolean;
  sortOrder: number;
  updatedAt: string;
};

const emptyForm = { scene: "support_ticket_reply", title: "", body: "", active: true, sortOrder: 0 };

export default function ReplyTemplatesPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const isAdmin = viewer.user?.role === "ADMIN";
  const [items, setItems] = useState<ReplyTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/marketplace/admin/reply-templates");
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || "加载失败");
    } else {
      setItems(j.items ?? []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    void load();
  }, [authLoading, isAdmin]);

  const submit = async () => {
    const method = editingId ? "PATCH" : "POST";
    const body = editingId ? { id: editingId, ...form } : form;
    const r = await fetch("/api/marketplace/admin/reply-templates", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(j.error || "保存失败");
      return;
    }
    setEditingId(null);
    setForm(emptyForm);
    await load();
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">ReplyTemplate 模板库</h1>
            <p className="mt-2 text-sm text-slate-500">按场景管理模板回复（举报、争议、客服消息单）。</p>
          </div>
          <AdminTabs />
          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}

          {isAdmin && (
            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">{editingId ? "编辑模板" : "新建模板"}</h2>
                <div className="mt-3 space-y-3">
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="scene，例如 support_ticket_reply / dispute_handling / report_review" value={form.scene} onChange={(e) => setForm((f: any) => ({ ...f, scene: e.target.value }))} />
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="标题" value={form.title} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} />
                  <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={6} placeholder="模板正文" value={form.body} onChange={(e) => setForm((f: any) => ({ ...f, body: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.sortOrder} onChange={(e) => setForm((f: any) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))} />
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <input type="checkbox" checked={form.active} onChange={(e) => setForm((f: any) => ({ ...f, active: e.target.checked }))} />
                      启用
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void submit()} className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">{editingId ? "保存修改" : "创建模板"}</button>
                    <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">重置</button>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">模板列表</h2>
                {loading && <p className="mt-3 text-sm text-slate-500">加载中...</p>}
                {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
                <div className="mt-3 space-y-3">
                  {items.map((t) => (
                    <div key={t.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{t.scene}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${t.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{t.active ? "启用" : "停用"}</span>
                        <span className="text-xs text-slate-500">sort {t.sortOrder}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900">{t.title}</p>
                      <p className="mt-1 line-clamp-3 text-xs text-slate-600">{t.body}</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => { setEditingId(t.id); setForm({ scene: t.scene, title: t.title, body: t.body, active: t.active, sortOrder: t.sortOrder }); }} className="rounded border border-slate-300 px-2 py-1 text-xs">编辑</button>
                        <button type="button" onClick={async () => { await navigator.clipboard.writeText(t.body); }} className="rounded border border-slate-300 px-2 py-1 text-xs">复制正文</button>
                      </div>
                    </div>
                  ))}
                  {!loading && items.length === 0 && <p className="text-xs text-slate-500">暂无模板。</p>}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

