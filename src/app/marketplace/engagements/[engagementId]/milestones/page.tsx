"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NavBar } from "@/components/ui/nav-bar";

// ─── Types ────────────────────────────────────────────────────────────────────

type MilestoneStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "READY_FOR_RELEASE"
  | "RELEASED"
  | "DISPUTED"
  | "CANCELLED";

type Milestone = {
  id: string;
  sortOrder: number;
  title: string;
  deliverable: string;
  amount: string;
  targetDate: string | null;
  status: MilestoneStatus;
  releaseRequestedAt: string | null;
  releaseReviewStatus: string;
  releasedAt: string | null;
  createdAt: string;
};

type PaymentEvent = {
  id: string;
  type: string;
  amount: string | null;
  note: string | null;
  createdAt: string;
  milestoneId: string | null;
};

type PaymentOrder = {
  id: string;
  title: string;
  status: string;
  feeMode: string;
  amountTotal: string;
  amountHeld: string;
  amountReleased: string;
  amountRefunded: string;
  createdAt: string;
  milestones: Milestone[];
  events: PaymentEvent[];
};

type EngagementData = {
  id: string;
  status: string;
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
  attorneyConflictChecked: boolean;
  attorneyConfirmedAt: string | null;
  clientConfirmedAt: string | null;
  case: { id: string; title: string; category: string; stateCode: string; status: string };
  attorney: { id: string; firstName: string | null; lastName: string | null; firmName: string | null; barState: string | null; isVerified: boolean };
  paymentOrders: PaymentOrder[];
};

type Summary = {
  totalOrdered: string;
  totalReleased: string;
  progressPct: number;
  totalMilestones: number;
  completedMilestones: number;
};

type Viewer = {
  role: string;
  isClient: boolean;
  isAttorney: boolean;
  isAdmin: boolean;
};

type Payload = {
  ok: boolean;
  viewer: Viewer;
  engagement: EngagementData;
  summary: Summary;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT: { label: "草稿", color: "bg-slate-100 text-slate-600", dot: "bg-slate-300" },
  PENDING_CLIENT: { label: "等待客户确认", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400" },
  PENDING_ATTORNEY: { label: "等待律师确认", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400" },
  ACTIVE: { label: "进行中", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  COMPLETED: { label: "已完成", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  DECLINED: { label: "已拒绝", color: "bg-red-100 text-red-700", dot: "bg-red-400" },
  CANCELED: { label: "已取消", color: "bg-slate-100 text-slate-500", dot: "bg-slate-300" },
};

const MILESTONE_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  PENDING: { label: "待开始", color: "text-slate-500", bg: "bg-slate-200" },
  IN_PROGRESS: { label: "进行中", color: "text-amber-700", bg: "bg-amber-400" },
  READY_FOR_RELEASE: { label: "待验收", color: "text-blue-700", bg: "bg-blue-400" },
  RELEASED: { label: "已完成", color: "text-emerald-700", bg: "bg-emerald-500" },
  DISPUTED: { label: "争议中", color: "text-red-700", bg: "bg-red-400" },
  CANCELLED: { label: "已取消", color: "text-slate-400", bg: "bg-slate-300" },
};

const ENGAGEMENT_STEPS = ["DRAFT", "PENDING", "ACTIVE", "COMPLETED"];

function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(str: string | null): string {
  if (!str) return "—";
  const n = parseFloat(str);
  if (!isFinite(n)) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MilestoneTrackerPage() {
  const params = useParams<{ engagementId: string }>();
  const engagementId = params.engagementId;

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!engagementId) return;
    setLoading(true);
    fetch(`/api/marketplace/engagements/${engagementId}/milestones`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Payload) => {
        if (!j.ok) { setError("加载失败，请刷新重试。"); return; }
        setData(j);
      })
      .catch(() => setError("网络错误，请刷新重试。"))
      .finally(() => setLoading(false));
  }, [engagementId]);

  if (loading) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-sm text-slate-500 animate-pulse">加载中...</p>
        </main>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-slate-700 font-semibold">{error || "加载失败"}</p>
            <Link href="/marketplace/client-center" className="mt-4 inline-block text-sm text-amber-700 underline">
              返回客户中心
            </Link>
          </div>
        </main>
      </>
    );
  }

  const { engagement, summary, viewer } = data;
  const statusConf = STATUS_CONFIG[engagement.status] ?? STATUS_CONFIG.DRAFT;

  // Map engagement status to step index for progress bar
  const stepIndex = engagement.status === "ACTIVE" ? 2
    : engagement.status === "COMPLETED" ? 3
    : engagement.status.startsWith("PENDING") ? 1
    : 0;

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-16">
        <div className="mx-auto max-w-4xl px-4 py-8">

          {/* ── Header ── */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                里程碑追踪器 / Milestone Tracker
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 leading-snug">
                {engagement.case.title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {engagement.case.category} · {engagement.case.stateCode} ·{" "}
                {[engagement.attorney.firstName, engagement.attorney.lastName]
                  .filter(Boolean)
                  .join(" ") || "律师"}
                {engagement.attorney.firmName ? ` (${engagement.attorney.firmName})` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusConf.color}`}>
                <span className={`h-2 w-2 rounded-full ${statusConf.dot}`} />
                {statusConf.label}
              </span>
              <Link
                href={`/marketplace/engagements/${engagementId}`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-white"
              >
                查看委托确认单
              </Link>
            </div>
          </div>

          {/* ── Engagement Progress Steps ── */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">委托进度</h2>
            <div className="relative flex items-center justify-between">
              {/* Connecting line */}
              <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-200" />
              <div
                className="absolute left-0 top-4 h-0.5 bg-amber-500 transition-all duration-700"
                style={{ width: `${(stepIndex / 3) * 100}%` }}
              />

              {ENGAGEMENT_STEPS.map((step, idx) => {
                const done = idx < stepIndex;
                const active = idx === stepIndex;
                const stepLabels = ["草稿 Draft", "待确认 Pending", "进行中 Active", "已完成 Done"];
                return (
                  <div key={step} className="relative flex flex-col items-center gap-2 flex-1">
                    <div
                      className={`z-10 h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
                        done
                          ? "border-amber-500 bg-amber-500 text-white"
                          : active
                          ? "border-amber-500 bg-white text-amber-600"
                          : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {done ? "✓" : idx + 1}
                    </div>
                    <p className={`text-xs text-center ${active ? "font-semibold text-amber-700" : done ? "text-emerald-700" : "text-slate-400"}`}>
                      {stepLabels[idx]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Summary Cards ── */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">合同金额</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(summary.totalOrdered)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">已释放</p>
              <p className="mt-1 text-lg font-bold text-emerald-700">{formatMoney(summary.totalReleased)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">完成进度</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{summary.progressPct}%</p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-700"
                  style={{ width: `${summary.progressPct}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">里程碑</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {summary.completedMilestones}/{summary.totalMilestones}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* ── Milestone Timeline ── */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">里程碑时间轴</h2>

              {engagement.paymentOrders.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
                  暂无里程碑数据。委托激活后，律师可在支付订单中添加里程碑节点。
                </div>
              ) : (
                engagement.paymentOrders.map((order) => (
                  <div key={order.id} className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{order.title}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{order.status}</span>
                        <span className="font-semibold text-slate-900">{formatMoney(order.amountTotal)}</span>
                      </div>
                    </div>

                    {order.milestones.length === 0 ? (
                      <p className="text-sm text-slate-400">暂无里程碑</p>
                    ) : (
                      <ol className="relative ml-3 space-y-4 border-l border-slate-200">
                        {order.milestones.map((m) => {
                          const mConf = MILESTONE_STATUS_CONFIG[m.status] ?? MILESTONE_STATUS_CONFIG.PENDING;
                          return (
                            <li key={m.id} className="pl-5 relative">
                              {/* Timeline dot */}
                              <span className={`absolute -left-2 top-1.5 h-4 w-4 rounded-full border-2 border-white ${mConf.bg}`} />

                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {m.sortOrder + 1}. {m.title}
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-500">{m.deliverable}</p>
                                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                    {m.targetDate && (
                                      <span className="text-slate-400">
                                        目标日期：{fmt(m.targetDate)}
                                      </span>
                                    )}
                                    {m.releasedAt && (
                                      <span className="text-emerald-600">
                                        ✅ 完成：{fmt(m.releasedAt)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-semibold text-slate-900">{formatMoney(m.amount)}</p>
                                  <span className={`text-xs ${mConf.color}`}>{mConf.label}</span>
                                </div>
                              </div>

                              {/* Client confirmation button for READY_FOR_RELEASE */}
                              {m.status === "READY_FOR_RELEASE" && viewer.isClient && (
                                <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                  律师已申请验收此里程碑。请登录平台确认验收后，款项将自动释放。
                                  <Link
                                    href={`/marketplace/payments`}
                                    className="ml-1 font-semibold underline hover:text-blue-500"
                                  >
                                    前往支付中心确认 →
                                  </Link>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                ))
              )}
            </section>

            {/* ── Right: Service Scope + Payment Events ── */}
            <section className="space-y-4">
              {/* Service scope */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">服务范围摘要</h2>
                <p className="text-sm text-slate-700 leading-6">{engagement.serviceScopeSummary || "—"}</p>

                <div className="mt-4 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">服务类型</span>
                    <span className="text-slate-700">{engagement.serviceBoundary}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">费用模式</span>
                    <span className="text-slate-700">{engagement.feeMode}</span>
                  </div>
                  {(engagement.feeAmountMin || engagement.feeAmountMax) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">费用区间</span>
                      <span className="text-slate-700">
                        {formatMoney(engagement.feeAmountMin)}
                        {engagement.feeAmountMax && ` – ${formatMoney(engagement.feeAmountMax)}`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">冲突核查</span>
                    <span className={engagement.attorneyConflictChecked ? "text-emerald-600" : "text-amber-600"}>
                      {engagement.attorneyConflictChecked ? "✅ 已完成" : "⏳ 未完成"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {engagement.includesConsultation && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">含首次咨询</span>
                  )}
                  {engagement.includesCourtAppearance && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">含出庭</span>
                  )}
                  {engagement.includesTranslation && (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">含翻译</span>
                  )}
                  {engagement.includesDocumentFiling && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">含文书递交</span>
                  )}
                </div>
              </div>

              {/* Payment event log */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">支付事件日志</h2>
                {engagement.paymentOrders.flatMap((o) => o.events).length === 0 ? (
                  <p className="text-sm text-slate-400">暂无支付事件记录。</p>
                ) : (
                  <ol className="space-y-2">
                    {engagement.paymentOrders
                      .flatMap((o) => o.events)
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .map((ev) => (
                        <li key={ev.id} className="flex items-start gap-3 text-xs">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 mt-1.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-slate-700">
                                {ev.type.replaceAll("_", " ")}
                              </span>
                              {ev.amount && (
                                <span className="text-slate-500">{formatMoney(ev.amount)}</span>
                              )}
                            </div>
                            {ev.note && <p className="mt-0.5 text-slate-500 truncate">{ev.note}</p>}
                            <p className="text-slate-400">{fmt(ev.createdAt)}</p>
                          </div>
                        </li>
                      ))}
                  </ol>
                )}
              </div>

              {/* Confirmation timestamps */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-xs">
                <h2 className="mb-2 text-sm font-semibold text-slate-900">确认记录</h2>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>律师确认</span>
                    <span>{fmt(engagement.attorneyConfirmedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>客户确认</span>
                    <span>{fmt(engagement.clientConfirmedAt)}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer note */}
          <p className="mt-8 text-center text-xs text-slate-400">
            里程碑状态由律师更新，客户验收后款项释放。如有争议，请前往{" "}
            <Link href="/marketplace/disputes" className="underline hover:text-slate-600">
              争议中心
            </Link>
            。
          </p>
        </div>
      </main>
    </>
  );
}
