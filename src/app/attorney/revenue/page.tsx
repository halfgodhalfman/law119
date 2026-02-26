export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import { requireAuthContext } from "../../../lib/auth-context";
import { NavBar } from "../../../components/ui/nav-bar";
import { AttorneyTabs } from "../../../components/attorney/attorney-tabs";
import { LockClosedIcon, ScalesIcon, DocumentTextIcon, CheckCircleIcon } from "../../../components/ui/icons";

function n(v: any) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v);
}

function usd(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function dt(s: Date | null | undefined) {
  if (!s) return "N/A";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(s);
}

export default async function AttorneyRevenuePage() {
  const auth = await requireAuthContext().catch(() => null);
  if (!auth || auth.role !== "ATTORNEY" || !auth.attorneyProfileId) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <LockClosedIcon className="mx-auto h-8 w-8 text-rose-600" />
            <p className="mt-3 text-sm text-slate-700">请以律师身份登录后访问收入与业绩页面。</p>
          </div>
        </main>
      </>
    );
  }

  const [payments, agg, snapshot30, snapshot7] = await Promise.all([
    prisma.paymentOrder.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId },
      include: {
        milestones: {
          select: { id: true, title: true, status: true, amount: true, releaseReviewStatus: true, targetDate: true },
          orderBy: { sortOrder: "asc" },
        },
        case: { select: { id: true, title: true, category: true, stateCode: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.paymentOrder.aggregate({
      where: { attorneyProfileId: auth.attorneyProfileId },
      _sum: { amountTotal: true, amountHeld: true, amountReleased: true, amountRefunded: true },
      _count: { id: true },
    }),
    prisma.attorneyScoreSnapshot.findFirst({
      where: { attorneyId: auth.attorneyProfileId, period: "WEEKLY" },
      orderBy: { periodEnd: "desc" },
    }),
    prisma.attorneyScoreSnapshot.findFirst({
      where: { attorneyId: auth.attorneyProfileId, period: "DAILY" },
      orderBy: { periodEnd: "desc" },
    }),
  ]);

  const pendingReleaseMilestones = payments.flatMap((p) =>
    p.milestones
      .filter((m) => m.releaseReviewStatus === "PENDING_REVIEW" || m.status === "READY_FOR_RELEASE")
      .map((m) => ({ ...m, paymentOrderId: p.id })),
  );
  const refundPending = payments.filter((p) => p.status === "REFUND_PENDING");

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <AttorneyTabs />
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Revenue & KPI</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">收入与业绩</h1>
              <p className="mt-2 text-sm text-slate-500">查看托管/释放/退款情况，以及律师端关键绩效指标。</p>
            </div>
            <div className="flex gap-2">
              <Link href="/marketplace/payments" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">支付单列表</Link>
              <Link href="/attorney/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">返回总览</Link>
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">支付单总额</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{usd(n(agg._sum.amountTotal))}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs text-emerald-700">托管金额（Held）</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">{usd(n(agg._sum.amountHeld))}</p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <p className="text-xs text-blue-700">已释放金额</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{usd(n(agg._sum.amountReleased))}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
              <p className="text-xs text-rose-700">退款金额</p>
              <p className="mt-1 text-2xl font-bold text-rose-900">{usd(n(agg._sum.amountRefunded))}</p>
            </div>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ScalesIcon className="h-4 w-4 text-slate-700" />
                KPI 摘要（快照）
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">7日首报时长</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{snapshot7?.avgFirstBidMinutes ? `${snapshot7.avgFirstBidMinutes}m` : "N/A"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">7日首消息时长</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{snapshot7?.avgFirstMessageMinutes ? `${snapshot7.avgFirstMessageMinutes}m` : "N/A"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">周报价转化率</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{Math.round((snapshot30?.bidConversionRate ?? 0) * 100)}%</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">周完成率</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{Math.round((snapshot30?.completionRate ?? 0) * 100)}%</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <DocumentTextIcon className="h-4 w-4 text-amber-600" />
                财务待办
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span>待审核释放里程碑</span>
                  <span className="font-semibold text-slate-900">{pendingReleaseMilestones.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span>退款处理中支付单</span>
                  <span className="font-semibold text-slate-900">{refundPending.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span>支付单总数</span>
                  <span className="font-semibold text-slate-900">{agg._count.id}</span>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
              最近支付单与里程碑
            </h2>
            <div className="space-y-4">
              {payments.map((p) => (
                <article key={p.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{p.status}</span>
                        {p.holdBlockedByDispute && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">争议阻断</span>}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{p.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {p.case?.title || "Unlinked case"} · {p.case?.category ?? "-"} · {p.case?.stateCode ?? "-"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Total {usd(n(p.amountTotal))} · Held {usd(n(p.amountHeld))} · Released {usd(n(p.amountReleased))}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        创建于 {dt(p.createdAt)} · 对账 {p.reconciliationStatus}
                      </p>
                    </div>
                    <Link href={`/marketplace/payments/${p.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">
                      查看详情 / 里程碑确认
                    </Link>
                  </div>
                  {p.milestones.length > 0 && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {p.milestones.map((m) => (
                        <div key={m.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p className="text-xs font-medium text-slate-800">{m.title}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {m.status} · {usd(n(m.amount))} · 审核 {m.releaseReviewStatus}
                          </p>
                          {m.targetDate && <p className="text-[11px] text-slate-500">目标时间 {dt(m.targetDate)}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
              {payments.length === 0 && <p className="text-sm text-slate-500">暂无支付记录。</p>}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
