"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { ClientTabs } from "@/components/client/client-tabs";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  updatedAt: string;
  latestMessageAt: string | null;
  slaDueAt: string | null;
  messages: Array<{ id: string; senderRole: string; body: string; createdAt: string; isInternalNote: boolean }>;
};

export default function SupportTicketsPage() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "GENERAL", priority: "MEDIUM", body: "" });

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/marketplace/support-tickets", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || "加载客服消息单失败");
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
    if (!form.subject.trim() || !form.body.trim()) return;
    setCreating(true);
    const r = await fetch("/api/marketplace/support-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await r.json().catch(() => ({}));
    setCreating(false);
    if (!r.ok) {
      setMsg(j.error || "创建失败");
      return;
    }
    setMsg("客服消息单已创建");
    setForm({ subject: "", category: "GENERAL", priority: "MEDIUM", body: "" });
    await load();
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <ClientTabs />
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Support Tickets</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">站内联系客服消息单</h1>
              <p className="mt-2 text-sm text-slate-500">非争议场景下，向平台客服/管理员提交问题并持续跟进回复。</p>
            </div>
            <div className="flex gap-2">
              <Link href="/marketplace/support-center" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">支持中心</Link>
              <Link href="/marketplace/client-center" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">客户后台</Link>
            </div>
          </div>

          {msg && <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{msg}</div>}
          {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">新建客服消息单</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="问题主题（例如：账号登录异常）" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-3" />
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {["GENERAL","ACCOUNT","BILLING","CASE_PROCESS","PLATFORM_FEEDBACK","SAFETY","OTHER"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {["LOW","MEDIUM","HIGH","URGENT"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <button type="button" onClick={() => void createTicket()} disabled={creating} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {creating ? "提交中..." : "提交给平台"}
              </button>
              <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={4} placeholder="请描述你的问题、发生时间、影响范围、你希望平台如何协助..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-3" />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">我的客服消息单</h2>
            {loading ? (
              <p className="mt-3 text-sm text-slate-500">加载中...</p>
            ) : (
              <div className="mt-3 space-y-3">
                {items.map((t) => (
                  <article key={t.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{t.status}</span>
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">{t.priority}</span>
                          <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700">{t.category}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{t.subject}</p>
                        <p className="mt-1 text-xs text-slate-500">更新时间：{new Date(t.updatedAt).toLocaleString()}</p>
                        {t.slaDueAt && (
                          <p className="mt-1 text-xs text-amber-700">SLA 截止：{new Date(t.slaDueAt).toLocaleString()}</p>
                        )}
                        {t.messages[0] && <p className="mt-2 line-clamp-2 text-xs text-slate-600">{t.messages[0].body}</p>}
                      </div>
                      <Link href={`/marketplace/support-tickets/${t.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">
                        查看详情并回复
                      </Link>
                    </div>
                  </article>
                ))}
                {!items.length && <p className="text-sm text-slate-500">暂无客服消息单。</p>}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
