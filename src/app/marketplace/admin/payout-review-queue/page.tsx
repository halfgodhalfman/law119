"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default function PayoutReviewQueuePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState(searchParams.get("reviewStatus") ?? "PENDING_REVIEW");
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set("reviewStatus", status);
    if (q.trim()) p.set("q", q.trim());
    return p.toString();
  }, [status, q]);

  useEffect(() => { router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false }); }, [queryString, pathname, router]);

  async function load() {
    setLoading(true);
    setError(null);
    const r = await fetch(`/api/marketplace/admin/payout-review-queue?${queryString}`, { cache: 'no-store' });
    const j = await r.json().catch(()=>({}));
    if (r.ok) setItems(j.items ?? []);
    else setError(j.error || "加载失败");
    setLoading(false);
  }
  useEffect(()=>{ void load(); }, [status]);

  async function act(orderId:string, milestoneId:string, action:'approve_milestone_release'|'reject_milestone_release'|'release_milestone') {
    if (["reject_milestone_release", "release_milestone"].includes(action) && !window.confirm(`确认执行 ${action} ?`)) return;
    setActing(milestoneId);
    setMsg(null);
    const r = await fetch(`/api/marketplace/payments/${orderId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action, milestoneId, note: note.trim() || undefined }) });
    const j = await r.json().catch(()=>({}));
    setActing(null);
    setMsg(r.ok ? '已更新' : (j.error || '操作失败'));
    if (r.ok) await load();
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Payout Review Queue</h1><p className="mt-2 text-sm text-slate-500">里程碑释放人工复核队列（审批后再释放）。</p></div>
          <AdminTabs />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[260px]" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="搜索 milestone/order/title" />
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={()=>void load()}>搜索</button>
            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={status} onChange={(e)=>setStatus(e.target.value)}><option value="PENDING_REVIEW">待审核</option><option value="APPROVED">已通过</option><option value="REJECTED">已拒绝</option><option value="">全部</option></select>
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[220px]" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="审核备注（写入审计）" />
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={()=>void load()}>刷新</button>
            <Link href="/marketplace/admin/finance-ops" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">返回 Finance Ops</Link>
          </div>
          {msg && <p className="mb-3 text-sm text-slate-600">{msg}</p>}
          {error && <p className="mb-3 text-sm text-rose-700">{error}</p>}
          {loading ? <p className="text-sm text-slate-500">加载中...</p> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">暂无符合筛选条件的里程碑审核项。</div> : <div className="space-y-3">{items.map((m)=><article key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{m.releaseReviewStatus}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{m.status}</span>{m.paymentOrder.holdBlockedByDispute && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">冻结 {m.paymentOrder.holdReasonCode}</span>}</div><p className="mt-2 text-sm font-semibold text-slate-900">{m.sortOrder + 1}. {m.title}</p><p className="mt-1 text-xs text-slate-500">Milestone {m.id} · Order {m.paymentOrder.id} · {m.paymentOrder.currency} {m.amount}</p><p className="mt-1 text-xs text-slate-500">申请时间：{m.releaseReviewRequestedAt ? new Date(m.releaseReviewRequestedAt).toLocaleString() : '-'}</p><div className="mt-2 flex gap-2 text-xs">{m.paymentOrder.caseId && <Link href={`/marketplace/admin/cases/${m.paymentOrder.caseId}`} className="underline">案件详情</Link>}{m.paymentOrder.conversationId && <Link href={`/chat/${m.paymentOrder.conversationId}`} className="underline">打开会话</Link>}</div></div><div className="w-full lg:w-[280px] space-y-2"><button disabled={acting===m.id} onClick={()=>void act(m.paymentOrderId,m.id,'approve_milestone_release')} className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">审核通过</button><button disabled={acting===m.id} onClick={()=>void act(m.paymentOrderId,m.id,'reject_milestone_release')} className="w-full rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">审核拒绝</button><button disabled={acting===m.id || m.releaseReviewStatus!=='APPROVED'} onClick={()=>void act(m.paymentOrderId,m.id,'release_milestone')} className="w-full rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-700 disabled:opacity-50">执行释放</button></div></div></article>)}</div>}
        </div>
      </main>
    </>
  );
}
