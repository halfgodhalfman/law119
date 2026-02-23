"use client";

import { useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type QualityItem = {
  attorneyId: string;
  attorneyName: string;
  email: string;
  firmName: string | null;
  isVerified: boolean;
  reviewStatus: string;
  bidsCount: number;
  acceptedBidsCount: number;
  conversationsCount: number;
  closedConversationsCount: number;
  reportsCount: number;
  disputesCount: number;
  resolvedDisputesCount: number;
  refundLinkedCount: number;
  paymentOrdersCount: number;
  ruleHitCount: number;
  ruleBlockCount: number;
  activeBlacklistCount: number;
  avgFirstBidMinutes: number | null;
  avgFirstMessageMinutes: number | null;
  bidConversionRate: number;
  completionRate: number;
  disputeRate: number;
  complaintRate: number;
  refundLinkedRate: number;
  complianceRiskScore: number;
  qualityScore: number;
};

type QualityResponse = {
  ok?: boolean;
  items?: QualityItem[];
  filters?: { period: string; sort: string; q: string; riskOnly: boolean; highConversionOnly: boolean; page: number; pageSize: number; total: number; totalPages: number };
  snapshotsTop?: Array<{ attorneyId: string; attorneyName: string; qualityScore: number; complianceRiskScore: number; bidConversionRate: number }>;
  trendSeries?: Array<{
    periodStart: string;
    attorneyCount: number;
    avgQualityScore: number;
    avgRiskScore: number;
    avgBidConversionRate: number;
    avgComplaintRate: number;
    avgDisputeRate: number;
    avgFirstBidMinutes: number | null;
    avgFirstMessageMinutes: number | null;
  }>;
  error?: string;
};

function Sparkline({
  values,
  color = "#0f172a",
  width = 220,
  height = 56,
}: {
  values: Array<number | null | undefined>;
  color?: string;
  width?: number;
  height?: number;
}) {
  const nums = values.map((v) => (typeof v === "number" ? v : null));
  const valid = nums.filter((v): v is number => v != null);
  if (valid.length === 0) {
    return <div className="text-[11px] text-slate-400">暂无趋势数据</div>;
  }
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = Math.max(max - min, 1);
  const points = nums.map((v, i) => {
    const x = values.length <= 1 ? width / 2 : (i / (values.length - 1)) * (width - 2) + 1;
    const y = v == null ? null : height - 2 - ((v - min) / range) * (height - 4);
    return { x, y, v };
  });
  const path = points
    .filter((p): p is { x: number; y: number; v: number | null } & { y: number } => p.y != null)
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <rect x="0" y="0" width={width} height={height} rx="8" fill="#f8fafc" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" />
      {points.map((p, i) =>
        p.y == null ? null : (
          <circle key={i} cx={p.x} cy={p.y} r="2.2" fill={color}>
            <title>{`${i + 1}: ${p.v}`}</title>
          </circle>
        ),
      )}
    </svg>
  );
}

export default function AdminAttorneyQualityPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const isAdmin = viewer.user?.role === "ADMIN";
  const [items, setItems] = useState<QualityItem[]>([]);
  const [snapshotsTop, setSnapshotsTop] = useState<QualityResponse["snapshotsTop"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30d");
  const [sort, setSort] = useState("risk_desc");
  const [q, setQ] = useState("");
  const [riskOnly, setRiskOnly] = useState(false);
  const [highConversionOnly, setHighConversionOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [refreshingSnapshots, setRefreshingSnapshots] = useState(false);
  const [trendSeries, setTrendSeries] = useState<NonNullable<QualityResponse["trendSeries"]>>([]);
  const [trendMetric, setTrendMetric] = useState<"first_message_sla" | "complaint_rate" | "dispute_rate">("first_message_sla");

  const summary = useMemo(() => {
    if (items.length === 0) return null;
    const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
    return {
      avgRisk: avg(items.map((i) => i.complianceRiskScore)),
      avgQuality: avg(items.map((i) => i.qualityScore)),
      avgBidSla: avg(items.filter((i) => i.avgFirstBidMinutes != null).map((i) => i.avgFirstBidMinutes!)),
      avgMsgSla: avg(items.filter((i) => i.avgFirstMessageMinutes != null).map((i) => i.avgFirstMessageMinutes!)),
    };
  }, [items]);

  async function loadData(refresh = false) {
    setLoading(!refresh);
    setError(null);
    const params = new URLSearchParams({
      period,
      sort,
      page: String(page),
      pageSize: "20",
    });
    if (q.trim()) params.set("q", q.trim());
    if (riskOnly) params.set("riskOnly", "1");
    if (highConversionOnly) params.set("highConversionOnly", "1");
    if (refresh) params.set("refreshSnapshots", "1");
    const r = await fetch(`/api/marketplace/admin/attorney-quality?${params.toString()}`);
    const data = (await r.json()) as QualityResponse;
    if (!r.ok) throw new Error(data.error || "加载失败");
    setItems(data.items ?? []);
    setSnapshotsTop(data.snapshotsTop ?? []);
    setTrendSeries(data.trendSeries ?? []);
    setMeta({
      page: data.filters?.page ?? 1,
      totalPages: data.filters?.totalPages ?? 1,
      total: data.filters?.total ?? 0,
    });
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadData().catch((e) => {
      setError(e instanceof Error ? e.message : "加载失败");
      setLoading(false);
    });
  }, [authLoading, isAdmin, period, sort, q, riskOnly, highConversionOnly, page]);

  useEffect(() => setPage(1), [period, sort, q, riskOnly, highConversionOnly]);

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  const mins = (v: number | null) => (v == null ? "-" : v < 60 ? `${v}m` : `${Math.floor(v / 60)}h ${v % 60}m`);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Attorney Quality Console</h1>
            <p className="mt-2 text-sm text-slate-500">响应速度、转化率、投诉/争议、退款关联率、合规风险分与质量分。</p>
          </div>
          <AdminTabs />

          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}

          {isAdmin && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="grid gap-3 md:grid-cols-6">
                <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="30d">最近30天</option>
                  <option value="7d">最近7天</option>
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="risk_desc">高风险优先</option>
                  <option value="conversion_desc">高转化优先</option>
                  <option value="quality_desc">质量分高优先</option>
                  <option value="response_asc">首报更快优先</option>
                </select>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索律师/邮箱/律所" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <input type="checkbox" checked={riskOnly} onChange={(e) => setRiskOnly(e.target.checked)} />
                  高风险律师
                </label>
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <input type="checkbox" checked={highConversionOnly} onChange={(e) => setHighConversionOnly(e.target.checked)} />
                  高转化律师
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={refreshingSnapshots}
                  onClick={async () => {
                    try {
                      setRefreshingSnapshots(true);
                      await loadData(true);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "刷新失败");
                    } finally {
                      setRefreshingSnapshots(false);
                    }
                  }}
                  className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 disabled:opacity-50"
                >
                  {refreshingSnapshots ? "生成快照中..." : "生成/刷新 AttorneyScoreSnapshot"}
                </button>
                <span className="text-xs text-slate-500">共 {meta.total} 位律师</span>
              </div>
            </div>
          )}

          {loading && isAdmin && <p className="text-sm text-slate-500">加载质量控制台中...</p>}
          {error && isAdmin && <p className="text-sm text-rose-700">加载失败：{error}</p>}

          {isAdmin && !loading && !error && (
            <div className="space-y-4">
              <section className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">平均风险分</p><p className="mt-2 text-2xl font-bold">{summary?.avgRisk ?? "-"}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">平均质量分</p><p className="mt-2 text-2xl font-bold">{summary?.avgQuality ?? "-"}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">平均首报时长</p><p className="mt-2 text-2xl font-bold">{mins(summary?.avgBidSla ?? null)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">平均首消息时长</p><p className="mt-2 text-2xl font-bold">{mins(summary?.avgMsgSla ?? null)}</p></div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-900">AttorneyScoreSnapshot 趋势图（质量分 / 风险分）</h2>
                  <p className="mt-1 text-xs text-slate-500">读取日/周快照聚合序列（按当前时间窗口粒度）。</p>
                  <div className="mt-3 grid gap-3">
                    <div>
                      <div className="mb-1 text-xs text-slate-600">平均质量分</div>
                      <Sparkline values={trendSeries.map((t) => t.avgQualityScore)} color="#0f766e" />
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-slate-600">平均合规风险分</div>
                      <Sparkline values={trendSeries.map((t) => t.avgRiskScore)} color="#b91c1c" />
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-900">AttorneyScoreSnapshot 趋势图（转化 / SLA）</h2>
                  <p className="mt-1 text-xs text-slate-500">用于观察质量与效率变化趋势。</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setTrendMetric("first_message_sla")} className={`rounded-full px-2 py-1 text-[11px] ${trendMetric === "first_message_sla" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>首消息时长</button>
                    <button type="button" onClick={() => setTrendMetric("complaint_rate")} className={`rounded-full px-2 py-1 text-[11px] ${trendMetric === "complaint_rate" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>投诉率</button>
                    <button type="button" onClick={() => setTrendMetric("dispute_rate")} className={`rounded-full px-2 py-1 text-[11px] ${trendMetric === "dispute_rate" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>争议率</button>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <div>
                      <div className="mb-1 text-xs text-slate-600">平均报价转化率（%）</div>
                      <Sparkline values={trendSeries.map((t) => Math.round((t.avgBidConversionRate ?? 0) * 100))} color="#2563eb" />
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-slate-600">
                        {trendMetric === "first_message_sla" ? "平均首消息时长（分钟）" : trendMetric === "complaint_rate" ? "平均投诉率（%）" : "平均争议率（%）"}
                      </div>
                      <Sparkline
                        values={trendSeries.map((t) =>
                          trendMetric === "first_message_sla"
                            ? t.avgFirstMessageMinutes
                            : trendMetric === "complaint_rate"
                              ? Math.round((t.avgComplaintRate ?? 0) * 100)
                              : Math.round((t.avgDisputeRate ?? 0) * 100),
                        )}
                        color={trendMetric === "first_message_sla" ? "#7c3aed" : trendMetric === "complaint_rate" ? "#dc2626" : "#ea580c"}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="px-2 py-2 text-left">律师</th>
                        <th className="px-2 py-2 text-right">风险分</th>
                        <th className="px-2 py-2 text-right">质量分</th>
                        <th className="px-2 py-2 text-right">首报</th>
                        <th className="px-2 py-2 text-right">首消息</th>
                        <th className="px-2 py-2 text-right">报价转化率</th>
                        <th className="px-2 py-2 text-right">投诉率</th>
                        <th className="px-2 py-2 text-right">争议率</th>
                        <th className="px-2 py-2 text-right">完成率</th>
                        <th className="px-2 py-2 text-right">退款关联率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.attorneyId} className="border-t border-slate-100">
                          <td className="px-2 py-2">
                            <div className="font-medium text-slate-900">{it.attorneyName}</div>
                            <div className="text-[11px] text-slate-500">{it.email}</div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {it.complianceRiskScore >= 50 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700">高风险</span>}
                              {it.bidConversionRate >= 0.2 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">高转化</span>}
                              {!it.isVerified && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">未认证</span>}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right">{it.complianceRiskScore}</td>
                          <td className="px-2 py-2 text-right">{it.qualityScore}</td>
                          <td className="px-2 py-2 text-right">{mins(it.avgFirstBidMinutes)}</td>
                          <td className="px-2 py-2 text-right">{mins(it.avgFirstMessageMinutes)}</td>
                          <td className="px-2 py-2 text-right">{pct(it.bidConversionRate)}</td>
                          <td className="px-2 py-2 text-right">{pct(it.complaintRate)}</td>
                          <td className="px-2 py-2 text-right">{pct(it.disputeRate)}</td>
                          <td className="px-2 py-2 text-right">{pct(it.completionRate)}</td>
                          <td className="px-2 py-2 text-right">{pct(it.refundLinkedRate)}</td>
                        </tr>
                      ))}
                      {items.length === 0 && <tr><td colSpan={10} className="px-2 py-4 text-slate-500">无数据</td></tr>}
                    </tbody>
                  </table>
                </div>

                <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-900">AttorneyScoreSnapshot 快照（Top 5）</h2>
                  <p className="mt-1 text-xs text-slate-500">当前窗口的质量快照样本（用于日/周聚合留档）。</p>
                  <div className="mt-3 space-y-2">
                    {(snapshotsTop ?? []).map((s) => (
                      <div key={s.attorneyId} className="rounded-lg border border-slate-200 p-3">
                        <div className="text-sm font-medium text-slate-900">{s.attorneyName}</div>
                        <div className="mt-1 text-xs text-slate-600">质量分 {s.qualityScore} · 风险分 {s.complianceRiskScore}</div>
                        <div className="text-xs text-slate-500">报价转化率 {pct(s.bidConversionRate)}</div>
                      </div>
                    ))}
                    {(snapshotsTop ?? []).length === 0 && <p className="text-xs text-slate-500">暂无快照，点击“生成/刷新 AttorneyScoreSnapshot”。</p>}
                  </div>
                </aside>
              </section>

              <div className="flex items-center justify-between">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">上一页</button>
                <p className="text-sm text-slate-500">第 {meta.page} / {meta.totalPages} 页</p>
                <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">下一页</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
