import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ caseId: string }>;
};

const STATUS_MAP: Record<string, { label: string; en: string; color: string }> = {
  OPEN: { label: "开放中", en: "Open — Accepting Bids", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  MATCHED: { label: "已匹配律师", en: "Matched — Attorney Selected", color: "bg-blue-100 text-blue-800 border-blue-200" },
  CLOSED: { label: "已关闭", en: "Closed", color: "bg-slate-100 text-slate-600 border-slate-200" },
  CANCELLED: { label: "已取消", en: "Cancelled", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

const URGENCY_MAP: Record<string, string> = {
  LOW: "普通 / Low",
  MEDIUM: "一般 / Medium",
  HIGH: "较紧急 / High",
  URGENT: "🚨 紧急 / Urgent",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

export default async function CaseTrackPage({ params }: PageProps) {
  const { caseId } = await params;

  const legalCase = await prisma.case
    .findUnique({
      where: { id: caseId },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        urgency: true,
        stateCode: true,
        createdAt: true,
      },
    })
    .catch(() => null);

  const bidCount = legalCase
    ? await prisma.bid.count({ where: { caseId } }).catch(() => 0)
    : 0;

  const statusInfo = legalCase ? (STATUS_MAP[legalCase.status] ?? STATUS_MAP.CLOSED) : null;

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-2xl px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              案件追踪 / Case Status
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">查看案件进展</h1>
            <p className="mt-2 text-sm text-slate-500">
              此页面无需登录，可随时查看您案件的最新状态。
            </p>
          </div>

          {!legalCase ? (
            /* Not found */
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="text-lg font-semibold text-slate-900">未找到案件 / Case Not Found</h2>
              <p className="mt-2 text-sm text-slate-500">
                该链接对应的案件不存在或已被删除。请确认链接是否完整。
              </p>
              <p className="mt-1 text-xs text-slate-400">
                This case does not exist or has been removed. Please verify your tracking link.
              </p>
              <Link
                href="/case/new"
                className="mt-6 inline-block rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 transition-colors"
              >
                发布新案件 / Post a New Case
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Status Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900 leading-snug">
                      {legalCase.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {legalCase.category} · {legalCase.stateCode}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo!.color}`}
                  >
                    {statusInfo!.label}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">提交时间</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-800">
                      {formatDate(legalCase.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">紧急程度</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-800">
                      {URGENCY_MAP[legalCase.urgency] ?? legalCase.urgency}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">英文状态</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-800">
                      {statusInfo!.en}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bid Count Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">律师报价情况</h3>
                {bidCount > 0 ? (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl font-bold text-amber-700">
                      {bidCount}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        已收到 {bidCount} 位律师报价
                      </p>
                      <p className="text-xs text-slate-500">
                        {bidCount} attorney bid{bidCount > 1 ? "s" : ""} received
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-sm text-slate-600">
                      📭 暂未收到报价，平台正在为您匹配合适的律师，通常在 2-6 小时内响应。
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      No bids yet. Attorneys are typically matched within 2–6 hours.
                    </p>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  查看报价详情 / View Full Details
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  登录后可查看律师完整报价、方案说明，并与律师直接沟通。
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/auth/sign-in?role=client"
                    className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 transition-colors"
                  >
                    登录查看 / Sign In to View
                  </Link>
                  <Link
                    href="/case/new"
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    发布新案件
                  </Link>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-center text-xs text-slate-400">
                案件追踪链接仅显示状态和报价数量，不会透露联系方式或案件详情。
                <br />
                This tracking page shows only status and bid count — no personal details are shared.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
