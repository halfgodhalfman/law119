"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";

type Ticket = {
  id: string;
  status: string;
  priority: string;
  category: string;
  title: string;
  conversationId: string | null;
  caseId: string | null;
  bidId: string | null;
  slaDueAt: string | null;
  firstResponseAt: string | null;
  createdAt: string;
};

export default function DisputesPage() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    conversationId: "",
    category: "沟通争议",
    priority: "MEDIUM",
    title: "",
    description: "",
  });

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/marketplace/disputes", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || "加载失败");
      setLoading(false);
      return;
    }
    setItems(j.items ?? []);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const createTicket = async () => {
    setMsg(null);
    const r = await fetch("/api/marketplace/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: form.conversationId.trim() || undefined,
        category: form.category,
        priority: form.priority,
        title: form.title,
        description: form.description,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error || "创建失败");
      return;
    }
    setMsg(`工单已创建：${j.ticket.id}`);
    setForm((f) => ({ ...f, title: "", description: "" }));
    await load();
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Dispute Tickets</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">争议工单 / 平台客服介入</h1>
            <p className="mt-2 text-sm text-slate-500">用于处理付款争议、沟通冲突、服务范围争议、风控投诉等问题。</p>
          </div>

          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">发起争议工单</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-slate-700">会话 ID（推荐）</span>
                <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.conversationId} onChange={(e) => setForm((f) => ({ ...f, conversationId: e.target.value }))} placeholder="可从 /chat/<conversationId> 获取" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-700">优先级</span>
                <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                  {["LOW","MEDIUM","HIGH","URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-slate-700">类别</span>
                <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-slate-700">标题</span>
                <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="例如：律师/客户服务范围与报价不一致" />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-slate-700">详情说明</span>
                <textarea rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="请描述争议经过、涉及金额、时间点、希望平台处理方式..." />
              </label>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">平台会按 SLA 处理并在工单内回复。紧急情况请同步报警或联系当地监管部门。</p>
              <button type="button" onClick={() => void createTicket()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">提交工单</button>
            </div>
            {msg && <p className="mt-3 text-sm text-slate-700">{msg}</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">我的工单</h2>
            {loading && <p className="mt-3 text-sm text-slate-500">加载中...</p>}
            {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
            <div className="mt-4 space-y-3">
              {items.map((t) => (
                <article key={t.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{t.status}</span>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">{t.priority}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">{t.category}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{t.title}</p>
                  <p className="mt-1 text-xs text-slate-500">Ticket {t.id} · 创建于 {new Date(t.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-slate-500">SLA: {t.slaDueAt ? new Date(t.slaDueAt).toLocaleString() : "未设置"} · 首响: {t.firstResponseAt ? new Date(t.firstResponseAt).toLocaleString() : "未响应"}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Link href={`/marketplace/disputes/${t.id}`} className="underline">查看工单详情</Link>
                    {t.conversationId && <Link href={`/chat/${t.conversationId}`} className="underline">打开会话</Link>}
                  </div>
                </article>
              ))}
              {!loading && items.length === 0 && <p className="text-sm text-slate-500">暂无工单。</p>}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

