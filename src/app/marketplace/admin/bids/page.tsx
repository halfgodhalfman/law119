"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { AdminTabs } from "@/components/admin/admin-tabs";

type BidItem = {
  id: string;
  caseId: string;
  attorneyProfileId: string;
  status: string;
  version: number;
  feeQuoteMin: string | number | null;
  feeQuoteMax: string | number | null;
  feeMode: string;
  estimatedDays: number | null;
  includesConsultation: boolean;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  selected: boolean;
  abnormalReasons: string[];
  attorneyName: string;
  attorney: { user: { email: string }; isVerified: boolean };
  case: { title: string; status: string; category: string; stateCode: string };
  conversation: { id: string; status: string } | null;
  _count: { versions: number };
};

function moneyRange(min: string | number | null, max: string | number | null) {
  if (min == null && max == null) return "-";
  if (`${min}` === `${max}`) return String(min);
  return `${min ?? "?"} ~ ${max ?? "?"}`;
}

export default function AdminBidsPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [items, setItems] = useState<BidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [caseId, setCaseId] = useState("");
  const [q, setQ] = useState("");
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [abnormalType, setAbnormalType] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const isAdmin = viewer.user?.role === "ADMIN";

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (caseId.trim()) params.set("caseId", caseId.trim());
    if (q.trim()) params.set("q", q.trim());
    if (abnormalOnly) params.set("abnormalOnly", "1");
    if (abnormalType) params.set("abnormalType", abnormalType);
    params.set("page", String(page));
    params.set("pageSize", "20");
    fetch(`/api/marketplace/admin/bids?${params.toString()}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d; })
      .then((d) => {
        setItems(d.items ?? []);
        setMeta({ page: d.filters?.page ?? 1, totalPages: d.filters?.totalPages ?? 1, total: d.filters?.total ?? 0 });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, status, caseId, q, abnormalOnly, abnormalType, page]);

  useEffect(() => setPage(1), [status, caseId, q, abnormalOnly, abnormalType]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">报价管理</h1>
            <p className="mt-2 text-sm text-slate-500">报价列表、状态筛选、按案件查看、异常报价筛选。</p>
          </div>
          <AdminTabs />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部状态</option><option value="PENDING">PENDING</option><option value="ACCEPTED">ACCEPTED</option><option value="REJECTED">REJECTED</option><option value="WITHDRAWN">WITHDRAWN</option>
            </select>
            <input value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="按案件ID筛选" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索Bid/律师/案件标题" className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-56" />
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <input type="checkbox" checked={abnormalOnly} onChange={(e) => setAbnormalOnly(e.target.checked)} /> 只看异常
            </label>
            <select value={abnormalType} onChange={(e) => setAbnormalType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部异常类型</option>
              <option value="bid_price_invalid">报价区间异常</option>
              <option value="far_above_budget">远高于预算</option>
              <option value="accepted_on_cancelled_case">取消案仍已接受</option>
              <option value="frequent_revisions">频繁改价</option>
            </select>
            <span className="text-sm text-slate-500">共 {meta.total} 条</span>
          </div>

          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}
          {loading && isAdmin && <p className="text-sm text-slate-500">加载报价列表中...</p>}
          {error && isAdmin && <p className="text-sm text-rose-700">加载失败：{error}</p>}

          <div className="grid gap-4">
            {items.map((b) => (
              <article key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{b.status}</span>
                      {b.selected && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">已选中</span>}
                      <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700">v{b.version} / {b._count.versions} versions</span>
                      {b.abnormalReasons.map((r) => <span key={`${b.id}-${r}`} className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">{r}</span>)}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{b.case.title}</p>
                    <p className="text-xs text-slate-500 mt-1">Case: {b.caseId} · {b.case.category} · {b.case.stateCode} · {b.case.status}</p>
                    <p className="text-sm text-slate-700 mt-2">报价：{moneyRange(b.feeQuoteMin, b.feeQuoteMax)} · {b.feeMode} · {b.estimatedDays ?? "-"}天</p>
                    <p className="text-sm text-slate-600 mt-1">{b.attorneyName || "未填写姓名"} · {b.attorney.user.email}</p>
                    <p className="text-xs text-slate-500 mt-1 break-all">Bid ID: {b.id} · Attorney Profile: {b.attorneyProfileId}</p>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">{b.message || "（无方案说明）"}</p>
                  </div>
                  <div className="flex min-w-[180px] flex-col gap-2">
                    <Link href={`/marketplace/admin/bids/${b.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-center hover:bg-slate-50">报价详情</Link>
                    <Link href={`/marketplace/cases/${b.caseId}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-center hover:bg-slate-50">查看案件详情</Link>
                    {b.conversation && <Link href={`/chat/${b.conversation.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-center hover:bg-slate-50">查看沟通</Link>}
                    <span className="text-xs text-slate-500 text-center">更新：{new Date(b.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">上一页</button>
            <p className="text-sm text-slate-500">第 {meta.page} / {meta.totalPages} 页</p>
            <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">下一页</button>
          </div>
        </div>
      </main>
    </>
  );
}
