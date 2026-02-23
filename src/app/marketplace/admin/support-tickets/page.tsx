"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  updatedAt: string;
  createdBy: { email: string };
  assignedAdmin: { email: string } | null;
  messages: Array<{ senderRole: string; body: string; createdAt: string; isInternalNote: boolean }>;
};

export default function AdminSupportTicketsPage() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const r = await fetch(`/api/marketplace/support-tickets?${params.toString()}`, { cache: "no-store" });
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
  }, [status]);

  const act = async (id: string, patch: Record<string, unknown>, label: string) => {
    const r = await fetch(`/api/marketplace/support-tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setRowMsg((m) => ({ ...m, [id]: j.error || "操作失败" }));
      return;
    }
    setRowMsg((m) => ({ ...m, [id]: `${label}成功` }));
    await load();
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">客服消息单处理中心</h1>
            <p className="mt-2 text-sm text-slate-500">处理客户非争议类问题：账号、账单、平台使用、流程咨询等。</p>
          </div>
          <AdminTabs />
          <div className="mb-4">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部状态</option>
              {["OPEN","PENDING_PLATFORM","PENDING_CLIENT","RESOLVED","CLOSED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <div className="space-y-4">
            {items.map((t) => (
              <article key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{t.status}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">{t.priority}</span>
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700">{t.category}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{t.subject}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      用户：{t.createdBy.email} · 更新时间：{new Date(t.updatedAt).toLocaleString()}
                    </p>
                    {t.messages[0] && <p className="mt-2 line-clamp-2 text-xs text-slate-600">{t.messages[0].body}</p>}
                    <div className="mt-2 text-xs">
                      <Link href={`/marketplace/admin/support-tickets/${t.id}`} className="underline">进入详情处理</Link>
                    </div>
                  </div>
                  <div className="w-full space-y-2 sm:w-[220px]">
                    <button type="button" onClick={() => void act(t.id, { status: "PENDING_CLIENT" }, "设为待客户回复")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs">待客户回复</button>
                    <button type="button" onClick={() => void act(t.id, { status: "RESOLVED" }, "设为已解决")} className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">标记已解决</button>
                    <button type="button" onClick={() => void act(t.id, { status: "CLOSED" }, "设为已关闭")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs">关闭工单</button>
                    {rowMsg[t.id] && <p className="text-center text-xs text-slate-600">{rowMsg[t.id]}</p>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

