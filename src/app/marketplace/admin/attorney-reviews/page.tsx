"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type QueueAttorney = {
  id: string;
  fullName: string;
  firmName: string | null;
  barState: string | null;
  yearsExperience: number | null;
  reviewStatus?: string;
  reviewQueue?: { pendingReviewQueue: boolean; needsReReview: boolean; displayStatus: string };
  reviewChecklist?: { checklistScore: number; missingKeys: string[]; items: Array<{ key: string; label: string; passed: boolean }> };
  completeness: number;
  user: { email: string };
  updatedAt?: string;
};

type VerificationLogItem = {
  id: string;
  attorneyId: string;
  attorneyName: string;
  action: string;
  toStatus: string | null;
  templateKey: string | null;
  templateReply: string | null;
  reason: string | null;
  completenessScore: number | null;
  createdAt: string;
  adminUser: { email: string } | null;
};

const TEMPLATE_OPTIONS = [
  {
    key: "APPROVE_STANDARD",
    label: "通过（标准）",
    action: "review_approve" as const,
    reply:
      "您好，您的律师资料已通过平台审核。后续如修改执照信息、执业州或关键资料，系统会自动进入复审队列。感谢配合。",
  },
  {
    key: "REQUEST_MORE_INFO",
    label: "补充材料",
    action: "review_request_info" as const,
    reply:
      "您好，平台已完成初步审核。当前资料仍需补充（如头像、执照号、执业州、事务所、执业年限或简介）后才能继续认证，请更新后重新提交。",
  },
] as const;

export default function AdminAttorneyReviewsPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const isAdmin = viewer.user?.role === "ADMIN";
  const [items, setItems] = useState<QueueAttorney[]>([]);
  const [logs, setLogs] = useState<VerificationLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewStatus, setReviewStatus] = useState("");
  const [templateKey, setTemplateKey] = useState<(typeof TEMPLATE_OPTIONS)[number]["key"]>("REQUEST_MORE_INFO");
  const [templateReply, setTemplateReply] = useState<string>(TEMPLATE_OPTIONS[1].reply);
  const [q, setQ] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => TEMPLATE_OPTIONS.find((t) => t.key === templateKey) ?? TEMPLATE_OPTIONS[1],
    [templateKey],
  );

  useEffect(() => {
    setTemplateReply(selectedTemplate.reply);
  }, [selectedTemplate.key]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        reviewQueue: "1",
        sort: "review_priority",
        page: String(page),
        pageSize: "20",
      });
      if (reviewStatus) params.set("reviewStatus", reviewStatus);
      if (q.trim()) params.set("q", q.trim());
      const [queueRes, logRes] = await Promise.all([
        fetch(`/api/marketplace/admin/attorneys?${params.toString()}`),
        fetch("/api/marketplace/admin/attorney-verification-logs?page=1&pageSize=12"),
      ]);
      const queueData = await queueRes.json();
      const logData = await logRes.json();
      if (!queueRes.ok) throw new Error(queueData.error || "加载审核队列失败");
      if (!logRes.ok) throw new Error(logData.error || "加载审核日志失败");
      setItems(queueData.items ?? []);
      setTotal(queueData.filters?.total ?? 0);
      setLogs(logData.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    loadData();
  }, [authLoading, isAdmin, reviewStatus, page, q]);

  useEffect(() => setSelectedIds([]), [page, reviewStatus, q]);

  const allSelected = items.length > 0 && items.every((i) => selectedIds.includes(i.id));

  async function submitBatch() {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/marketplace/admin/attorneys/batch-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedTemplate.action,
          templateKey,
          templateReply,
          attorneyIds: selectedIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "批量审核失败");
      setSelectedIds([]);
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "批量审核失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSingle(attorneyId: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/admin/attorneys/${attorneyId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedTemplate.action,
          templateKey,
          templateReply,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "审核失败");
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "审核失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">律师审核队列</h1>
            <p className="mt-2 text-sm text-slate-500">新注册律师与资料变更复审队列，支持模板回复和批量审核。</p>
          </div>
          <AdminTabs />
          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}

          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索姓名/邮箱/律所/执照号" className="min-w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">审核状态（全部）</option>
                {["PENDING_REVIEW","RE_REVIEW_REQUIRED","NEEDS_INFO"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="button" onClick={() => setSelectedIds(allSelected ? [] : items.map((i) => i.id))} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">
                {allSelected ? "取消全选当前页" : "全选当前页"}
              </button>
              <button type="button" onClick={() => setSelectedIds(items.filter((i) => (i.reviewChecklist?.missingKeys?.length ?? 0) > 0).map((i) => i.id))} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">
                仅选资料缺项
              </button>
              <span className="text-xs text-slate-500">队列 {total} 条 · 已选 {selectedIds.length}</span>
            </div>

            <div className="grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-start">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">审核模板</label>
                <select
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value as (typeof TEMPLATE_OPTIONS)[number]["key"])}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {TEMPLATE_OPTIONS.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">审核模板回复（可编辑）</label>
                <textarea
                  value={templateReply}
                  onChange={(e) => setTemplateReply(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 md:flex-col">
                <button type="button" disabled={submitting || selectedIds.length === 0} onClick={submitBatch} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 disabled:opacity-50">
                  批量执行模板
                </button>
                <button type="button" onClick={() => loadData()} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">刷新</button>
              </div>
            </div>
          </section>

          {loading && isAdmin && <p className="text-sm text-slate-500">加载中...</p>}
          {error && isAdmin && <p className="text-sm text-rose-700">加载失败：{error}</p>}

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <section className="space-y-3">
              {items.map((a) => (
                <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedIds.includes(a.id)}
                      onChange={(e) => setSelectedIds((prev) => e.target.checked ? Array.from(new Set([...prev, a.id])) : prev.filter((id) => id !== a.id))}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">{a.reviewQueue?.displayStatus ?? a.reviewStatus ?? "UNKNOWN"}</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">完整度 {a.completeness}%</span>
                        {a.reviewQueue?.needsReReview && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">资料变更复审</span>}
                      </div>
                      <h2 className="text-base font-semibold text-slate-900">{a.fullName || "未填写姓名"}</h2>
                      <p className="text-sm text-slate-600">{a.user.email}</p>
                      <p className="text-xs text-slate-500 mt-1">{a.firmName || "未填写律所"}{a.barState ? ` · ${a.barState}` : ""}{typeof a.yearsExperience === "number" ? ` · ${a.yearsExperience}年` : ""}</p>
                      {a.reviewChecklist && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {a.reviewChecklist.items.map((it) => (
                            <span key={it.key} className={`rounded-full px-2 py-0.5 text-[11px] ${it.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                              {it.label}{it.passed ? "✓" : "✕"}
                            </span>
                          ))}
                        </div>
                      )}
                      {!!a.reviewChecklist?.missingKeys?.length && (
                        <p className="mt-1 text-xs text-rose-700">缺项：{a.reviewChecklist.missingKeys.join("、")}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={submitting} onClick={() => submitSingle(a.id)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-50">对该律师执行模板</button>
                        <Link href={`/marketplace/admin/attorneys/${a.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">查看详情</Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">AttorneyVerificationLog 审计表（最近12条）</h2>
              <p className="mt-1 text-xs text-slate-500">记录审核动作、模板回复、字段变更 diff（旧值→新值）。</p>
              <div className="mt-3 space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">{log.action}</span>
                      {log.toStatus && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] text-blue-700">{log.toStatus}</span>}
                      <span className="text-[11px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-800">{log.attorneyName}</p>
                    <p className="text-[11px] text-slate-500">{log.adminUser?.email ?? "系统/未知管理员"}</p>
                    {log.reason && <p className="mt-1 text-xs text-slate-600">原因：{log.reason}</p>}
                    {log.templateReply && <p className="mt-1 line-clamp-3 text-xs text-slate-600">模板回复：{log.templateReply}</p>}
                    <Link href={`/marketplace/admin/attorneys/${log.attorneyId}`} className="mt-2 inline-block text-xs underline">打开律师详情</Link>
                  </div>
                ))}
                {logs.length === 0 && <p className="text-xs text-slate-500">暂无审核日志。</p>}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
