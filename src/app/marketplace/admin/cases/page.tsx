"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { AdminTabs } from "@/components/admin/admin-tabs";

type AdminCaseListItem = {
  id: string;
  title: string;
  category: string;
  stateCode: string;
  city: string | null;
  status: string;
  urgency: string;
  quoteDeadline: string | null;
  quoteCount: number;
  conversationCount: number;
  selectedBidId: string | null;
  budgetMin?: string | number | null;
  budgetMax?: string | number | null;
  feeMode?: string;
  createdAt: string;
  updatedAt: string;
  abnormalReasons?: string[];
  highValue?: { isHighValue: boolean; reasons: string[] };
  responseSla?: {
    firstBidAt: string | null;
    firstBidMinutes: number | null;
    firstAttorneyMessageAt: string | null;
    firstAttorneyMessageMinutes: number | null;
    firstConversationAt: string | null;
  };
  conversionStage?: "PUBLISHED" | "QUOTED" | "SELECTED" | "CONTACTED" | "ENGAGED" | string;
  slaOverdue?: { firstBid24h: boolean; firstAttorneyMessage24h: boolean };
  opsPriorityScore?: number;
  opsPriorityReasons?: string[];
  slaOverdueDurationMinutes?: number;
};

type AdminCasesResponse = {
  items?: AdminCaseListItem[];
  bottleneckSummary?: {
    quotedNotSelected: number;
    selectedNoConversation: number;
    contactedNotEngaged: number;
  };
  filters?: {
    status: string;
    category: string;
    stateCode: string;
    q: string;
    abnormalOnly?: boolean;
    abnormalType?: string;
    slaOverdue?: string;
    sort?: string;
    highValueOnly?: boolean;
    conversionStage?: string;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export default function AdminCasesPage() {
  return (<Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">加载中...</div>}><AdminCasesInner /></Suspense>);
}

function AdminCasesInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [items, setItems] = useState<AdminCaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [stateCode, setStateCode] = useState(searchParams.get("stateCode") ?? "");
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [abnormalOnly, setAbnormalOnly] = useState(searchParams.get("abnormalOnly") === "1");
  const [abnormalType, setAbnormalType] = useState(searchParams.get("abnormalType") ?? "");
  const [highValueOnly, setHighValueOnly] = useState(searchParams.get("highValueOnly") === "1");
  const [conversionStage, setConversionStage] = useState(searchParams.get("conversionStage") ?? "");
  const [slaOverdue, setSlaOverdue] = useState(searchParams.get("slaOverdue") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "updated_desc");
  const [page, setPage] = useState(Math.max(Number(searchParams.get("page") ?? "1") || 1, 1));
  const [pageSize, setPageSize] = useState(() => {
    const n = Number(searchParams.get("pageSize") ?? "20") || 20;
    return [10, 20, 50].includes(n) ? n : 20;
  });
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [bottleneckSummary, setBottleneckSummary] = useState({ quotedNotSelected: 0, selectedNoConversation: 0, contactedNotEngaged: 0 });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [actioningCaseId, setActioningCaseId] = useState<string | null>(null);
  const [rowReason, setRowReason] = useState<Record<string, string>>({});
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<null | { caseId: string; action: "close" | "restore"; title: string }>(null);
  const [batchActioning, setBatchActioning] = useState<null | "close" | "restore">(null);
  const [batchReason, setBatchReason] = useState("");
  const [confirmBatchAction, setConfirmBatchAction] = useState<null | { action: "close" | "restore"; ids: string[] }>(null);

  useEffect(() => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (category) next.set("category", category);
    if (stateCode.trim()) next.set("stateCode", stateCode.trim().toUpperCase());
    if (q.trim()) next.set("q", q.trim());
    if (abnormalOnly) next.set("abnormalOnly", "1");
    if (abnormalType) next.set("abnormalType", abnormalType);
    if (highValueOnly) next.set("highValueOnly", "1");
    if (conversionStage) next.set("conversionStage", conversionStage);
    if (slaOverdue) next.set("slaOverdue", slaOverdue);
    if (sort && sort !== "updated_desc") next.set("sort", sort);
    if (page > 1) next.set("page", String(page));
    if (pageSize !== 20) next.set("pageSize", String(pageSize));
    const nextQs = next.toString();
    const currentQs = searchParams.toString();
    if (nextQs !== currentQs) {
      router.replace(nextQs ? `${pathname}?${nextQs}` : pathname, { scroll: false });
    }
  }, [pathname, router, searchParams, status, category, stateCode, q, abnormalOnly, abnormalType, highValueOnly, conversionStage, slaOverdue, sort, page, pageSize]);

  useEffect(() => {
    if (authLoading) return;
    if (viewer.user?.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    let canceled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (stateCode.trim()) params.set("stateCode", stateCode.trim().toUpperCase());
    if (q.trim()) params.set("q", q.trim());
    if (abnormalOnly) params.set("abnormalOnly", "1");
    if (abnormalType) params.set("abnormalType", abnormalType);
    if (highValueOnly) params.set("highValueOnly", "1");
    if (conversionStage) params.set("conversionStage", conversionStage);
    if (slaOverdue) params.set("slaOverdue", slaOverdue);
    if (sort) params.set("sort", sort);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    fetch(`/api/marketplace/admin/cases?${params.toString()}`)
      .then(async (r) => {
        const data = (await r.json()) as AdminCasesResponse & { error?: string };
        if (!r.ok) throw new Error(data.error || "Failed to load admin cases");
        return data;
      })
      .then((data) => {
        if (canceled) return;
        setItems(data.items ?? []);
        setBottleneckSummary(data.bottleneckSummary ?? { quotedNotSelected: 0, selectedNoConversation: 0, contactedNotEngaged: 0 });
        setMeta({
          page: data.filters?.page ?? 1,
          totalPages: data.filters?.totalPages ?? 1,
          total: data.filters?.total ?? 0,
        });
      })
      .catch((e: unknown) => {
        if (!canceled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [authLoading, viewer.user?.role, status, category, stateCode, q, abnormalOnly, abnormalType, highValueOnly, conversionStage, slaOverdue, sort, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [status, category, stateCode, q, abnormalOnly, abnormalType, highValueOnly, conversionStage, slaOverdue, sort, pageSize]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => items.some((it) => it.id === id)));
  }, [items]);

  function resetFilters() {
    setStatus("");
    setCategory("");
    setStateCode("");
    setQ("");
    setAbnormalOnly(false);
    setAbnormalType("");
    setHighValueOnly(false);
    setConversionStage("");
    setSlaOverdue("");
    setSort("updated_desc");
    setPageSize(20);
    setPage(1);
  }

  const isAdmin = viewer.user?.role === "ADMIN";
  const allCurrentPageSelected = items.length > 0 && items.every((it) => selectedIds.includes(it.id));

  function setRowFeedback(caseId: string, message: string) {
    setRowMsg((m) => ({ ...m, [caseId]: message }));
    setTimeout(() => {
      setRowMsg((m) => {
        const next = { ...m };
        delete next[caseId];
        return next;
      });
    }, 1800);
  }

  function toggleSelect(caseId: string, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(caseId) ? prev : [...prev, caseId];
      return prev.filter((id) => id !== caseId);
    });
  }

  function toggleSelectAllCurrentPage(checked: boolean) {
    setSelectedIds((prev) => {
      const currentIds = items.map((it) => it.id);
      if (checked) return Array.from(new Set([...prev, ...currentIds]));
      return prev.filter((id) => !currentIds.includes(id));
    });
  }

  async function runRowAction(caseId: string, action: "close" | "restore") {
    setActioningCaseId(caseId);
    try {
      const r = await fetch(`/api/marketplace/admin/cases/${caseId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: rowReason[caseId]?.trim() || `Admin quick ${action} from list`,
        }),
      });
      const data = (await r.json()) as { error?: string; case?: { status?: string } };
      if (!r.ok) throw new Error(data.error || "Action failed");
      setItems((prev) =>
        prev.map((c) => (c.id === caseId ? { ...c, status: data.case?.status ?? (action === "close" ? "CLOSED" : "OPEN") } : c)),
      );
      setRowFeedback(caseId, action === "close" ? "已关闭" : "已恢复");
    } catch (e) {
      setRowFeedback(caseId, e instanceof Error ? `失败：${e.message}` : "操作失败");
    } finally {
      setActioningCaseId(null);
      setConfirmAction(null);
    }
  }

  async function runBatchAction(action: "close" | "restore", ids: string[]) {
    if (ids.length === 0) return;
    setBatchActioning(action);
    try {
      const r = await fetch(`/api/marketplace/admin/cases/batch-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          caseIds: ids,
          reason: batchReason.trim() || `Admin batch ${action} from list`,
        }),
      });
      const data = (await r.json()) as {
        error?: string;
        cases?: Array<{ id: string; status: string }>;
        appliedCount?: number;
        missingCount?: number;
      };
      if (!r.ok) throw new Error(data.error || "Batch action failed");

      const successMap = new Map((data.cases ?? []).map((c) => [c.id, c.status]));
      const failed = Math.max(ids.length - successMap.size, 0);

      if (successMap.size > 0) {
        setItems((prev) => prev.map((it) => (successMap.has(it.id) ? { ...it, status: successMap.get(it.id)! } : it)));
      }
      setSelectedIds((prev) => prev.filter((id) => !successMap.has(id)));
      if (failed === 0) {
        setToastMsg(`批量${action === "close" ? "关闭" : "恢复"}成功（${successMap.size}条）`);
      } else {
        setToastMsg(`批量完成：成功 ${successMap.size} 条，失败 ${failed} 条`);
      }
      setTimeout(() => setToastMsg(null), 1800);
    } finally {
      setBatchActioning(null);
      setConfirmBatchAction(null);
    }
  }

  async function exportCurrentPageCsv() {
    const rows = [
      ["id", "title", "category", "status", "stateCode", "city", "urgency", "quoteCount", "conversationCount", "quoteDeadline", "updatedAt"].join(","),
      ...items.map((it) =>
        [
          it.id,
          `"${(it.title ?? "").replace(/"/g, '""')}"`,
          it.category,
          it.status,
          it.stateCode,
          it.city ?? "",
          it.urgency,
          String(it.quoteCount),
          String(it.conversationCount),
          it.quoteDeadline ?? "",
          it.updatedAt,
        ].join(","),
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-cases-page-${meta.page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMsg("已导出当前页 CSV");
    setTimeout(() => setToastMsg(null), 1500);
  }

  async function exportFilteredAllCsv() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (stateCode.trim()) params.set("stateCode", stateCode.trim().toUpperCase());
    if (q.trim()) params.set("q", q.trim());
    if (abnormalOnly) params.set("abnormalOnly", "1");
    if (abnormalType) params.set("abnormalType", abnormalType);
    if (highValueOnly) params.set("highValueOnly", "1");
    if (conversionStage) params.set("conversionStage", conversionStage);
    if (slaOverdue) params.set("slaOverdue", slaOverdue);
    if (sort) params.set("sort", sort);
    params.set("page", "1");
    params.set("pageSize", "100");
    params.set("exportAll", "1");

    const r = await fetch(`/api/marketplace/admin/cases?${params.toString()}`);
    const data = (await r.json()) as AdminCasesResponse & { error?: string };
    if (!r.ok) throw new Error(data.error || "导出失败");
    const exportItems = data.items ?? [];

    const rows = [
      ["id", "title", "category", "status", "stateCode", "city", "urgency", "quoteCount", "conversationCount", "quoteDeadline", "updatedAt", "abnormalReasons"].join(","),
      ...exportItems.map((it) =>
        [
          it.id,
          `"${(it.title ?? "").replace(/"/g, '""')}"`,
          it.category,
          it.status,
          it.stateCode,
          it.city ?? "",
          it.urgency,
          String(it.quoteCount),
          String(it.conversationCount),
          it.quoteDeadline ?? "",
          it.updatedAt,
          `"${(it.abnormalReasons ?? []).join("|")}"`,
        ].join(","),
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin-cases-filtered-all.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToastMsg(`已导出当前筛选全部结果（${exportItems.length} 条）`);
    setTimeout(() => setToastMsg(null), 1800);
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin Cases / 案件审核列表</h1>
            <p className="mt-2 text-sm text-slate-500">最小后台：列表、筛选、进入详情并执行关闭/恢复操作。</p>
          </div>
          <AdminTabs />

          {!authLoading && !isAdmin && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              该页面仅管理员（ADMIN）可用。当前角色：{viewer.user?.role ?? "ANONYMOUS"}。
            </div>
          )}

          {isAdmin && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">全部状态</option>
                  <option value="OPEN">OPEN</option>
                  <option value="MATCHING">MATCHING</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">全部类目</option>
                  <option value="IMMIGRATION">IMMIGRATION</option>
                  <option value="FAMILY">FAMILY</option>
                  <option value="EMPLOYMENT">EMPLOYMENT</option>
                  <option value="CONTRACTS">CONTRACTS</option>
                  <option value="LITIGATION">LITIGATION</option>
                  <option value="CRIMINAL_DEFENSE">CRIMINAL_DEFENSE</option>
                </select>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="州代码（如 CA）"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value.slice(0, 2))}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="搜索标题 / 描述 / 案件ID"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  value={conversionStage}
                  onChange={(e) => setConversionStage(e.target.value)}
                >
                  <option value="">全部转化阶段</option>
                  <option value="PUBLISHED">已发布</option>
                  <option value="QUOTED">有报价</option>
                  <option value="SELECTED">已选报价</option>
                  <option value="CONTACTED">已沟通</option>
                  <option value="ENGAGED">已委托</option>
                </select>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  value={slaOverdue}
                  onChange={(e) => setSlaOverdue(e.target.value)}
                >
                  <option value="">SLA 筛选（全部）</option>
                  <option value="first_bid_24h">首报超时 &gt; 24h（含未报）</option>
                  <option value="first_message_24h">首条律师消息超时 &gt; 24h（含未发）</option>
                </select>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="updated_desc">最近更新</option>
                  <option value="ops_priority">运营优先级排序</option>
                  <option value="sla_overdue_desc">SLA 超时最长优先</option>
                </select>
                <div className="flex gap-2">
                  <select
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    <option value={10}>10/页</option>
                    <option value={20}>20/页</option>
                    <option value={50}>50/页</option>
                  </select>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    重置
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && isAdmin && <p className="text-sm text-slate-500">加载后台案件列表中...</p>}
          {error && isAdmin && <p className="text-sm text-rose-700">加载失败：{error}</p>}

          {isAdmin && !loading && !error && (
            <>
              <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
                <div className="flex items-center gap-3 flex-wrap">
                  <span>共 {meta.total} 条</span>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={(e) => toggleSelectAllCurrentPage(e.target.checked)}
                    />
                    <span>当前页全选</span>
                  </label>
                  <span>已选 {selectedIds.length} 条</span>
                </div>
                <span>
                  第 {meta.page} / {meta.totalPages} 页
                </span>
              </div>
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    setConversionStage("QUOTED");
                    setSort("ops_priority");
                  }}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">卡点分组</div>
                  <div className="mt-1 text-lg font-bold text-amber-900">有报价未选中</div>
                  <div className="mt-1 text-sm text-amber-800">{bottleneckSummary.quotedNotSelected} 条</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConversionStage("SELECTED");
                    setSort("ops_priority");
                  }}
                  className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-left"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700">卡点分组</div>
                  <div className="mt-1 text-lg font-bold text-cyan-900">已选未沟通</div>
                  <div className="mt-1 text-sm text-cyan-800">{bottleneckSummary.selectedNoConversation} 条</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConversionStage("CONTACTED");
                    setSort("ops_priority");
                  }}
                  className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-left"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">卡点分组</div>
                  <div className="mt-1 text-lg font-bold text-violet-900">已沟通未委托</div>
                  <div className="mt-1 text-sm text-violet-800">{bottleneckSummary.contactedNotEngaged} 条</div>
                </button>
              </div>
              {toastMsg && <div className="mb-3 text-sm text-emerald-700">{toastMsg}</div>}
              <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 flex flex-wrap items-center gap-2">
                <textarea
                  rows={2}
                  value={batchReason}
                  onChange={(e) => setBatchReason(e.target.value)}
                  className="min-w-[260px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="批量操作原因（可选）"
                />
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={abnormalOnly}
                    onChange={(e) => setAbnormalOnly(e.target.checked)}
                  />
                  只看异常案件
                </label>
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={highValueOnly}
                    onChange={(e) => setHighValueOnly(e.target.checked)}
                  />
                  只看高价值案件
                </label>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  value={abnormalType}
                  onChange={(e) => setAbnormalType(e.target.value)}
                >
                  <option value="">全部异常类型</option>
                  <option value="missing_masked_summary">脱敏摘要缺失</option>
                  <option value="budget_range_invalid">预算区间异常</option>
                  <option value="expired_but_still_open">截止后仍开放</option>
                </select>
                <button
                  type="button"
                  onClick={() => setConfirmBatchAction({ action: "close", ids: selectedIds })}
                  disabled={selectedIds.length === 0 || batchActioning !== null}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700 disabled:opacity-50"
                >
                  批量关闭
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmBatchAction({ action: "restore", ids: selectedIds })}
                  disabled={selectedIds.length === 0 || batchActioning !== null}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 disabled:opacity-50"
                >
                  批量恢复
                </button>
                <button
                  type="button"
                  onClick={exportCurrentPageCsv}
                  disabled={items.length === 0}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                >
                  导出当前页 CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void exportFilteredAllCsv().catch((e: unknown) => {
                      setToastMsg(e instanceof Error ? e.message : "导出失败");
                      setTimeout(() => setToastMsg(null), 1800);
                    });
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
                >
                  导出当前筛选全部
                </button>
              </div>

              <div className="grid gap-4">
                {items.map((item) => {
                  const deadline = item.quoteDeadline ? new Date(item.quoteDeadline) : null;
                  const isExpired = !!deadline && deadline.getTime() < Date.now();
                  const firstBidM = item.responseSla?.firstBidMinutes;
                  const firstMsgM = item.responseSla?.firstAttorneyMessageMinutes;
                  const formatMins = (mins: number | null | undefined) => {
                    if (mins == null) return "未响应";
                    if (mins < 60) return `${mins} 分钟`;
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
                  };
                  return (
                    <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-3">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={(e) => toggleSelect(item.id, e.target.checked)}
                          />
                          选中此案件
                        </label>
                      </div>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="text-xs rounded-full bg-slate-100 px-2 py-1">{item.category}</span>
                            <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-1">{item.status}</span>
                            {item.selectedBidId && (
                              <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">已选报价</span>
                            )}
                            {isExpired && (
                              <span className="text-xs rounded-full bg-rose-100 text-rose-700 px-2 py-1">已过截止</span>
                            )}
                            {item.abnormalReasons && item.abnormalReasons.length > 0 && (
                              <span className="text-xs rounded-full bg-amber-100 text-amber-700 px-2 py-1">
                                异常 {item.abnormalReasons.length}
                              </span>
                            )}
                            {item.highValue?.isHighValue && (
                              <span className="text-xs rounded-full bg-fuchsia-100 text-fuchsia-700 px-2 py-1">
                                高价值案件
                              </span>
                            )}
                            {item.conversionStage && (
                              <span className="text-xs rounded-full bg-cyan-100 text-cyan-700 px-2 py-1">
                                阶段 {item.conversionStage}
                              </span>
                            )}
                            {typeof item.opsPriorityScore === "number" && item.opsPriorityScore > 0 && (
                              <span className="text-xs rounded-full bg-violet-100 text-violet-700 px-2 py-1">
                                运营优先级 {item.opsPriorityScore}
                              </span>
                            )}
                          </div>
                          <h2 className="text-lg font-semibold text-slate-900 break-all">{item.title}</h2>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.stateCode}
                            {item.city ? ` · ${item.city}` : ""} · 紧急度 {item.urgency}
                          </p>
                          <p className="mt-2 text-xs text-slate-400 break-all">案件ID: {item.id}</p>
                          {item.highValue?.isHighValue && (
                            <p className="mt-1 text-xs text-fuchsia-700">
                              高价值原因：{item.highValue.reasons.join(" / ")}
                            </p>
                          )}
                          {!!item.opsPriorityReasons?.length && (
                            <p className="mt-1 text-xs text-violet-700">优先级原因：{item.opsPriorityReasons.join(" / ")}</p>
                          )}
                        </div>
                        <div className="text-sm text-slate-600 space-y-1 min-w-[220px]">
                          <p>报价数：{item.quoteCount}</p>
                          <p>会话数：{item.conversationCount}</p>
                          <p>
                            预算：
                            {item.budgetMin != null || item.budgetMax != null
                              ? `${item.budgetMin ?? "?"} ~ ${item.budgetMax ?? "?"}`
                              : "未设置"}
                            {item.feeMode ? ` · ${item.feeMode}` : ""}
                          </p>
                          <p>截止：{item.quoteDeadline ? new Date(item.quoteDeadline).toLocaleString() : "未设置"}</p>
                          <p>首报 SLA：{formatMins(firstBidM)}</p>
                          <p>首条律师消息 SLA：{formatMins(firstMsgM)}</p>
                          <p className="text-xs">
                            SLA状态：
                            <span className={item.slaOverdue?.firstBid24h ? "text-rose-700" : "text-emerald-700"}> 首报{item.slaOverdue?.firstBid24h ? "超时" : "正常"}</span>
                            <span className={item.slaOverdue?.firstAttorneyMessage24h ? "text-rose-700" : "text-emerald-700"}> · 首消息{item.slaOverdue?.firstAttorneyMessage24h ? "超时" : "正常"}</span>
                          </p>
                          {typeof item.slaOverdueDurationMinutes === "number" && item.slaOverdueDurationMinutes > 0 && (
                            <p className="text-xs text-rose-700">最长超时：{Math.floor(item.slaOverdueDurationMinutes / 60)}h {item.slaOverdueDurationMinutes % 60}m</p>
                          )}
                          <p>更新：{new Date(item.updatedAt).toLocaleString()}</p>
                          {item.abnormalReasons && item.abnormalReasons.length > 0 && (
                            <p className="text-amber-700 text-xs">异常：{item.abnormalReasons.join(", ")}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/marketplace/admin/cases/${item.id}`}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
                        >
                          查看详情 / 审核
                        </Link>
                        <Link
                          href={`/marketplace/cases/${item.id}`}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
                        >
                          前台详情
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ caseId: item.id, action: "close", title: item.title })}
                          disabled={actioningCaseId !== null || item.status === "CLOSED"}
                          className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actioningCaseId === item.id && item.status !== "CLOSED" ? "处理中..." : "快速关闭"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ caseId: item.id, action: "restore", title: item.title })}
                          disabled={actioningCaseId !== null || item.status !== "CLOSED"}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actioningCaseId === item.id && item.status === "CLOSED" ? "处理中..." : "快速恢复"}
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          className="min-w-[260px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          placeholder="行内操作原因（可选）"
                          value={rowReason[item.id] ?? ""}
                          onChange={(e) => setRowReason((m) => ({ ...m, [item.id]: e.target.value }))}
                        />
                        {rowMsg[item.id] && <span className="text-xs text-slate-600">{rowMsg[item.id]}</span>}
                      </div>
                    </article>
                  );
                })}
              </div>

              {items.length === 0 && (
                <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                  当前筛选下没有案件。可尝试清空状态、类目或关键词筛选。
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={meta.page <= 1}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                >
                  上一页
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
                  disabled={meta.page >= meta.totalPages}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                >
                  下一页
                </button>
              </div>
            </>
          )}
        </div>
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">
                确认{confirmAction.action === "close" ? "关闭" : "恢复"}案件？
              </h3>
              <p className="mt-2 text-sm text-slate-600 break-all">{confirmAction.title}</p>
              <p className="mt-1 text-xs text-slate-400 break-all">Case ID: {confirmAction.caseId}</p>
              <div className="mt-3">
                <label className="block text-sm text-slate-700 mb-1.5">操作原因（可选）</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={rowReason[confirmAction.caseId] ?? ""}
                  onChange={(e) => setRowReason((m) => ({ ...m, [confirmAction.caseId]: e.target.value }))}
                  placeholder={confirmAction.action === "close" ? "例如：敏感信息未脱敏" : "例如：误关闭，恢复处理"}
                />
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  disabled={actioningCaseId !== null}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => runRowAction(confirmAction.caseId, confirmAction.action)}
                  disabled={actioningCaseId !== null}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                    confirmAction.action === "close"
                      ? "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {actioningCaseId === confirmAction.caseId
                    ? "处理中..."
                    : confirmAction.action === "close"
                      ? "确认关闭"
                      : "确认恢复"}
                </button>
              </div>
            </div>
          </div>
        )}
        {confirmBatchAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">
                确认批量{confirmBatchAction.action === "close" ? "关闭" : "恢复"} {confirmBatchAction.ids.length} 条案件？
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                将对当前选中的案件执行批量操作，并写入 `CaseStatusLog`。
              </p>
              <p className="mt-2 text-xs text-slate-400">
                已选案件 ID（前 5 个）：{confirmBatchAction.ids.slice(0, 5).join(", ")}
                {confirmBatchAction.ids.length > 5 ? " ..." : ""}
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmBatchAction(null)}
                  disabled={batchActioning !== null}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => runBatchAction(confirmBatchAction.action, confirmBatchAction.ids)}
                  disabled={batchActioning !== null}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                    confirmBatchAction.action === "close"
                      ? "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {batchActioning ? "处理中..." : confirmBatchAction.action === "close" ? "确认批量关闭" : "确认批量恢复"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
