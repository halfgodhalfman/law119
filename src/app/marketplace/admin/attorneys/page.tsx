"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { AdminTabs } from "@/components/admin/admin-tabs";

type AttorneyItem = {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  firmName: string | null;
  barLicenseNumber: string | null;
  barNumberVerified: boolean;
  barVerifiedAt: string | null;
  barState: string | null;
  yearsExperience: number | null;
  isVerified: boolean;
  bio: string | null;
  reviewStatus?: string;
  reviewRequestedAt?: string | null;
  lastReviewedAt?: string | null;
  reviewDecisionTemplate?: string | null;
  reviewDecisionReason?: string | null;
  reviewQueue?: { pendingReviewQueue: boolean; needsReReview: boolean; displayStatus: string };
  reviewChecklist?: { checklistScore: number; missingKeys: string[]; items: Array<{ key: string; label: string; passed: boolean; detail: string }> };
  reviewLogs?: Array<{ id: string; action: string; toStatus?: string | null; templateKey?: string | null; reason?: string | null; createdAt: string }>;
  completeness: number;
  user: { id: string; email: string; role: string };
  specialties: Array<{ category: string }>;
  serviceAreas: Array<{ stateCode: string; zipCode: string | null }>;
  _count: { bids: number; conversations: number };
};

type BatchReviewUpdatedAttorney = {
  id: string;
  reviewStatus: string;
  isVerified: boolean;
  profileCompletenessScore: number | null;
};

const REVIEW_TEMPLATES = [
  { key: "APPROVE_STANDARD", label: "通过" },
  { key: "REQUEST_MORE_INFO", label: "补件" },
  { key: "REJECT_INCOMPLETE", label: "拒绝" },
] as const;

export default function AdminAttorneysPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [items, setItems] = useState<AttorneyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState("");
  const [barVerified, setBarVerified] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [reviewQueueOnly, setReviewQueueOnly] = useState(true);
  const [reviewStatus, setReviewStatus] = useState("");
  const [sort, setSort] = useState("review_priority");
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [batchActioning, setBatchActioning] = useState(false);
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isAdmin = viewer.user?.role === "ADMIN";

  function feedback(id: string, msg: string) {
    setRowMsg((m) => ({ ...m, [id]: msg }));
    setTimeout(() => setRowMsg((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    }), 1800);
  }

  async function runAction(id: string, action: "verify" | "unverify" | "bar_verify" | "bar_unverify") {
    setActioningId(id);
    try {
      const r = await fetch(`/api/marketplace/admin/attorneys/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "操作失败");
      setItems((prev) => prev.map((it) => it.id === id ? { ...it, ...data.attorney } : it));
      feedback(id, "已更新");
    } catch (e) {
      feedback(id, e instanceof Error ? e.message : "操作失败");
    } finally {
      setActioningId(null);
    }
  }

  async function runReviewTemplate(id: string, templateKey: (typeof REVIEW_TEMPLATES)[number]["key"]) {
    const action =
      templateKey === "APPROVE_STANDARD"
        ? "review_approve"
        : templateKey === "REQUEST_MORE_INFO"
          ? "review_request_info"
          : "review_reject";
    setActioningId(id);
    try {
      const r = await fetch(`/api/marketplace/admin/attorneys/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, templateKey }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "审核失败");
      feedback(id, "审核已更新");
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                ...data.attorney,
                reviewStatus: data.attorney.reviewStatus,
                profileCompletenessScore: data.attorney.profileCompletenessScore,
              }
            : it,
        ),
      );
    } catch (e) {
      feedback(id, e instanceof Error ? e.message : "审核失败");
    } finally {
      setActioningId(null);
    }
  }

  async function runBatchReview(action: "review_approve" | "review_request_info") {
    if (selectedIds.length === 0) return;
    setBatchActioning(true);
    try {
      const r = await fetch("/api/marketplace/admin/attorneys/batch-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          attorneyIds: selectedIds,
          templateKey: action === "review_approve" ? "APPROVE_STANDARD" : "REQUEST_MORE_INFO",
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "批量审核失败");
      const updatedMap = new Map<string, BatchReviewUpdatedAttorney>(
        ((data.attorneys ?? []) as BatchReviewUpdatedAttorney[]).map((a) => [a.id, a]),
      );
      setItems((prev) =>
        prev.map((it) =>
          updatedMap.has(it.id)
            ? {
                ...it,
                ...(updatedMap.get(it.id) ?? {}),
                reviewStatus: updatedMap.get(it.id)?.reviewStatus ?? it.reviewStatus,
                isVerified: updatedMap.get(it.id)?.isVerified ?? it.isVerified,
                completeness: updatedMap.get(it.id)?.profileCompletenessScore ?? it.completeness,
                reviewQueue: it.reviewQueue
                  ? {
                      ...it.reviewQueue,
                      displayStatus: updatedMap.get(it.id)?.reviewStatus ?? it.reviewQueue.displayStatus,
                      pendingReviewQueue: (updatedMap.get(it.id)?.reviewStatus ?? it.reviewQueue.displayStatus) !== "APPROVED",
                      needsReReview: false,
                    }
                  : it.reviewQueue,
              }
            : it,
        ),
      );
      setSelectedIds((prev) => prev.filter((id) => !updatedMap.has(id)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "批量审核失败");
    } finally {
      setBatchActioning(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (verified) params.set("verified", verified);
    if (barVerified) params.set("barVerified", barVerified);
    if (stateCode.trim()) params.set("state", stateCode.trim().toUpperCase());
    if (category) params.set("category", category);
    if (reviewQueueOnly) params.set("reviewQueue", "1");
    if (reviewStatus) params.set("reviewStatus", reviewStatus);
    if (sort) params.set("sort", sort);
    params.set("page", String(page));
    params.set("pageSize", "20");
    fetch(`/api/marketplace/admin/attorneys?${params.toString()}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed");
        return data;
      })
      .then((data) => {
        setItems(data.items ?? []);
        setMeta({ page: data.filters?.page ?? 1, totalPages: data.filters?.totalPages ?? 1, total: data.filters?.total ?? 0 });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, q, verified, barVerified, stateCode, category, reviewQueueOnly, reviewStatus, sort, page]);

  useEffect(() => setPage(1), [q, verified, barVerified, stateCode, category, reviewQueueOnly, reviewStatus, sort]);
  useEffect(() => setSelectedIds([]), [items.length, page, q, verified, barVerified, stateCode, category, reviewQueueOnly, reviewStatus, sort]);

  const selectableIds = items.map((i) => i.id);
  const allSelectedOnPage = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">律师管理</h1>
            <p className="mt-2 text-sm text-slate-500">资质审核、认证状态、执业州、擅长类目、资料完整度。</p>
          </div>
          <AdminTabs />
          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索姓名/邮箱/律所/执照号" className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-64" />
            <select value={verified} onChange={(e) => setVerified(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">认证状态</option><option value="true">已认证</option><option value="false">未认证</option></select>
            <select value={barVerified} onChange={(e) => setBarVerified(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">执照核验</option><option value="true">已核验</option><option value="false">未核验</option></select>
            <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} placeholder="州(如CA)" maxLength={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase w-28" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">擅长类目</option>
              {["IMMIGRATION","CRIMINAL","CIVIL","REAL_ESTATE","FAMILY","BUSINESS","ESTATE_PLAN","LABOR","TAX","OTHER"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <input type="checkbox" checked={reviewQueueOnly} onChange={(e) => setReviewQueueOnly(e.target.checked)} />
              待审核队列
            </label>
            <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">审核状态</option>
              {["PENDING_REVIEW","NEEDS_INFO","APPROVED","REJECTED","RE_REVIEW_REQUIRED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="review_priority">审核优先排序</option>
              <option value="updated_desc">最近更新</option>
              <option value="completeness_desc">完整度高到低</option>
            </select>
            <span className="text-sm text-slate-500">共 {meta.total} 条</span>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <button
              type="button"
              onClick={() =>
                setSelectedIds((prev) =>
                  allSelectedOnPage ? prev.filter((id) => !selectableIds.includes(id)) : Array.from(new Set([...prev, ...selectableIds])),
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50"
            >
              {allSelectedOnPage ? "取消全选当前页" : "全选当前页"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(items.filter((it) => it.reviewQueue?.pendingReviewQueue).map((it) => it.id))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50"
            >
              仅选择待审核
            </button>
            <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">清空选择</button>
            <span className="text-xs text-slate-500">已选 {selectedIds.length} 条</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                disabled={batchActioning || selectedIds.length === 0}
                onClick={() => runBatchReview("review_approve")}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 disabled:opacity-50"
              >
                批量通过
              </button>
              <button
                type="button"
                disabled={batchActioning || selectedIds.length === 0}
                onClick={() => runBatchReview("review_request_info")}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 disabled:opacity-50"
              >
                批量补件
              </button>
            </div>
          </div>

          {loading && isAdmin && <p className="text-sm text-slate-500">加载律师列表中...</p>}
          {error && isAdmin && <p className="text-sm text-rose-700">加载失败：{error}</p>}

          <div className="grid gap-4">
            {items.map((a) => (
              <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(a.id)}
                      onChange={(e) =>
                        setSelectedIds((prev) => (e.target.checked ? Array.from(new Set([...prev, a.id])) : prev.filter((id) => id !== a.id)))
                      }
                      aria-label={`select attorney ${a.id}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`rounded-full px-2 py-1 text-xs ${a.isVerified ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{a.isVerified ? "平台已认证" : "未认证"}</span>
                      <span className={`rounded-full px-2 py-1 text-xs ${a.barNumberVerified ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700"}`}>{a.barNumberVerified ? "执照已核验" : "执照未核验"}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">完整度 {a.completeness}%</span>
                      {a.reviewQueue?.pendingReviewQueue && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">待审核</span>}
                      {a.reviewQueue?.needsReReview && <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">资料变更复审</span>}
                      {a.reviewQueue?.displayStatus && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{a.reviewQueue.displayStatus}</span>}
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">{a.fullName || "未填写姓名"}</h2>
                    <p className="text-sm text-slate-600">{a.user.email}</p>
                    <p className="text-sm text-slate-500 mt-1">{a.firmName || "未填写律所"}{a.barState ? ` · ${a.barState}` : ""}{typeof a.yearsExperience === "number" ? ` · ${a.yearsExperience}年经验` : ""}</p>
                    <p className="text-xs text-slate-500 mt-1 break-all">Attorney ID: {a.id} · User ID: {a.user.id}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {a.specialties.map((s) => <span key={`${a.id}-${s.category}`} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600">{s.category}</span>)}
                      {a.specialties.length === 0 && <span className="text-xs text-slate-400">未填写擅长类目</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {a.serviceAreas.slice(0, 6).map((s, i) => <span key={`${a.id}-${i}`} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600">{s.stateCode}{s.zipCode ? `-${s.zipCode}` : ""}</span>)}
                      {a.serviceAreas.length === 0 && <span className="text-xs text-slate-400">未填写执业区域</span>}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">报价 {a._count.bids} · 会话 {a._count.conversations}</p>
                    {a.reviewChecklist && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs font-semibold text-slate-700">审核项 checklist（{a.reviewChecklist.checklistScore}%）</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {a.reviewChecklist.items.map((it) => (
                            <span key={it.key} className={`rounded-full px-2 py-0.5 text-[11px] ${it.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                              {it.label}{it.passed ? "✓" : "✕"}
                            </span>
                          ))}
                        </div>
                        {!!a.reviewChecklist.missingKeys?.length && (
                          <p className="mt-1 text-[11px] text-rose-700">缺项：{a.reviewChecklist.missingKeys.join("、")}</p>
                        )}
                      </div>
                    )}
                    {a.reviewLogs?.[0] && (
                      <div className="mt-2 text-xs text-slate-500">
                        最近审核：{a.reviewLogs[0].action} · {new Date(a.reviewLogs[0].createdAt).toLocaleString()}
                        {a.reviewLogs[0].reason ? ` · ${a.reviewLogs[0].reason}` : ""}
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-[210px] flex-col gap-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <p className="mb-1 text-[11px] font-semibold text-slate-700">审核结论模板</p>
                      <div className="grid grid-cols-3 gap-1">
                        {REVIEW_TEMPLATES.map((t) => (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => runReviewTemplate(a.id, t.key)}
                            disabled={actioningId === a.id}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] hover:bg-slate-50 disabled:opacity-50"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button type="button" onClick={() => runAction(a.id, a.isVerified ? "unverify" : "verify")} disabled={actioningId === a.id} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-50">{a.isVerified ? "取消平台认证" : "通过平台认证"}</button>
                    <button type="button" onClick={() => runAction(a.id, a.barNumberVerified ? "bar_unverify" : "bar_verify")} disabled={actioningId === a.id} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-50">{a.barNumberVerified ? "取消执照核验" : "通过执照核验"}</button>
                    <button type="button" onClick={() => runReviewTemplate(a.id, "REQUEST_MORE_INFO")} disabled={actioningId === a.id} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 hover:bg-amber-100 disabled:opacity-50">标记补充材料</button>
                    <a href={`/marketplace/admin/attorneys/${a.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-center hover:bg-slate-50">律师详情</a>
                    {rowMsg[a.id] && <p className="text-xs text-slate-600 text-center">{rowMsg[a.id]}</p>}
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
