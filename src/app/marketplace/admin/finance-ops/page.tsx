"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";

type FinanceOrder = any;

export default function AdminFinanceOpsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<FinanceOrder[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [reconciliationStatus, setReconciliationStatus] = useState(searchParams.get("reconciliationStatus") ?? "");
  const [holdOnly, setHoldOnly] = useState(searchParams.get("holdOnly") === "1");
  const [actionNote, setActionNote] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (status) p.set("status", status);
    if (reconciliationStatus) p.set("reconciliationStatus", reconciliationStatus);
    if (holdOnly) p.set("holdOnly", "1");
    return p.toString();
  }, [q, status, reconciliationStatus, holdOnly]);

  useEffect(() => {
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [queryString, pathname, router]);

  async function load() {
    setLoading(true);
    setError(null);
    const r = await fetch(`/api/marketplace/admin/finance-ops?${queryString}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      setItems(j.items ?? []);
      setSummary(j.summary ?? {});
    } else {
      setError(j.error || "加载失败");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [status, reconciliationStatus, holdOnly]);

  async function act(orderId: string, payload: any) {
    const actionName = String(payload?.action ?? "");
    const needConfirm = ["admin_release_hold", "refund_complete", "set_reconciliation_status"].includes(actionName);
    if (needConfirm && !window.confirm(`确认执行 ${actionName} ?`)) return;
    setActing(orderId);
    const r = await fetch(`/api/marketplace/payments/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, note: payload.note ?? (actionNote.trim() || undefined) }),
    });
    const j = await r.json().catch(() => ({}));
    setActing(null);
    setRowMsg((m) => ({ ...m, [orderId]: r.ok ? "已更新" : (j.error || "操作失败") }));
    if (r.ok) await load();
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin Finance Ops</h1>
            <p className="mt-2 text-sm text-slate-500">对账、冻结原因、退款审批与里程碑释放审核的财务运营总览。</p>
          </div>
          <AdminTabs />

          <div className="mb-4 grid gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">支付单 <b>{summary.total ?? 0}</b></div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm">冻结中 <b>{summary.holdBlocked ?? 0}</b></div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">退款待审 <b>{summary.refundPendingReview ?? 0}</b></div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">释放待审 <b>{summary.payoutReviewPending ?? 0}</b></div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">未对账/异常 <b>{summary.unreconciled ?? 0}</b></div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[260px]" placeholder="搜索订单/标题/Case/会话/hold原因" value={q} onChange={(e)=>setQ(e.target.value)} />
            <button type="button" onClick={()=>void load()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">搜索</button>
            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">全部支付状态</option>{["UNPAID","PENDING_PAYMENT","PAID_HELD","PARTIALLY_RELEASED","RELEASED","REFUND_PENDING","REFUNDED","CHARGEBACK_REVIEW","CANCELED"].map((s)=><option key={s} value={s}>{s}</option>)}</select>
            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={reconciliationStatus} onChange={(e)=>setReconciliationStatus(e.target.value)}><option value="">全部对账状态</option>{["UNRECONCILED","MATCHED","MANUAL_REVIEW","MISMATCH","RECONCILED"].map((s)=><option key={s} value={s}>{s}</option>)}</select>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={holdOnly} onChange={(e)=>setHoldOnly(e.target.checked)} />只看冻结</label>
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[220px]" placeholder="操作备注（写入审计）" value={actionNote} onChange={(e)=>setActionNote(e.target.value)} />
            <button type="button" onClick={()=>void load()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">刷新</button>
            <a className="rounded-lg border border-slate-300 px-3 py-2 text-sm" href={`/api/marketplace/admin/finance-ops?${queryString}${queryString ? '&' : ''}format=csv`}>导出财务记录 CSV</a>
            <Link href="/marketplace/admin/payout-review-queue" className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700">Payout Review Queue</Link>
            <Link href="/marketplace/admin/refund-review-queue" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">Refund Review Queue</Link>
          </div>

          {error && <p className="mb-3 text-sm text-rose-700">{error}</p>}
          {loading ? <p className="text-sm text-slate-500">加载中...</p> : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">暂无符合筛选条件的财务记录。</div>
          ) : (
            <div className="space-y-4">
              {items.map((o) => (
                <article key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{o.status}</span>
                        <span className="rounded-full bg-white border border-slate-200 px-2 py-1 text-xs">对账 {o.reconciliationStatus}</span>
                        <span className="rounded-full bg-white border border-slate-200 px-2 py-1 text-xs">退款审核 {o.refundReviewStatus}</span>
                        {o.holdBlockedByDispute && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">冻结 {o.holdReasonCode || 'OTHER'}</span>}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{o.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{o.id} · {o.currency} {o.amountTotal} · Held {o.amountHeld} · Released {o.amountReleased} · Refunded {o.amountRefunded}</p>
                      {o.holdBlockedReason && <p className="mt-1 text-xs text-rose-700">{o.holdBlockedReason}</p>}
                      <p className="mt-1 text-xs text-slate-500">Milestones: {o.milestones.length} · 待释放审核 {o.milestones.filter((m:any)=>m.releaseReviewStatus==='PENDING_REVIEW').length}</p>
                    </div>
                    <div className="w-full lg:w-[360px] space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button disabled={acting===o.id} onClick={()=>void act(o.id,{action:'set_reconciliation_status', reconciliationStatus:'MATCHED'})} className="rounded border border-slate-300 px-2 py-1 text-xs">对账匹配</button>
                        <button disabled={acting===o.id} onClick={()=>void act(o.id,{action:'set_reconciliation_status', reconciliationStatus:'MISMATCH'})} className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-700">对账不一致</button>
                        <button disabled={acting===o.id} onClick={()=>void act(o.id,{action:'set_reconciliation_status', reconciliationStatus:'MANUAL_REVIEW'})} className="rounded border border-slate-300 px-2 py-1 text-xs">人工复核</button>
                        <button disabled={acting===o.id} onClick={()=>void act(o.id,{action:'set_reconciliation_status', reconciliationStatus:'RECONCILED'})} className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">已对账完成</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button disabled={acting===o.id} onClick={()=>void act(o.id,{action:'set_hold_reason', holdReasonCode:'MANUAL_HOLD'})} className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700">手动冻结</button>
                        <button disabled={acting===o.id} onClick={()=>void act(o.id,{action:'set_hold_reason', holdReasonCode:'FRAUD_REVIEW'})} className="rounded border border-slate-300 px-2 py-1 text-xs">欺诈复核</button>
                        <button disabled={acting===o.id} onClick={()=>void act(o.id,{action:'admin_release_hold'})} className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">解除冻结</button>
                      </div>
                      {rowMsg[o.id] && <p className="text-xs text-slate-600">{rowMsg[o.id]}</p>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
