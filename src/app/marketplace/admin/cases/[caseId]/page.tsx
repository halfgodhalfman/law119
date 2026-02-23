"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { AdminTabs } from "@/components/admin/admin-tabs";

type AdminCaseDetail = {
  id: string;
  title: string;
  description: string;
  descriptionMasked: string | null;
  category: string;
  subCategorySlug: string | null;
  stateCode: string;
  city: string | null;
  zipCode: string;
  urgency: string;
  preferredLanguage: string;
  status: string;
  feeMode: string;
  budgetMin: string | number | null;
  budgetMax: string | number | null;
  quoteDeadline: string | null;
  selectedBidId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { bids: number; conversations: number };
  bids: Array<{
    id: string;
    attorneyProfileId: string;
    status: string;
    version: number;
    feeMode: string;
    feeQuoteMin: string | number | null;
    feeQuoteMax: string | number | null;
    estimatedDays: number | null;
    includesConsultation: boolean;
    serviceScope: string | null;
    message: string | null;
    updatedAt: string;
    _count: { versions: number };
  }>;
  conversations: Array<{
    id: string;
    bidId: string;
    attorneyProfileId: string;
    clientProfileId: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  statusLogs: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    operatorId: string | null;
    reason: string | null;
    createdAt: string;
  }>;
};

type AdminCaseDetailResponse = {
  ok?: boolean;
  case?: AdminCaseDetail;
  error?: string;
};

export default function AdminCaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = typeof params?.caseId === "string" ? params.caseId : "";
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [item, setItem] = useState<AdminCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actioning, setActioning] = useState<null | "close" | "restore">(null);
  const [reason, setReason] = useState("");

  const isAdmin = viewer.user?.role === "ADMIN";

  async function loadCase() {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/marketplace/admin/cases/${caseId}`);
      const data = (await r.json()) as AdminCaseDetailResponse;
      if (!r.ok) throw new Error(data.error || "Failed to load");
      setItem(data.case ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    void loadCase();
  }, [authLoading, isAdmin, caseId]);

  const summaryBudget = useMemo(() => {
    if (!item) return "未设置";
    if (item.budgetMin == null && item.budgetMax == null) return "未设置";
    if (item.budgetMin != null && item.budgetMax != null) return `${item.budgetMin} - ${item.budgetMax}`;
    return `${item.budgetMin ?? item.budgetMax}`;
  }, [item]);

  async function runAction(action: "close" | "restore") {
    if (!item) return;
    setActioning(action);
    setActionError(null);
    setActionMsg(null);
    try {
      const r = await fetch(`/api/marketplace/admin/cases/${item.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error || "Action failed");
      setActionMsg(action === "close" ? "案件已关闭" : "案件已恢复");
      await loadCase();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActioning(null);
    }
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">案件详情 / 审核操作</h1>
              <p className="mt-2 text-sm text-slate-500 break-all">{caseId || "无案件ID"}</p>
            </div>
            <div className="flex gap-2">
              <Link href="/marketplace/admin/cases" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">
                返回列表
              </Link>
              {caseId && (
                <Link href={`/marketplace/cases/${caseId}`} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">
                  前台详情
                </Link>
              )}
            </div>
          </div>
          <AdminTabs />

          {!authLoading && !isAdmin && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              该页面仅管理员（ADMIN）可用。当前角色：{viewer.user?.role ?? "ANONYMOUS"}。
            </div>
          )}

          {loading && isAdmin && <p className="text-sm text-slate-500">加载案件详情中...</p>}
          {error && isAdmin && <p className="text-sm text-rose-700">加载失败：{error}</p>}

          {isAdmin && item && !loading && !error && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-xs rounded-full bg-slate-100 px-2 py-1">{item.category}</span>
                      <span className="text-xs rounded-full bg-blue-100 px-2 py-1 text-blue-700">{item.status}</span>
                      {item.selectedBidId && <span className="text-xs rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">已选报价</span>}
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">{item.title}</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {item.stateCode}
                      {item.city ? ` · ${item.city}` : ""} · ZIP {item.zipCode} · 紧急度 {item.urgency}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">预算：{summaryBudget} · 收费模式：{item.feeMode}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      报价截止：{item.quoteDeadline ? new Date(item.quoteDeadline).toLocaleString() : "未设置"}
                    </p>
                    <p className="mt-2 text-xs text-slate-400 break-all">案件ID：{item.id}</p>
                  </div>
                  <div className="min-w-[220px] text-sm text-slate-600 space-y-1">
                    <p>报价数：{item._count.bids}</p>
                    <p>会话数：{item._count.conversations}</p>
                    <p>创建时间：{new Date(item.createdAt).toLocaleString()}</p>
                    <p>更新时间：{new Date(item.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">原始案情</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{item.description || "（空）"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">大厅脱敏案情</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{item.descriptionMasked || "（未生成）"}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">审核操作</h3>
                <p className="mt-1 text-sm text-slate-500">关闭/恢复案件时会写入 `CaseStatusLog`，便于审计追踪。</p>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto] items-start">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="操作原因（可选，建议填写）"
                  />
                  <button
                    type="button"
                    onClick={() => runAction("close")}
                    disabled={actioning !== null || item.status === "CLOSED"}
                    className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actioning === "close" ? "关闭中..." : "关闭案件"}
                  </button>
                  <button
                    type="button"
                    onClick={() => runAction("restore")}
                    disabled={actioning !== null || item.status !== "CLOSED"}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actioning === "restore" ? "恢复中..." : "恢复案件"}
                  </button>
                </div>
                {actionMsg && <p className="mt-3 text-sm text-emerald-700">{actionMsg}</p>}
                {actionError && <p className="mt-3 text-sm text-rose-700">{actionError}</p>}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">报价列表</h3>
                <div className="mt-4 space-y-3">
                  {item.bids.map((bid) => (
                    <div key={bid.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs rounded-full bg-slate-100 px-2 py-1">{bid.status}</span>
                        <span className="text-xs rounded-full bg-indigo-100 px-2 py-1 text-indigo-700">
                          v{bid.version} / {bid._count.versions} versions
                        </span>
                        {item.selectedBidId === bid.id && (
                          <span className="text-xs rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">已选中</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 break-all">Bid ID: {bid.id}</p>
                      <p className="text-sm text-slate-700 break-all">Attorney Profile: {bid.attorneyProfileId}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        价格：{bid.feeQuoteMin ?? "-"} ~ {bid.feeQuoteMax ?? "-"} · {bid.feeMode} · {bid.estimatedDays ?? "-"} 天
                      </p>
                      <p className="text-sm text-slate-600 mt-1">首次咨询：{bid.includesConsultation ? "包含" : "不包含"}</p>
                      {bid.serviceScope && <p className="mt-1 text-sm text-slate-600">服务范围：{bid.serviceScope}</p>}
                      {bid.message && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">留言：{bid.message}</p>}
                      <p className="mt-1 text-xs text-slate-400">更新：{new Date(bid.updatedAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {item.bids.length === 0 && <p className="text-sm text-slate-500">暂无报价。</p>}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">沟通会话</h3>
                <div className="mt-4 space-y-3">
                  {item.conversations.map((conv) => (
                    <div key={conv.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs rounded-full bg-slate-100 px-2 py-1">{conv.status}</span>
                        <span className="text-xs rounded-full bg-slate-100 px-2 py-1">Bid {conv.bidId}</span>
                      </div>
                      <p className="break-all">Conversation ID: {conv.id}</p>
                      <p className="break-all">Attorney Profile: {conv.attorneyProfileId}</p>
                      <p className="break-all">Client Profile: {conv.clientProfileId ?? "匿名/未绑定"}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        创建：{new Date(conv.createdAt).toLocaleString()} · 更新：{new Date(conv.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {item.conversations.length === 0 && <p className="text-sm text-slate-500">暂无会话。</p>}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">状态日志（CaseStatusLog）</h3>
                <div className="mt-4 space-y-3">
                  {item.statusLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                      <p className="text-slate-800">
                        {log.fromStatus ?? "NULL"} → <span className="font-semibold">{log.toStatus}</span>
                      </p>
                      <p className="mt-1 text-slate-500 break-all">operatorId: {log.operatorId ?? "system"}</p>
                      {log.reason && <p className="mt-1 whitespace-pre-wrap text-slate-600">原因：{log.reason}</p>}
                      <p className="mt-1 text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {item.statusLogs.length === 0 && <p className="text-sm text-slate-500">暂无状态日志。</p>}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
