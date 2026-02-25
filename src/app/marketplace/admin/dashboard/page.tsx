"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { AdminTabs } from "@/components/admin/admin-tabs";

type DashboardResponse = {
  metrics?: Record<string, number | null>;
  funnels?: {
    sevenDays?: { newCases: number; newBids: number; selectedBids: number; bidRate: number; selectionRate: number };
    thirtyDays?: { newCases: number; newBids: number; selectedBids: number; bidRate: number; selectionRate: number };
  };
  breakdowns?: {
    categories30d?: Array<{ bucket: string; published: number; quoted: number; selected: number; contacted: number; engaged: number; quoteRate: number; selectRate: number; contactRate: number; engageRate: number }>;
    states30d?: Array<{ bucket: string; published: number; quoted: number; selected: number; contacted: number; engaged: number; quoteRate: number; selectRate: number; contactRate: number; engageRate: number }>;
  };
  tabs?: {
    growth?: {
      totals: { totalCases: number; totalBids: number; totalConversations: number; totalUsers: number; totalAttorneys: number; verifiedAttorneys: number };
      new7d: { cases: number; bids: number; selectedBids: number };
      new30d: { cases: number; bids: number; selectedBids: number; payments: number };
    };
    conversion?: {
      funnel30d: { published: number; quoted: number; selected: number; contacted: number; engaged: number; paid: number };
      rates30d: { quoteRate: number; selectRate: number; contactRate: number; engageRate: number; payRate: number };
      categorySupplyDemand30d: Array<{ bucket: string; cases: number; validBids: number; selected: number; bidsPerCase: number; selectionPerCase: number }>;
      stateSupplyDemand30d: Array<{ bucket: string; cases: number; validBids: number; selected: number; bidsPerCase: number; selectionPerCase: number }>;
    };
    quality?: {
      avgFirstBidResponseHours: number | null;
      avgFirstAttorneyMessageHours: number | null;
      quoteToSelectionRate30d: number;
    };
    risk?: {
      summary30d: { reports: number; blacklists: number; ruleHits: number; activeBlacklists: number };
      trends30d: {
        reports: Array<{ label: string; value: number }>;
        blacklists: Array<{ label: string; value: number }>;
        ruleHits: Array<{ label: string; value: number }>;
      };
    };
    support?: {
      sla30d: { total: number; withSla: number; firstResponseOnTime: number; resolvedOnTime: number; breachedOpen: number };
      slaRates30d: { firstResponseRate: number; resolvedRate: number };
      ticketCounts30d: { supportTickets: number; disputes: number };
    };
  };
  error?: string;
};

export default function AdminDashboardPage() {
  return (<Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">加载中...</div>}><AdminDashboardInner /></Suspense>);
}

function AdminDashboardInner() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"growth" | "conversion" | "quality" | "risk" | "support">("growth");

  useEffect(() => {
    if (authLoading) return;
    if (viewer.user?.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch("/api/marketplace/admin/dashboard")
      .then(async (r) => {
        const json = (await r.json()) as DashboardResponse;
        if (!r.ok) throw new Error(json.error || "Failed to load");
        return json;
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [authLoading, viewer.user?.role]);

  useEffect(() => {
    const v = (searchParams.get("tab") ?? "").trim();
    if (["growth", "conversion", "quality", "risk", "support"].includes(v)) {
      setTab(v as typeof tab);
    }
  }, [searchParams]);

  const isAdmin = viewer.user?.role === "ADMIN";
  const cards = [
    ["总案件", data?.metrics?.totalCases],
    ["开放案件", data?.metrics?.openCases],
    ["总报价", data?.metrics?.totalBids],
    ["待处理报价", data?.metrics?.pendingBids],
    ["总会话", data?.metrics?.totalConversations],
    ["开放会话", data?.metrics?.openConversations],
    ["总用户", data?.metrics?.totalUsers],
    ["律师数", data?.metrics?.totalAttorneys],
    ["已认证律师", data?.metrics?.verifiedAttorneys],
    ["平均首报时长(h)", data?.metrics?.avgResponseHours],
    ["平均首消息时长(h)", data?.metrics?.avgFirstAttorneyMessageHours],
  ] as const;

  const dashboardTabs: Array<{ key: "growth" | "conversion" | "quality" | "risk" | "support"; label: string }> = [
    { key: "growth", label: "增长" },
    { key: "conversion", label: "转化" },
    { key: "quality", label: "质量" },
    { key: "risk", label: "风控" },
    { key: "support", label: "客服" },
  ];

  function Sparkline({ points, color = "bg-slate-700" }: { points: Array<{ label: string; value: number }>; color?: string }) {
    const max = Math.max(...points.map((p) => p.value), 1);
    return (
      <div className="mt-2 flex items-end gap-1 h-16">
        {points.map((p) => (
          <div key={p.label} title={`${p.label}: ${p.value}`} className="flex-1">
            <div className={`${color} w-full rounded-t`} style={{ height: `${Math.max((p.value / max) * 100, p.value > 0 ? 8 : 2)}%` }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">运营看板</h1>
              <p className="mt-2 text-sm text-slate-500">新增案件、报价率、选标率、平均响应时长等核心指标。</p>
            </div>
            <Link href="/marketplace/admin/cases" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">
              去案件审核
            </Link>
          </div>
          <AdminTabs />

          {!authLoading && !isAdmin && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              该页面仅管理员可用。当前角色：{viewer.user?.role ?? "ANONYMOUS"}。
            </div>
          )}
          {loading && isAdmin && <p className="text-sm text-slate-500">加载看板中...</p>}
          {error && isAdmin && <p className="text-sm text-rose-700">加载失败：{error}</p>}

          {isAdmin && !loading && !error && (
            <div className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {cards.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{value ?? "-"}</p>
                  </div>
                ))}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {dashboardTabs.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setTab(t.key);
                        const next = new URLSearchParams(searchParams.toString());
                        next.set("tab", t.key);
                        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs ${tab === t.key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}${pathname}?${new URLSearchParams({ ...(tab ? { tab } : {}) }).toString()}`;
                      navigator.clipboard.writeText(url).catch(() => null);
                    }}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
                  >
                    复制当前看板链接
                  </button>
                </div>
              </section>

              {tab === "growth" && (
              <section className="grid gap-4 lg:grid-cols-2">
                {([
                  ["最近7天", data?.funnels?.sevenDays],
                  ["最近30天", data?.funnels?.thirtyDays],
                ] as const).map(([label, f]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3">新增案件：<span className="font-semibold">{f?.newCases ?? 0}</span></div>
                      <div className="rounded-xl bg-slate-50 p-3">新增报价：<span className="font-semibold">{f?.newBids ?? 0}</span></div>
                      <div className="rounded-xl bg-slate-50 p-3">已选中报价：<span className="font-semibold">{f?.selectedBids ?? 0}</span></div>
                      <div className="rounded-xl bg-slate-50 p-3">报价率：<span className="font-semibold">{((f?.bidRate ?? 0) * 100).toFixed(0)}%</span></div>
                      <div className="rounded-xl bg-slate-50 p-3 col-span-2">选标率：<span className="font-semibold">{((f?.selectionRate ?? 0) * 100).toFixed(0)}%</span></div>
                    </div>
                  </div>
                ))}
              </section>
              )}

              {tab === "conversion" && (
              <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">转化漏斗（30天）</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-6 text-sm">
                  {Object.entries(data?.tabs?.conversion?.funnel30d ?? {}).map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">{k}</div>
                      <div className="mt-1 text-xl font-semibold">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span>报价率 {(((data?.tabs?.conversion?.rates30d?.quoteRate ?? 0) * 100)).toFixed(0)}%</span>
                  <span>选中率 {(((data?.tabs?.conversion?.rates30d?.selectRate ?? 0) * 100)).toFixed(0)}%</span>
                  <span>沟通率 {(((data?.tabs?.conversion?.rates30d?.contactRate ?? 0) * 100)).toFixed(0)}%</span>
                  <span>委托率 {(((data?.tabs?.conversion?.rates30d?.engageRate ?? 0) * 100)).toFixed(0)}%</span>
                  <span>支付率 {(((data?.tabs?.conversion?.rates30d?.payRate ?? 0) * 100)).toFixed(0)}%</span>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                {([
                  ["类目供需（30天）", data?.tabs?.conversion?.categorySupplyDemand30d],
                  ["州别供需（30天）", data?.tabs?.conversion?.stateSupplyDemand30d],
                ] as const).map(([title, rows]) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="text-slate-500">
                          <tr>
                            <th className="px-2 py-2 text-left">维度</th>
                            <th className="px-2 py-2 text-right">案件数</th>
                            <th className="px-2 py-2 text-right">有效报价数</th>
                            <th className="px-2 py-2 text-right">已选数</th>
                            <th className="px-2 py-2 text-right">报价/案</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(rows ?? []).map((r) => (
                            <tr key={r.bucket} className="border-t border-slate-100">
                              <td className="px-2 py-2">{r.bucket}</td>
                              <td className="px-2 py-2 text-right">{r.cases}</td>
                              <td className="px-2 py-2 text-right">{r.validBids}</td>
                              <td className="px-2 py-2 text-right">{r.selected}</td>
                              <td className="px-2 py-2 text-right">{r.bidsPerCase}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </section>
              </>
              )}

              {tab === "quality" && (
              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">平均首报时长（律师）</p><p className="mt-2 text-2xl font-bold">{data?.tabs?.quality?.avgFirstBidResponseHours ?? "-" } h</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">平均首条消息时长（律师）</p><p className="mt-2 text-2xl font-bold">{data?.tabs?.quality?.avgFirstAttorneyMessageHours ?? "-" } h</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">报价转化率（30天）</p><p className="mt-2 text-2xl font-bold">{(((data?.tabs?.quality?.quoteToSelectionRate30d ?? 0) * 100)).toFixed(0)}%</p></div>
              </section>
              )}

              {tab === "risk" && (
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">风控趋势（30天）</h2>
                  <div className="mt-4 grid gap-4">
                    <div><p className="text-xs text-slate-500">举报（{data?.tabs?.risk?.summary30d?.reports ?? 0}）</p><Sparkline points={data?.tabs?.risk?.trends30d?.reports ?? []} color="bg-rose-500" /></div>
                    <div><p className="text-xs text-slate-500">黑名单（{data?.tabs?.risk?.summary30d?.blacklists ?? 0}，活跃 {data?.tabs?.risk?.summary30d?.activeBlacklists ?? 0}）</p><Sparkline points={data?.tabs?.risk?.trends30d?.blacklists ?? []} color="bg-amber-500" /></div>
                    <div><p className="text-xs text-slate-500">规则命中（{data?.tabs?.risk?.summary30d?.ruleHits ?? 0}）</p><Sparkline points={data?.tabs?.risk?.trends30d?.ruleHits ?? []} color="bg-slate-700" /></div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">风险摘要</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">举报数：<b>{data?.tabs?.risk?.summary30d?.reports ?? 0}</b></div>
                    <div className="rounded-xl bg-slate-50 p-3">黑名单新增：<b>{data?.tabs?.risk?.summary30d?.blacklists ?? 0}</b></div>
                    <div className="rounded-xl bg-slate-50 p-3">规则命中：<b>{data?.tabs?.risk?.summary30d?.ruleHits ?? 0}</b></div>
                    <div className="rounded-xl bg-slate-50 p-3">活跃黑名单：<b>{data?.tabs?.risk?.summary30d?.activeBlacklists ?? 0}</b></div>
                  </div>
                </div>
              </section>
              )}

              {tab === "support" && (
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">客服 SLA 达标率（30天）</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">工单总量：<b>{data?.tabs?.support?.sla30d?.total ?? 0}</b></div>
                    <div className="rounded-xl bg-slate-50 p-3">有 SLA：<b>{data?.tabs?.support?.sla30d?.withSla ?? 0}</b></div>
                    <div className="rounded-xl bg-slate-50 p-3">首次响应按时：<b>{data?.tabs?.support?.sla30d?.firstResponseOnTime ?? 0}</b></div>
                    <div className="rounded-xl bg-slate-50 p-3">解决按时：<b>{data?.tabs?.support?.sla30d?.resolvedOnTime ?? 0}</b></div>
                    <div className="rounded-xl bg-slate-50 p-3">首次响应达标率：<b>{(((data?.tabs?.support?.slaRates30d?.firstResponseRate ?? 0) * 100)).toFixed(0)}%</b></div>
                    <div className="rounded-xl bg-slate-50 p-3">解决达标率：<b>{(((data?.tabs?.support?.slaRates30d?.resolvedRate ?? 0) * 100)).toFixed(0)}%</b></div>
                    <div className="rounded-xl bg-rose-50 p-3 col-span-2">超时未处理（open breach）：<b className="text-rose-700">{data?.tabs?.support?.sla30d?.breachedOpen ?? 0}</b></div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">客服工作量（30天）</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">客服消息单：<b>{data?.tabs?.support?.ticketCounts30d?.supportTickets ?? 0}</b></div>
                    <div className="rounded-xl bg-slate-50 p-3">争议工单：<b>{data?.tabs?.support?.ticketCounts30d?.disputes ?? 0}</b></div>
                  </div>
                </div>
              </section>
              )}

              {/* 保留原类目/州漏斗视图作为详细补充，放在增长页下方 */}
              {tab === "growth" && (
              <section className="grid gap-4 lg:grid-cols-2">
                {([
                  ["类目漏斗（30天）", data?.breakdowns?.categories30d],
                  ["州别漏斗（30天）", data?.breakdowns?.states30d],
                ] as const).map(([title, rows]) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="text-slate-500">
                          <tr>
                            <th className="px-2 py-2 text-left">维度</th>
                            <th className="px-2 py-2 text-right">发布</th>
                            <th className="px-2 py-2 text-right">报价</th>
                            <th className="px-2 py-2 text-right">已选</th>
                            <th className="px-2 py-2 text-right">沟通</th>
                            <th className="px-2 py-2 text-right">委托</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(rows ?? []).map((r) => (
                            <tr key={r.bucket} className="border-t border-slate-100">
                              <td className="px-2 py-2">
                                <div className="font-medium text-slate-800">{r.bucket}</div>
                                <div className="text-[11px] text-slate-500">
                                  报价率 {(r.quoteRate * 100).toFixed(0)}% · 选中率 {(r.selectRate * 100).toFixed(0)}%
                                </div>
                              </td>
                              <td className="px-2 py-2 text-right">{r.published}</td>
                              <td className="px-2 py-2 text-right">{r.quoted}</td>
                              <td className="px-2 py-2 text-right">{r.selected}</td>
                              <td className="px-2 py-2 text-right">{r.contacted}</td>
                              <td className="px-2 py-2 text-right">{r.engaged}</td>
                            </tr>
                          ))}
                          {(rows ?? []).length === 0 && (
                            <tr><td className="px-2 py-3 text-slate-500" colSpan={6}>暂无数据</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </section>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
