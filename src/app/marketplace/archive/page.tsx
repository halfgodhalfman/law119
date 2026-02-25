// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ArchivePage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all"); // all, CLOSED, CANCELLED
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (tab !== "all") params.set("status", tab);
    fetch(`/api/marketplace/archive?${params}`)
      .then(r => r.json())
      .then(data => { setCases(data.cases || []); setTotalPages(data.totalPages || 1); })
      .finally(() => setLoading(false));
  }, [tab, page]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">案件归档</h1>
      <p className="mt-1 text-sm text-gray-500">查看已完成和已取消的案件历史记录</p>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 border-b">
        {[{ key: "all", label: "全部" }, { key: "CLOSED", label: "已完成" }, { key: "CANCELLED", label: "已取消" }].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }} className={`px-4 py-2 text-sm ${tab === t.key ? "border-b-2 border-blue-600 font-medium text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>{t.label}</button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">加载中...</div>
      ) : cases.length === 0 ? (
        <div className="py-12 text-center text-gray-400">暂无归档案件</div>
      ) : (
        <div className="mt-4 space-y-3">
          {cases.map((c: any) => {
            const eng = c.engagementConfirmations?.[0];
            const payment = c.paymentOrders?.[0];
            const review = c.attorneyClientReviews?.[0];
            return (
              <div key={c.id} className="rounded-lg border p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/marketplace/cases/${c.id}`} className="font-medium hover:text-blue-600">{c.title}</Link>
                    <div className="mt-1 flex gap-2 text-xs text-gray-500">
                      <span className="rounded bg-gray-100 px-2 py-0.5">{c.category}</span>
                      <span>{c.stateCode}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "CLOSED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {c.status === "CLOSED" ? "已完成" : "已取消"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                  {eng && <span>律师: {eng.attorney?.lastName}{eng.attorney?.firstName}</span>}
                  {payment && <span>金额: ${Number(payment.amountTotal).toFixed(2)}</span>}
                  {review && <span>评分: {"★".repeat(review.ratingOverall)}{"☆".repeat(5 - review.ratingOverall)}</span>}
                  {eng?.completionConfirmedAt && <span>完成: {new Date(eng.completionConfirmedAt).toLocaleDateString("zh-CN")}</span>}
                </div>
                <div className="mt-2 flex gap-3 text-xs">
                  {eng && <Link href={`/marketplace/engagements/${eng.id}`} className="text-blue-600 hover:underline">委托详情</Link>}
                  {payment && <Link href={`/marketplace/payments/${payment.id}`} className="text-blue-600 hover:underline">付款记录</Link>}
                  {eng && !review && <Link href={`/marketplace/engagements/${eng.id}`} className="text-yellow-600 hover:underline">去评价</Link>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {page > 1 && <button onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">上一页</button>}
          <span className="px-3 py-1 text-sm text-gray-500">{page} / {totalPages}</span>
          {page < totalPages && <button onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">下一页</button>}
        </div>
      )}
    </div>
  );
}
