"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";

type Milestone = { id: string; title: string; amount: string; status: string; sortOrder: number };
type PaymentOrder = {
  id: string;
  status: string;
  title: string;
  currency: string;
  amountTotal: string;
  amountHeld: string;
  amountReleased: string;
  amountRefunded: string;
  holdBlockedByDispute: boolean;
  holdBlockedReason: string | null;
  conversationId: string | null;
  caseId: string | null;
  createdAt: string;
  milestones: Milestone[];
  events: Array<{ id: string; type: string; createdAt: string }>;
};

export default function AdminPaymentsPage() {
  const [items, setItems] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const r = await fetch(`/api/marketplace/payments?${params.toString()}`, { cache: "no-store" });
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

  useEffect(() => { void load(); }, [status]);

  const act = async (id: string, action: string, milestoneId?: string) => {
    setActing(id);
    const r = await fetch(`/api/marketplace/payments/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, milestoneId }),
    });
    const j = await r.json().catch(() => ({}));
    setActing(null);
    if (!r.ok) {
      setRowMsg((m) => ({ ...m, [id]: j.error || "操作失败" }));
      return;
    }
    setRowMsg((m) => ({ ...m, [id]: "已更新" }));
    await load();
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">支付 / 托管工作台（MVP）</h1>
            <p className="mt-2 text-sm text-slate-500">仅实现规则与流程骨架：创建支付单、里程碑释放、争议阻断、退款流程状态。</p>
          </div>
          <AdminTabs />
          <div className="mb-4 flex gap-2 items-center">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部状态</option>
              {["UNPAID","PENDING_PAYMENT","PAID_HELD","PARTIALLY_RELEASED","RELEASED","REFUND_PENDING","REFUNDED","CHARGEBACK_REVIEW","CANCELED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {loading && <p className="text-sm text-slate-500">加载支付单中...</p>}
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <div className="grid gap-4">
            {items.map((o) => (
              <article key={o.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${o.holdBlockedByDispute ? "border-rose-300" : "border-slate-200"}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{o.status}</span>
                      {o.holdBlockedByDispute && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">争议阻断</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{o.title}</p>
                    <p className="mt-1 text-xs text-slate-500">Order {o.id} · {o.currency} {o.amountTotal}</p>
                    <p className="mt-1 text-xs text-slate-500">Held {o.amountHeld} · Released {o.amountReleased} · Refunded {o.amountRefunded}</p>
                    {o.holdBlockedReason && <p className="mt-1 text-xs text-rose-700">{o.holdBlockedReason}</p>}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {o.caseId && <Link href={`/marketplace/admin/cases/${o.caseId}`} className="underline">案件详情</Link>}
                      {o.conversationId && <Link href={`/chat/${o.conversationId}`} className="underline">打开会话</Link>}
                    </div>
                    {o.milestones.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {o.milestones.map((m) => (
                          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2 text-xs">
                            <div><span className="font-medium">{m.sortOrder + 1}. {m.title}</span> · {o.currency} {m.amount} · {m.status}</div>
                            <div className="flex gap-2">
                              {m.status !== "READY_FOR_RELEASE" && <button type="button" disabled={acting === o.id} onClick={() => void act(o.id, "request_milestone_release", m.id)} className="rounded border border-slate-300 px-2 py-1">请求释放</button>}
                              {m.status !== "RELEASED" && <button type="button" disabled={acting === o.id} onClick={() => void act(o.id, "release_milestone", m.id)} className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-700">释放</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-full lg:w-[220px] space-y-2">
                    <button type="button" disabled={acting === o.id} onClick={() => void act(o.id, "mark_paid_held")} className="w-full rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-700">标记已支付并托管</button>
                    <button type="button" disabled={acting === o.id} onClick={() => void act(o.id, "admin_hold")} className="w-full rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">管理员冻结</button>
                    <button type="button" disabled={acting === o.id} onClick={() => void act(o.id, "admin_release_hold")} className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">解除冻结</button>
                    <button type="button" disabled={acting === o.id} onClick={() => void act(o.id, "refund_request")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs">发起退款</button>
                    <button type="button" disabled={acting === o.id} onClick={() => void act(o.id, "refund_complete")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs">完成退款</button>
                    {rowMsg[o.id] && <p className="text-center text-xs text-slate-600">{rowMsg[o.id]}</p>}
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

