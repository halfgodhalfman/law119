"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NavBar } from "@/components/ui/nav-bar";

type EngagementDetail = {
  id: string;
  status: string;
  caseId: string;
  bidId: string;
  conversationId: string | null;
  serviceBoundary: string;
  serviceScopeSummary: string;
  stagePlan: string | null;
  feeMode: string;
  feeAmountMin: string | null;
  feeAmountMax: string | null;
  includesConsultation: boolean;
  includesCourtAppearance: boolean;
  includesTranslation: boolean;
  includesDocumentFiling: boolean;
  nonLegalAdviceAck: boolean;
  noAttorneyClientRelationshipAck: boolean;
  attorneyConflictChecked: boolean;
  attorneyConflictCheckNote: string | null;
  attorneyConflictCheckedAt: string | null;
  attorneyConfirmedAt: string | null;
  clientConfirmedAt: string | null;
  completionStatus: string;
  completionRequestedAt: string | null;
  completionAutoAt: string | null;
  completionConfirmedAt: string | null;
  completionNote: string | null;
  case: { title: string; stateCode: string };
  _count?: { serviceStages: number };
  serviceStages?: Array<{ id: string; title: string; status: string }>;
};

type Payload = {
  engagement: EngagementDetail;
  viewer: {
    role: "CLIENT" | "ATTORNEY" | "ADMIN";
    canEditAttorneyFields: boolean;
    canEditClientFields: boolean;
    canConfirmAttorney: boolean;
    canConfirmClient: boolean;
    canSubmitClientReview?: boolean;
  };
  review?: {
    id: string;
    status: string;
    ratingOverall: number;
    ratingResponsiveness: number | null;
    ratingProfessionalism: number | null;
    ratingCommunication: number | null;
    wouldRecommend: boolean | null;
    comment: string | null;
    createdAt: string;
  } | null;
  reviewEligibility?: {
    eligible: boolean;
    reason: string;
  };
  complianceHints: {
    platformNotLegalAdvice: boolean;
    chatNotAttorneyClientRelationshipUntilEngagementActive: boolean;
    statePracticeMatchLevel: "MATCH" | "CROSS_STATE" | "UNKNOWN";
    attorneyBarState: string | null;
    attorneyPracticeStates: string[];
    caseStateCode: string;
  };
};

export default function EngagementPage() {
  const params = useParams<{ engagementId: string }>();
  const engagementId = params.engagementId;
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [reviewForm, setReviewForm] = useState({
    ratingOverall: 5,
    ratingResponsiveness: 5,
    ratingProfessionalism: 5,
    ratingCommunication: 5,
    wouldRecommend: true,
    comment: "",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    const r = await fetch(`/api/marketplace/engagements/${engagementId}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || "加载失败");
      setLoading(false);
      return;
    }
    setData(j);
    setForm({
      serviceBoundary: j.engagement.serviceBoundary,
      serviceScopeSummary: j.engagement.serviceScopeSummary ?? "",
      stagePlan: j.engagement.stagePlan ?? "",
      feeMode: j.engagement.feeMode,
      feeAmountMin: j.engagement.feeAmountMin ?? "",
      feeAmountMax: j.engagement.feeAmountMax ?? "",
      includesConsultation: !!j.engagement.includesConsultation,
      includesCourtAppearance: !!j.engagement.includesCourtAppearance,
      includesTranslation: !!j.engagement.includesTranslation,
      includesDocumentFiling: !!j.engagement.includesDocumentFiling,
      nonLegalAdviceAck: !!j.engagement.nonLegalAdviceAck,
      noAttorneyClientRelationshipAck: !!j.engagement.noAttorneyClientRelationshipAck,
      attorneyConflictChecked: !!j.engagement.attorneyConflictChecked,
      attorneyConflictCheckNote: j.engagement.attorneyConflictCheckNote ?? "",
    });
    setLoading(false);
  };

  useEffect(() => {
    if (engagementId) void load();
  }, [engagementId]);

  const save = async (confirmAs?: "CLIENT" | "ATTORNEY") => {
    setSaving(true);
    setMsg(null);
    setError(null);
    const r = await fetch(`/api/marketplace/engagements/${engagementId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        feeAmountMin: form.feeAmountMin === "" ? null : form.feeAmountMin,
        feeAmountMax: form.feeAmountMax === "" ? null : form.feeAmountMax,
        stagePlan: form.stagePlan === "" ? null : form.stagePlan,
        attorneyConflictCheckNote: form.attorneyConflictCheckNote === "" ? null : form.attorneyConflictCheckNote,
        confirmAs,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) {
      setError(j.error || "保存失败");
      return;
    }
    setMsg(confirmAs ? `已完成 ${confirmAs === "ATTORNEY" ? "律师侧" : "客户侧"}确认` : "已保存委托确认单");
    await load();
  };

  const submitReview = async () => {
    if (!engagementId) return;
    setSaving(true);
    setMsg(null);
    setError(null);
    const r = await fetch(`/api/marketplace/engagements/${engagementId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewForm),
    });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) {
      setError(j.error || "提交评价失败");
      return;
    }
    setMsg("客户评价已提交，已用于律师信用评分与公开档案展示。");
    await load();
  };

  const viewerRole = data?.viewer.role === "ATTORNEY" ? "attorney" : data?.viewer.role === "CLIENT" ? "client" : "admin";
  const eng = data?.engagement;

  const handleAction = async (action: string) => {
    setSaving(true);
    setMsg(null);
    setError(null);
    const r = await fetch(`/api/marketplace/engagements/${engagementId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) {
      setError(j.error || "操作失败");
      return;
    }
    setMsg(action === "request_completion" ? "已提交完成确认" : action === "confirm_completion" ? "已确认完成" : "已提交争议");
    await load();
  };

  const hintColor =
    data?.complianceHints.statePracticeMatchLevel === "MATCH"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : data?.complianceHints.statePracticeMatchLevel === "CROSS_STATE"
        ? "bg-amber-50 border-amber-200 text-amber-800"
        : "bg-slate-50 border-slate-200 text-slate-700";

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Engagement Confirmation</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">委托确认单 / 服务范围确认</h1>
              <p className="mt-2 text-sm text-slate-500">报价选择后，律师与客户在此确认服务边界、冲突检查与收费结构。报价不等于正式代理。</p>
            </div>
            {data?.engagement.caseId && (
              <Link href={`/marketplace/cases/${data.engagement.caseId}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">
                返回案件详情
              </Link>
            )}
          </div>

          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          {msg && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}

          {data && (
            <>
              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">状态 {data.engagement.status}</span>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">Case {data.engagement.caseId.slice(-6)}</span>
                  <span className="rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-700">Bid {data.engagement.bidId.slice(-6)}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-900">{data.engagement.case.title}</h2>
                <div className={`mt-3 rounded-lg border p-3 text-sm ${hintColor}`}>
                  <p className="font-semibold">执业地提示 / Practice-State Check</p>
                  <p className="mt-1">
                    案件州：{data.complianceHints.caseStateCode} · 律师执照州：{data.complianceHints.attorneyBarState ?? "未填"} · 服务州：{data.complianceHints.attorneyPracticeStates.join(", ") || "未填"}
                  </p>
                  <p className="mt-1">
                    匹配结果：{data.complianceHints.statePracticeMatchLevel === "MATCH" ? "匹配" : data.complianceHints.statePracticeMatchLevel === "CROSS_STATE" ? "跨州（需律师确认执业限制）" : "未知"}
                  </p>
                </div>
              </section>

              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">服务边界与收费结构</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block text-slate-700">服务边界</span>
                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.serviceBoundary ?? "CUSTOM"} onChange={(e) => setForm((f: any) => ({ ...f, serviceBoundary: e.target.value }))}>
                      <option value="CONSULTATION">咨询</option>
                      <option value="DOCUMENT_PREP">文书</option>
                      <option value="COURT_APPEARANCE">出庭</option>
                      <option value="FULL_REPRESENTATION">全案代理</option>
                      <option value="CUSTOM">其他自定义</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-slate-700">收费模式</span>
                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.feeMode ?? "CUSTOM"} onChange={(e) => setForm((f: any) => ({ ...f, feeMode: e.target.value }))}>
                      {["CONSULTATION","AGENCY","STAGED","HOURLY","CUSTOM"].map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-slate-700">费用最低（USD）</span>
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.feeAmountMin ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, feeAmountMin: e.target.value }))} />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-slate-700">费用最高（USD）</span>
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.feeAmountMax ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, feeAmountMax: e.target.value }))} />
                  </label>
                </div>
                <label className="mt-4 block text-sm">
                  <span className="mb-1 block text-slate-700">服务范围确认（必填）</span>
                  <textarea rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.serviceScopeSummary ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, serviceScopeSummary: e.target.value }))} placeholder="明确说明包含什么、不包含什么，例如：首次咨询、材料清单、文书撰写、出庭次数..." />
                </label>
                <label className="mt-4 block text-sm">
                  <span className="mb-1 block text-slate-700">阶段计划（可选）</span>
                  <textarea rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.stagePlan ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, stagePlan: e.target.value }))} placeholder="阶段1: 初步评估；阶段2: 文书准备；阶段3: 递交/出庭..." />
                </label>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {[
                    ["includesConsultation", "包含首次咨询"],
                    ["includesCourtAppearance", "包含法院出庭"],
                    ["includesTranslation", "包含翻译支持"],
                    ["includesDocumentFiling", "包含文书递交"],
                  ].map(([key, label]) => (
                    <label key={key} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <input type="checkbox" checked={!!form[key]} onChange={(e) => setForm((f: any) => ({ ...f, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </div>
              </section>

              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">利益冲突检查（律师侧）</h3>
                <p className="mt-1 text-sm text-slate-500">律师在正式确认前应完成基础冲突筛查，并对检查结果留痕。</p>
                <div className="mt-4 space-y-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!form.attorneyConflictChecked}
                      disabled={!data.viewer.canEditAttorneyFields}
                      onChange={(e) => setForm((f: any) => ({ ...f, attorneyConflictChecked: e.target.checked }))}
                    />
                    律师已完成基础利益冲突检查（Conflict Check）
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-700">冲突检查说明（可选）</span>
                    <textarea
                      rows={3}
                      disabled={!data.viewer.canEditAttorneyFields}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                      value={form.attorneyConflictCheckNote ?? ""}
                      onChange={(e) => setForm((f: any) => ({ ...f, attorneyConflictCheckNote: e.target.value }))}
                      placeholder="例如：已检索对方公司名，无现有/历史代理冲突。"
                    />
                  </label>
                  <p className="text-xs text-slate-500">最近冲突检查时间：{data.engagement.attorneyConflictCheckedAt ? new Date(data.engagement.attorneyConflictCheckedAt).toLocaleString() : "未记录"}</p>
                </div>
              </section>

              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">免责声明与法律关系边界</h3>
                <div className="mt-3 space-y-2">
                  <label className="inline-flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={!!form.nonLegalAdviceAck} onChange={(e) => setForm((f: any) => ({ ...f, nonLegalAdviceAck: e.target.checked }))} />
                    平台信息展示与撮合流程不构成法律意见（Platform information is not legal advice）
                  </label>
                  <label className="inline-flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={!!form.noAttorneyClientRelationshipAck} onChange={(e) => setForm((f: any) => ({ ...f, noAttorneyClientRelationshipAck: e.target.checked }))} />
                    在双方完成委托确认并激活前，聊天沟通不当然构成正式律师-客户关系
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">确认与生效</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                  <p>律师确认：{data.engagement.attorneyConfirmedAt ? new Date(data.engagement.attorneyConfirmedAt).toLocaleString() : "未确认"}</p>
                  <p>客户确认：{data.engagement.clientConfirmedAt ? new Date(data.engagement.clientConfirmedAt).toLocaleString() : "未确认"}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">保存草稿</button>
                  {data.viewer.canConfirmAttorney && (
                    <button type="button" disabled={saving} onClick={() => void save("ATTORNEY")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                      律师确认（含冲突检查）
                    </button>
                  )}
                  {data.viewer.canConfirmClient && (
                    <button type="button" disabled={saving} onClick={() => void save("CLIENT")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                      客户确认
                    </button>
                  )}
                  {data.engagement.conversationId && (
                    <Link href={`/chat/${data.engagement.conversationId}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
                      进入沟通会话
                    </Link>
                  )}
                </div>
              </section>

              {/* Service Progress & Completion */}
              {eng?.status === "ACTIVE" && (
                <div className="mt-6 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">服务进度</h3>
                    <Link href={`/marketplace/engagements/${engagementId}/progress`} className="text-sm text-blue-600 hover:underline">查看详情 &rarr;</Link>
                  </div>
                  {(eng._count?.serviceStages ?? 0) > 0 ? (
                    <div className="mt-3">
                      <div className="mb-1 text-sm text-gray-500">完成 {eng.serviceStages?.filter(s => s.status === "COMPLETED").length || 0}/{eng._count!.serviceStages} 阶段</div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${eng._count!.serviceStages > 0 ? Math.round(((eng.serviceStages?.filter(s => s.status === "COMPLETED").length || 0) / eng._count!.serviceStages) * 100) : 0}%` }} />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-400">尚未初始化服务阶段</p>
                  )}

                  {/* Completion Actions */}
                  {eng.completionStatus === "NONE" && viewerRole === "attorney" && (
                    <div className="mt-4 border-t pt-4">
                      <button onClick={() => handleAction("request_completion")} disabled={saving} className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50">提交完成确认</button>
                    </div>
                  )}
                  {eng.completionStatus === "REQUESTED_BY_ATTORNEY" && viewerRole === "client" && (
                    <div className="mt-4 border-t pt-4 space-y-2">
                      <p className="text-sm text-yellow-700">律师已提交完成确认，请确认服务是否已完成</p>
                      {eng.completionAutoAt && <p className="text-xs text-gray-400">逾期自动确认: {new Date(eng.completionAutoAt).toLocaleString("zh-CN")}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => handleAction("confirm_completion")} disabled={saving} className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50">确认完成</button>
                        <button onClick={() => handleAction("dispute_completion")} disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">提出争议</button>
                      </div>
                    </div>
                  )}
                  {eng.completionStatus === "REQUESTED_BY_ATTORNEY" && viewerRole === "attorney" && (
                    <div className="mt-4 border-t pt-4">
                      <p className="text-sm text-yellow-600">等待客户确认中...</p>
                      {eng.completionAutoAt && <p className="text-xs text-gray-400">自动完成: {new Date(eng.completionAutoAt).toLocaleString("zh-CN")}</p>}
                    </div>
                  )}
                  {(eng.completionStatus === "CONFIRMED_BY_CLIENT" || eng.completionStatus === "AUTO_COMPLETED") && (
                    <div className="mt-4 border-t pt-4">
                      <p className="text-sm text-green-700 font-medium">服务已完成 {eng.completionStatus === "AUTO_COMPLETED" ? "(自动确认)" : ""}</p>
                      <Link href={`/marketplace/engagements/${engagementId}/summary`} className="mt-1 text-xs text-blue-600 hover:underline">查看结案总结</Link>
                    </div>
                  )}
                  {eng.completionStatus === "DISPUTED" && (
                    <div className="mt-4 border-t pt-4">
                      <p className="text-sm text-red-700">完成确认有争议，已转入调解流程</p>
                    </div>
                  )}
                </div>
              )}

              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">客户评价（委托完成后）</h3>
                <p className="mt-1 text-sm text-slate-500">委托完成后客户可提交评价，评价将用于律师信用评分与公开品牌页展示（经平台审核后公开）。</p>
                {data.review ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <p className="font-semibold text-slate-900">已提交评价：{data.review.ratingOverall}/5</p>
                    <p className="mt-1 text-xs text-slate-500">
                      响应 {data.review.ratingResponsiveness ?? "-"} / 专业 {data.review.ratingProfessionalism ?? "-"} / 沟通 {data.review.ratingCommunication ?? "-"}
                    </p>
                    {data.review.comment && <p className="mt-2 text-slate-700 whitespace-pre-wrap">{data.review.comment}</p>}
                    <p className="mt-2 text-xs text-slate-500">{new Date(data.review.createdAt).toLocaleString()}</p>
                  </div>
                ) : data.viewer.canSubmitClientReview ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        ["ratingOverall", "总体评分"],
                        ["ratingResponsiveness", "响应速度"],
                        ["ratingProfessionalism", "专业度"],
                        ["ratingCommunication", "沟通清晰度"],
                      ].map(([key, label]) => (
                        <label key={key} className="text-sm">
                          <span className="mb-1 block text-slate-700">{label}</span>
                          <select
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                            value={String((reviewForm as Record<string, number | boolean | string>)[key] ?? 5)}
                            onChange={(e) =>
                              setReviewForm((f) => ({ ...f, [key]: Number(e.target.value) }))
                            }
                          >
                            {[5, 4, 3, 2, 1].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={reviewForm.wouldRecommend}
                        onChange={(e) => setReviewForm((f) => ({ ...f, wouldRecommend: e.target.checked }))}
                      />
                      我愿意推荐该律师
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-700">评价内容（可选）</span>
                      <textarea
                        rows={4}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                        placeholder="分享你的服务体验，避免透露隐私信息。"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void submitReview()}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      提交客户评价
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    当前不可提交评价：{data.reviewEligibility?.reason === "not_completed" ? "需在委托完成（会话关闭或已释放款项）后提交。" : "暂不可提交。"}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
