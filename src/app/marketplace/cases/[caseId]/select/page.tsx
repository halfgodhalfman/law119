"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type BidItem = {
  id: string;
  proposalText: string;
  priceMin: string | number | null;
  priceMax: string | number | null;
  feeMode?: string | null;
  serviceScope?: string | null;
  estimatedDays?: number | null;
  includesConsultation?: boolean;
  version?: number;
  status: string;
  updatedAt?: string;
  attorneyProfileId: string;
  attorneyTrust?: {
    totalScore: number;
    grade: "A+" | "A" | "B" | "C";
    credentialsScore: number;
    qualitySignalScore: number;
    complianceScore: number;
    serviceScore: number;
    reviewAvg: number | null;
    reviewCount: number;
  } | null;
};

type CaseDetail = {
  id: string;
  title: string;
  status: string;
  category: string;
  stateCode: string;
  city: string | null;
  quoteCount: number;
  selectedBidId?: string | null;
  bids: BidItem[];
  viewer?: {
    canSelectBid: boolean;
    isOwnerClient: boolean;
    role: "ANONYMOUS" | "CLIENT" | "ATTORNEY" | "ADMIN";
  };
};

function formatPrice(min: string | number | null, max: string | number | null) {
  if (min == null && max == null) return "未填写";
  if (`${min}` === `${max}`) return `$${min}`;
  return `$${min ?? "?"} - $${max ?? "?"}`;
}

function numericPrice(bid: BidItem) {
  const v = bid.priceMax ?? bid.priceMin;
  return v == null ? null : Number(v);
}

function rankingScore(bid: BidItem) {
  const trust = bid.attorneyTrust?.totalScore ?? 60;
  const quality = bid.attorneyTrust?.qualitySignalScore ?? 7;
  const compliance = bid.attorneyTrust?.complianceScore ?? 5;
  const price = numericPrice(bid);
  const pricePenalty = price == null ? 0 : Math.min(20, Math.round(price / 500));
  return trust * 0.6 + quality * 2 + compliance * 1.5 - pricePenalty;
}

function formatDateTime(input?: string | null) {
  if (!input) return "未记录";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "无效时间";
  return d.toLocaleString();
}

function summarize(text: string, len = 90) {
  const t = (text || "").trim();
  if (!t) return "未填写";
  return t.length > len ? `${t.slice(0, len)}...` : t;
}

export default function MarketplaceSelectBidPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingBidId, setSubmittingBidId] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [resultEngagementId, setResultEngagementId] = useState<string | null>(null);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [confirmBid, setConfirmBid] = useState<BidItem | null>(null);
  const { viewer, loading: authLoading } = useMarketplaceAuth();

  useEffect(() => {
    if (!caseId) return;
    let canceled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/marketplace/cases/${caseId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load");
        return data;
      })
      .then((data) => {
        if (!canceled) setDetail(data.case ?? null);
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
  }, [caseId, resultMsg]);

  const selectableBids = useMemo(
    () => (detail?.bids ?? []).filter((b) => b.status !== "WITHDRAWN"),
    [detail],
  );

  const rankedBids = useMemo(() => {
    return [...selectableBids].sort((a, b) => {
      const byComposite = rankingScore(b) - rankingScore(a);
      if (byComposite !== 0) return byComposite;
      return (numericPrice(a) ?? Number.MAX_SAFE_INTEGER) - (numericPrice(b) ?? Number.MAX_SAFE_INTEGER);
    });
  }, [selectableBids]);

  useEffect(() => {
    setSelectedCompareIds((prev) => prev.filter((id) => selectableBids.some((b) => b.id === id)));
  }, [selectableBids]);

  const compareBids = useMemo(() => {
    const selected = rankedBids.filter((b) => selectedCompareIds.includes(b.id));
    if (selected.length > 0) return selected.slice(0, 3);
    return rankedBids.slice(0, Math.min(3, rankedBids.length));
  }, [rankedBids, selectedCompareIds]);

  const compareMetrics = useMemo(() => {
    const prices = compareBids.map((b) => numericPrice(b)).filter((v): v is number => v != null && !Number.isNaN(v));
    const days = compareBids.map((b) => b.estimatedDays).filter((v): v is number => typeof v === "number");
    return {
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      minDays: days.length ? Math.min(...days) : null,
      maxDays: days.length ? Math.max(...days) : null,
    };
  }, [compareBids]);

  function toggleCompareBid(bidId: string) {
    setSelectedCompareIds((prev) => {
      if (prev.includes(bidId)) return prev.filter((id) => id !== bidId);
      if (prev.length >= 3) return [...prev.slice(1), bidId];
      return [...prev, bidId];
    });
  }

  async function selectBid(bidId: string) {
    if (!caseId) return;
    setSubmittingBidId(bidId);
    setResultMsg(null);
    setResultEngagementId(null);
    try {
      const r = await fetch(`/api/marketplace/cases/${caseId}/select-bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "选择失败");
      setResultMsg(`已选择报价 ${bidId.slice(-6)}，会话 ID: ${data.conversationId ?? "未创建"}。其他待选报价已自动拒绝。`);
      setResultEngagementId(data.engagementConfirmationId ?? null);
      setConfirmBid(null);
    } catch (e: unknown) {
      setResultMsg(`选择失败：${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSubmittingBidId(null);
    }
  }

  const canSelect = Boolean(detail?.viewer?.canSelectBid);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Marketplace MVP</p>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">发布方选择报价页（对比模式）</h1>
              <p className="text-sm text-slate-500 mt-2">
                借鉴华人帮帮网的“先对比再确认”流程，让选择动作更像决策页而不是普通按钮列表。
              </p>
              {!authLoading && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">当前角色：{viewer.user?.role ?? "ANONYMOUS"}</span>
                  <Link href="/marketplace/my-cases" className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200">我的案件</Link>
                  <Link href="/marketplace/case-hall" className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200">案件大厅</Link>
                </div>
              )}
            </div>
            {caseId && (
              <Link href={`/marketplace/cases/${caseId}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">
                返回案件详情
              </Link>
            )}
          </div>

          {loading && <p className="text-sm text-slate-500">加载报价中...</p>}
          {error && <p className="text-sm text-rose-700">加载失败：{error}</p>}

          {detail && (
            <>
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-5">
                <h2 className="text-lg font-semibold text-slate-900">{detail.title}</h2>
                <p className="text-sm text-slate-500 mt-2">
                  {detail.category} · {detail.stateCode} {detail.city ?? ""} · 状态 {detail.status} · 共 {detail.quoteCount} 条报价
                </p>
                {detail.selectedBidId && (
                  <p className="mt-2 text-sm text-emerald-700">
                    当前已选报价：#{detail.selectedBidId.slice(-6)}（可重新选择以覆盖）
                  </p>
                )}
              </section>

              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">报价对比表（最多 3 个）</h3>
                    <p className="text-sm text-slate-500 mt-1">默认按综合推荐（信任/质量 + 价格弱权重）排序，先勾选要比较的报价再确认选择。</p>
                    <details className="mt-2 text-xs text-slate-600">
                      <summary className="cursor-pointer select-none text-blue-700">综合推荐说明（为何不是只按价格排序）</summary>
                      <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-3 leading-5 text-slate-700">
                        平台会综合参考律师信任分（资质验证、质量表现、合规表现）与报价金额进行排序。价格仅作为弱权重因素，
                        目的是减少“单纯低价竞争”，帮助发布方更稳妥地比较律师专业度与服务质量。
                      </div>
                    </details>
                  </div>
                  <span className="text-sm text-slate-500">已选择比较 {compareBids.length} / 3</span>
                </div>

                {!authLoading && !canSelect && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    仅案件发布方（或管理员）可选择报价。当前角色：{viewer.user?.role ?? "ANONYMOUS"}。
                  </div>
                )}

                {compareBids.length > 0 ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-[900px] w-full border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-slate-50 border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">对比项</th>
                          {compareBids.map((bid) => (
                            <th key={bid.id} className="bg-slate-50 border border-slate-200 px-3 py-2 text-left">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">报价 #{bid.id.slice(-6)}</p>
                                  <p className="text-xs text-slate-500 mt-1">律师档案：{bid.attorneyProfileId}</p>
                                </div>
                                {detail.selectedBidId === bid.id && (
                                  <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">当前已选</span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="sticky left-0 z-10 bg-white border border-slate-200 px-3 py-2 text-sm font-medium">报价金额</td>
                          {compareBids.map((bid) => {
                            const price = numericPrice(bid);
                            const isBest = price != null && compareMetrics.minPrice != null && price === compareMetrics.minPrice && compareMetrics.minPrice !== compareMetrics.maxPrice;
                            return (
                              <td key={`${bid.id}-price`} className={`border border-slate-200 px-3 py-2 text-sm ${isBest ? "bg-emerald-50" : ""}`}>
                                <div className="font-semibold text-slate-900">{formatPrice(bid.priceMin, bid.priceMax)}</div>
                                {isBest && <span className="text-xs text-emerald-700">当前比较中价格更低</span>}
                              </td>
                            );
                          })}
                        </tr>
                        <tr>
                          <td className="sticky left-0 z-10 bg-white border border-slate-200 px-3 py-2 text-sm font-medium">收费模式</td>
                          {compareBids.map((bid) => (
                            <td key={`${bid.id}-fee`} className="border border-slate-200 px-3 py-2 text-sm">
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{bid.feeMode ?? "CUSTOM"}</span>
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="sticky left-0 z-10 bg-white border border-slate-200 px-3 py-2 text-sm font-medium">律师信任分</td>
                          {compareBids.map((bid) => (
                            <td key={`${bid.id}-trust`} className="border border-slate-200 px-3 py-2 text-sm">
                              {bid.attorneyTrust ? (
                                <div className="space-y-1">
                                  <div className="font-semibold text-slate-900">
                                    {bid.attorneyTrust.totalScore}/100
                                    <span className="ml-1 text-xs text-slate-500">({bid.attorneyTrust.grade})</span>
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    资质 {bid.attorneyTrust.credentialsScore} · 质量 {bid.attorneyTrust.qualitySignalScore} · 合规 {bid.attorneyTrust.complianceScore}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    评价 {bid.attorneyTrust.reviewAvg != null ? `${bid.attorneyTrust.reviewAvg}/5` : "暂无"}（{bid.attorneyTrust.reviewCount}）
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500">暂无信任数据</span>
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="sticky left-0 z-10 bg-white border border-slate-200 px-3 py-2 text-sm font-medium">预计周期</td>
                          {compareBids.map((bid) => {
                            const d = typeof bid.estimatedDays === "number" ? bid.estimatedDays : null;
                            const isFast = d != null && compareMetrics.minDays != null && d === compareMetrics.minDays && compareMetrics.minDays !== compareMetrics.maxDays;
                            return (
                              <td key={`${bid.id}-days`} className={`border border-slate-200 px-3 py-2 text-sm ${isFast ? "bg-blue-50" : ""}`}>
                                <div>{d != null ? `${d} 天` : "未填写"}</div>
                                {isFast && <span className="text-xs text-blue-700">当前比较中周期更短</span>}
                              </td>
                            );
                          })}
                        </tr>
                        <tr>
                          <td className="sticky left-0 z-10 bg-white border border-slate-200 px-3 py-2 text-sm font-medium">首次咨询</td>
                          {compareBids.map((bid) => (
                            <td key={`${bid.id}-consult`} className="border border-slate-200 px-3 py-2 text-sm">
                              {bid.includesConsultation ? (
                                <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-xs">包含</span>
                              ) : (
                                <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-1 text-xs">未写/不包含</span>
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="sticky left-0 z-10 bg-white border border-slate-200 px-3 py-2 text-sm font-medium">服务范围</td>
                          {compareBids.map((bid) => (
                            <td key={`${bid.id}-scope`} className="border border-slate-200 px-3 py-2 text-sm leading-5">
                              {summarize(bid.serviceScope ?? "", 80)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="sticky left-0 z-10 bg-white border border-slate-200 px-3 py-2 text-sm font-medium">方案摘要</td>
                          {compareBids.map((bid) => (
                            <td key={`${bid.id}-proposal`} className="border border-slate-200 px-3 py-2 text-sm leading-5">
                              {summarize(bid.proposalText, 120)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="sticky left-0 z-10 bg-white border border-slate-200 px-3 py-2 text-sm font-medium">版本/更新时间</td>
                          {compareBids.map((bid) => (
                            <td key={`${bid.id}-meta`} className="border border-slate-200 px-3 py-2 text-sm">
                              <p>v{bid.version ?? 1}</p>
                              <p className="text-xs text-slate-500 mt-1">{formatDateTime(bid.updatedAt)}</p>
                              <p className="text-xs text-slate-500 mt-1">状态：{bid.status}</p>
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="sticky left-0 z-10 bg-white border border-slate-200 px-3 py-2 text-sm font-medium">操作</td>
                          {compareBids.map((bid) => (
                            <td key={`${bid.id}-action`} className="border border-slate-200 px-3 py-2">
                              {canSelect ? (
                                <button
                                  type="button"
                                  onClick={() => setConfirmBid(bid)}
                                  disabled={submittingBidId !== null}
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                                >
                                  {submittingBidId === bid.id ? "选择中..." : "选择该报价"}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-500">只读</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">暂无可对比报价。</p>
                )}
              </section>

              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-lg font-semibold text-slate-900">报价列表（勾选对比）</h3>
                  <span className="text-sm text-slate-500">最多选择 3 个进行对比</span>
                </div>
                <div className="mt-4 grid gap-4">
                  {rankedBids.length === 0 && <p className="text-sm text-slate-500">暂无可选报价。</p>}
                  {rankedBids.map((bid, idx) => {
                    const selectedForCompare = selectedCompareIds.includes(bid.id);
                    const isCurrentSelected = detail.selectedBidId === bid.id;
                    return (
                      <div key={bid.id} className={`rounded-xl border p-4 ${selectedForCompare ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-slate-900">报价 #{bid.id.slice(-6)}</span>
                              <span className="text-xs rounded-full bg-slate-100 px-2 py-1">{formatPrice(bid.priceMin, bid.priceMax)}</span>
                              <span className="text-xs rounded-full bg-slate-100 px-2 py-1">{bid.feeMode ?? "CUSTOM"}</span>
                              <span className="text-xs rounded-full bg-slate-100 px-2 py-1">推荐位 #{idx + 1}</span>
                              {typeof bid.estimatedDays === "number" && <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-1">{bid.estimatedDays} 天</span>}
                              {bid.includesConsultation && <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">含首次咨询</span>}
                              {isCurrentSelected && <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">当前已选</span>}
                              {bid.attorneyTrust && <span className="text-xs rounded-full bg-blue-50 text-blue-700 px-2 py-1">Trust {bid.attorneyTrust.totalScore} ({bid.attorneyTrust.grade})</span>}
                            </div>
                            <p className="text-xs text-slate-500">律师档案：{bid.attorneyProfileId} · 状态：{bid.status} · v{bid.version ?? 1}</p>
                            <p className="mt-2 text-sm text-slate-700 leading-6 whitespace-pre-wrap">{bid.proposalText}</p>
                            {bid.serviceScope && (
                              <p className="mt-2 text-xs text-slate-600">
                                服务范围：{summarize(bid.serviceScope, 120)}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={selectedForCompare}
                                onChange={() => toggleCompareBid(bid.id)}
                              />
                              加入对比
                            </label>
                            {canSelect ? (
                              <button
                                type="button"
                                disabled={submittingBidId !== null}
                                onClick={() => setConfirmBid(bid)}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
                              >
                                {submittingBidId === bid.id ? "选择中..." : "选择该报价"}
                              </button>
                            ) : (
                              <p className="text-xs text-slate-500 text-right">只读模式</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {resultMsg && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p>{resultMsg}</p>
              {resultEngagementId && (
                <Link href={`/marketplace/engagements/${resultEngagementId}`} className="mt-2 inline-block text-sm font-medium text-blue-700 underline">
                  打开委托确认单（服务范围 / 冲突检查 / 双方确认）
                </Link>
              )}
            </div>
          )}
        </div>

        {confirmBid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">确认选择该报价？</h3>
              <p className="mt-2 text-sm text-slate-600">
                选择后将更新案件状态、写入状态日志，并为该报价创建/打开沟通会话。其他待定报价会自动标记为未选中。
              </p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs rounded-full bg-slate-100 px-2 py-1">报价 #{confirmBid.id.slice(-6)}</span>
                  <span className="text-xs rounded-full bg-slate-100 px-2 py-1">{formatPrice(confirmBid.priceMin, confirmBid.priceMax)}</span>
                  <span className="text-xs rounded-full bg-slate-100 px-2 py-1">{confirmBid.feeMode ?? "CUSTOM"}</span>
                  {typeof confirmBid.estimatedDays === "number" && <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-1">{confirmBid.estimatedDays} 天</span>}
                </div>
                <p className="text-xs text-slate-500">律师档案：{confirmBid.attorneyProfileId} · v{confirmBid.version ?? 1}</p>
                <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{summarize(confirmBid.proposalText, 240)}</p>
                {confirmBid.serviceScope && <p className="mt-2 text-xs text-slate-600">服务范围：{summarize(confirmBid.serviceScope, 180)}</p>}
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmBid(null)}
                  disabled={submittingBidId !== null}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => selectBid(confirmBid.id)}
                  disabled={submittingBidId !== null}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {submittingBidId === confirmBid.id ? "确认中..." : "确认选择"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
