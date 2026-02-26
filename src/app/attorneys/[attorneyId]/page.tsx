export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/ui/nav-bar";
import { computeAttorneyTier, computeAttorneyTrustSummary } from "@/lib/attorney-trust";

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

type Params = { params: Promise<{ attorneyId: string }> };

export default async function AttorneyPublicProfilePage({ params }: Params) {
  const { attorneyId } = await params;
  const attorney = await prisma.attorneyProfile.findUnique({
    where: { id: attorneyId },
    include: {
      user: { select: { createdAt: true } },
      specialties: { select: { category: true } },
      serviceAreas: { select: { stateCode: true } },
      languages: { select: { language: true } },
      badges: {
        where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        orderBy: { grantedAt: "desc" },
        select: { badgeType: true, source: true, expiresAt: true },
      },
      showcaseCases: {
        where: { status: "PUBLISHED" },
        orderBy: [{ sortOrder: "asc" }, { year: "desc" }],
        take: 6,
        select: {
          id: true,
          caseType: true,
          summaryMasked: true,
          serviceProvided: true,
          outcomeCategory: true,
          jurisdiction: true,
          year: true,
        },
      },
      scoreSnapshots: {
        where: { period: "WEEKLY" },
        orderBy: { periodEnd: "desc" },
        take: 1,
      },
      clientReviews: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          ratingOverall: true,
          ratingResponsiveness: true,
          ratingProfessionalism: true,
          ratingCommunication: true,
          comment: true,
          createdAt: true,
          case: { select: { category: true, stateCode: true } },
        },
      },
    },
  });

  if (!attorney) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-slate-50 px-4 py-10">
          <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-700">律师档案不存在。</p>
          </div>
        </main>
      </>
    );
  }

  const latestSnapshot = attorney.scoreSnapshots[0] ?? null;
  const reviewCount = attorney.clientReviews.length;
  const reviewAvg =
    reviewCount > 0
      ? attorney.clientReviews.reduce((sum: number, r: { ratingOverall: number }) => sum + r.ratingOverall, 0) / reviewCount
      : null;

  const trust = computeAttorneyTrustSummary({
    isVerified: attorney.isVerified,
    barVerified: attorney.barNumberVerified,
    barState: attorney.barState,
    serviceAreasCount: attorney.serviceAreas.length,
    profileCompletenessScore: attorney.profileCompletenessScore ?? 0,
    qualityScore: latestSnapshot?.qualityScore,
    complianceRiskScore: latestSnapshot?.complianceRiskScore,
    reviewAvg,
    reviewCount,
  });
  const tier = computeAttorneyTier({
    trustScore: trust.totalScore,
    barVerified: attorney.barNumberVerified,
    identityVerified: attorney.isVerified,
    reviewCount,
    reviewAvg,
    qualityScore: latestSnapshot?.qualityScore ?? null,
    complianceRiskScore: latestSnapshot?.complianceRiskScore ?? null,
  });
  const maskedBarNo = attorney.barLicenseNumber
    ? `${"*".repeat(Math.max(0, attorney.barLicenseNumber.length - 4))}${attorney.barLicenseNumber.slice(-4)}`
    : null;
  const yearsDisplay = attorney.yearsExperience ? `${attorney.yearsExperience}+ years experience` : "Years not specified";
  const review12m = attorney.clientReviews.filter((r) => r.createdAt.getTime() >= Date.now() - 365 * 24 * 60 * 60 * 1000);
  const review12mAvg = review12m.length
    ? review12m.reduce((sum: number, r: { ratingOverall: number }) => sum + r.ratingOverall, 0) / review12m.length
    : null;
  const reviewLabels = {
    responsive: attorney.clientReviews.filter((r) => (r.ratingResponsiveness ?? 0) >= 4).length,
    clear: attorney.clientReviews.filter((r) => (r.ratingCommunication ?? 0) >= 4).length,
    professional: attorney.clientReviews.filter((r) => (r.ratingProfessionalism ?? 0) >= 4).length,
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-2">
                  {attorney.isVerified && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">Verified Identity</span>}
                  {attorney.barNumberVerified && <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">Bar Verified</span>}
                  <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700">{tier.label}</span>
                  {attorney.badges.map((b) => (
                    <span key={`${b.badgeType}-${b.source}`} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {b.badgeType.replaceAll("_", " ")}
                    </span>
                  ))}
                  {latestSnapshot?.avgFirstMessageMinutes != null && latestSnapshot.avgFirstMessageMinutes <= 60 && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">Fast Responder</span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {[attorney.firstName, attorney.lastName].filter(Boolean).join(" ") || "Attorney"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {attorney.firmName || "Independent Practice"} · {attorney.barState || "N/A"} · {yearsDisplay}
                </p>
                <p className="mt-2 text-sm text-slate-700 leading-6 whitespace-pre-wrap">
                  {attorney.bio?.trim() || "该律师尚未填写公开简介。"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {attorney.specialties.map((s: { category: string }) => (
                    <span key={`${s.category}`} className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{s.category}</span>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {attorney.serviceAreas.map((s: { stateCode: string }) => (
                    <span key={`${s.stateCode}`} className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{s.stateCode}</span>
                  ))}
                  {attorney.languages.map((l: { language: string }) => (
                    <span key={`${l.language}`} className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{l.language}</span>
                  ))}
                </div>
              </div>
              <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Lawyer Trust Score</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{trust.totalScore}<span className="ml-1 text-lg text-slate-500">/100</span></p>
                <p className="mt-1 text-sm text-slate-600">等级 {trust.grade}</p>
                <p className="mt-1 text-xs text-indigo-700">律师等级：{tier.label}</p>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between"><span>资质与验证</span><span className="font-semibold">{trust.credentialsScore}</span></div>
                  <div className="flex items-center justify-between"><span>质量信号</span><span className="font-semibold">{trust.qualitySignalScore}</span></div>
                  <div className="flex items-center justify-between"><span>合规表现</span><span className="font-semibold">{trust.complianceScore}</span></div>
                  <div className="flex items-center justify-between"><span>客户评价</span><span className="font-semibold">{trust.serviceScore}</span></div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  简版评分用于客户决策参考，不构成平台对案件结果的保证。
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">客户评价（简版）</h2>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">平均评分（最近12个月）</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{reviewAvg ? reviewAvg.toFixed(1) : "N/A"} / 5.0</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">评价数量</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{reviewCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">近12个月评分</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{review12mAvg ? review12mAvg.toFixed(1) : "N/A"} / 5.0</p>
                </div>
                {latestSnapshot && (
                  <div>
                    <p className="text-xs text-slate-500">完成率（近快照）</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{pct(latestSnapshot.completionRate ?? 0)}</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-1">响应快 {reviewLabels.responsive}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">解释清晰 {reviewLabels.clear}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">专业严谨 {reviewLabels.professional}</span>
              </div>
              <div className="mt-4 space-y-3">
                {attorney.clientReviews.length > 0 ? (
                  attorney.clientReviews.map((r: (typeof attorney.clientReviews)[number], idx: number) => (
                    <article key={`${r.createdAt.toISOString()}-${idx}`} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span>{r.case?.category ?? "案件"} · {r.case?.stateCode ?? "N/A"}</span>
                        <span>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(r.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900">总体评分：{r.ratingOverall}/5</p>
                      <p className="mt-1 text-xs text-slate-600">
                        响应 {r.ratingResponsiveness ?? "-"} / 专业 {r.ratingProfessionalism ?? "-"} / 沟通 {r.ratingCommunication ?? "-"}
                      </p>
                      {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">暂无公开客户评价。</p>
                )}
              </div>
              <div className="mt-4 text-center">
                <Link href={`/attorneys/${attorney.id}/reviews`} className="text-sm text-blue-600 hover:underline">查看全部评价</Link>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">专业信息与信任说明</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-xs text-slate-500">执业信息</p>
                  <p className="mt-1 text-slate-900">Bar Verified · Bar State: {attorney.barState || "N/A"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    License Number: {maskedBarNo ?? "N/A"} · Verified on: {attorney.barVerifiedAt ? new Date(attorney.barVerifiedAt).toLocaleDateString() : "未验证"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">平台展示基于律师提交及审核信息。</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-xs text-slate-500">资料完整度</p>
                  <p className="mt-1 text-slate-900">{attorney.profileCompletenessScore ?? 0}/100</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-xs text-slate-500">律师等级（平台层级）</p>
                  <p className="mt-1 text-slate-900">{tier.label}</p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-slate-600">
                    {tier.benefits.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-xs text-slate-500">执业年限展示</p>
                  <p className="mt-1 text-slate-900">{yearsDisplay}</p>
                  <p className="mt-1 text-xs text-slate-500">不展示夸张描述；专业经历以律师提交和平台审核信息为准。</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  平台展示信息用于帮助用户比较律师资质与服务风格，不构成具体法律意见或案件结果保证。
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-xs text-slate-500">专业徽章说明</p>
                  <p className="mt-1 text-xs text-slate-700">
                    徽章包含系统自动徽章与平台审核授予徽章，可能存在有效期与复核机制。
                  </p>
                </div>
                <div className="pt-2">
                  <div className="flex flex-wrap gap-2">
                    <Link href="/marketplace/post-case" className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                      发布案件并邀请报价
                    </Link>
                    <Link
                      href={`/attorneys/${attorney.id}/print`}
                      target="_blank"
                      className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      导出资料 PDF（打印版）
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">成功案例（匿名化展示）</h2>
            <p className="mt-1 text-xs text-slate-500">以下案例为匿名化服务案例摘要，仅用于展示服务类型与处理经验，结果因案而异。</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {attorney.showcaseCases.length === 0 && <p className="text-sm text-slate-500">暂无公开案例展示。</p>}
              {attorney.showcaseCases.map((sc) => (
                <article key={sc.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2 py-1">{sc.caseType}</span>
                    {sc.year && <span className="rounded-full bg-slate-100 px-2 py-1">{sc.year}</span>}
                    {sc.jurisdiction && <span className="rounded-full bg-slate-100 px-2 py-1">{sc.jurisdiction}</span>}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{sc.outcomeCategory}</p>
                  <p className="mt-1 text-sm text-slate-700 leading-6">{sc.summaryMasked}</p>
                  <p className="mt-2 text-xs text-slate-600">服务内容：{sc.serviceProvided}</p>
                  <p className="mt-2 text-[11px] text-slate-500">免责声明：结果因案而异，本案例不代表未来案件结果保证。</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
