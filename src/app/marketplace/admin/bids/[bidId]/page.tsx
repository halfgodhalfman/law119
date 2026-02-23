"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { AdminTabs } from "@/components/admin/admin-tabs";

function moneyRange(min: string | number | null, max: string | number | null) {
  if (min == null && max == null) return "-";
  if (`${min}` === `${max}`) return String(min);
  return `${min ?? "?"} ~ ${max ?? "?"}`;
}

export default function AdminBidDetailPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const params = useParams<{ bidId: string }>();
  const bidId = params.bidId;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = viewer.user?.role === "ADMIN";

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { setLoading(false); return; }
    fetch(`/api/marketplace/admin/bids/${bidId}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d; })
      .then((d) => setData(d.bid))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, bidId]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p><h1 className="mt-1 text-2xl font-bold text-slate-900">报价详情</h1></div>
            <Link href="/marketplace/admin/bids" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">返回报价列表</Link>
          </div>
          <AdminTabs />
          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <p className="text-sm text-rose-700">{error}</p>}
          {data && (
            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{data.status}</span>
                      <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700">v{data.version}</span>
                      {data.case?.selectedBidId === data.id && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">已选中</span>}
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">{data.case?.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{data.case?.category} · {data.case?.stateCode}{data.case?.city ? ` · ${data.case.city}` : ""} · {data.case?.status}</p>
                    <p className="mt-2 text-sm text-slate-700">报价：{moneyRange(data.feeQuoteMin, data.feeQuoteMax)} · {data.feeMode} · {data.estimatedDays ?? "-"}天</p>
                    <p className="text-sm text-slate-700 mt-1">律师：{[data.attorney?.firstName, data.attorney?.lastName].filter(Boolean).join(" ") || "未填写"}（{data.attorney?.user?.email}）</p>
                    <p className="text-xs text-slate-500 break-all mt-1">Bid ID: {data.id} · Attorney Profile: {data.attorneyProfileId}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href={`/marketplace/admin/cases/${data.caseId}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">案件详情</Link>
                    <Link href={`/marketplace/admin/attorneys/${data.attorneyProfileId}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">律师详情</Link>
                    {data.conversation && <Link href={`/marketplace/admin/conversations/${data.conversation.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">会话详情</Link>}
                  </div>
                </div>
                {data.message && <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{data.message}</p>}
                {data.serviceScope && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">{data.serviceScope}</div>}
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">版本历史</h3>
                <div className="mt-3 space-y-2">
                  {(data.versions ?? []).map((v: any) => (
                    <div key={v.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">v{v.version} · {v.status}</p>
                        <span className="text-xs text-slate-500">{new Date(v.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-slate-700">价格：{moneyRange(v.feeQuoteMin, v.feeQuoteMax)} · {v.feeMode} · {v.estimatedDays ?? "-"}天</p>
                      {v.message && <p className="mt-2 text-slate-600 line-clamp-2">{v.message}</p>}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

