export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { computeAttorneyTier, computeAttorneyTrustSummary } from "@/lib/attorney-trust";

type Params = { params: Promise<{ attorneyId: string }> };

function fmtDate(d: Date | null | undefined) {
  return d ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(d) : "N/A";
}

export default async function AttorneyProfilePrintPage({ params }: Params) {
  const { attorneyId } = await params;
  const attorney = await prisma.attorneyProfile.findUnique({
    where: { id: attorneyId },
    include: {
      specialties: { select: { category: true } },
      serviceAreas: { select: { stateCode: true } },
      languages: { select: { language: true } },
      badges: {
        where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        select: { badgeType: true },
        orderBy: { grantedAt: "desc" },
      },
      showcaseCases: {
        where: { status: "PUBLISHED" },
        take: 5,
        orderBy: [{ sortOrder: "asc" }, { year: "desc" }],
        select: {
          caseType: true,
          summaryMasked: true,
          serviceProvided: true,
          outcomeCategory: true,
          jurisdiction: true,
          year: true,
        },
      },
      clientReviews: {
        where: { status: "PUBLISHED" },
        take: 8,
        orderBy: { createdAt: "desc" },
        select: { ratingOverall: true, comment: true, createdAt: true },
      },
      scoreSnapshots: { take: 1, orderBy: { periodEnd: "desc" } },
    },
  });

  if (!attorney) {
    return <main className="p-8">Attorney profile not found.</main>;
  }

  const latest = attorney.scoreSnapshots[0] ?? null;
  const reviewCount = attorney.clientReviews.length;
  const reviewAvg = reviewCount
    ? attorney.clientReviews.reduce((s, r) => s + r.ratingOverall, 0) / reviewCount
    : null;
  const trust = computeAttorneyTrustSummary({
    isVerified: attorney.isVerified,
    barVerified: attorney.barNumberVerified,
    barState: attorney.barState,
    serviceAreasCount: attorney.serviceAreas.length,
    profileCompletenessScore: attorney.profileCompletenessScore ?? 0,
    qualityScore: latest?.qualityScore ?? null,
    complianceRiskScore: latest?.complianceRiskScore ?? null,
    reviewAvg,
    reviewCount,
  });
  const tier = computeAttorneyTier({
    trustScore: trust.totalScore,
    barVerified: attorney.barNumberVerified,
    identityVerified: attorney.isVerified,
    reviewCount,
    reviewAvg,
    qualityScore: latest?.qualityScore ?? null,
    complianceRiskScore: latest?.complianceRiskScore ?? null,
  });
  const maskedBarNo = attorney.barLicenseNumber
    ? `${"*".repeat(Math.max(0, attorney.barLicenseNumber.length - 4))}${attorney.barLicenseNumber.slice(-4)}`
    : "N/A";
  const generatedAt = new Date();

  return (
    <main className="min-h-screen bg-white px-6 py-6 text-slate-900 print:px-0 print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          a { color: inherit; text-decoration: none; }
          body { background: #fff; }
        }
      `}</style>
      <div className="no-print mx-auto mb-4 max-w-4xl rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>打印此页面并选择 “Save as PDF” 即可导出律师资料 PDF。</p>
          <div className="flex gap-2">
            <Link href={`/attorneys/${attorneyId}`} className="rounded-md border border-slate-300 px-3 py-1.5">返回品牌页</Link>
            <span className="rounded-md bg-slate-900 px-3 py-1.5 text-white">浏览器菜单中选择“打印 / Save as PDF”</span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                {[attorney.firstName, attorney.lastName].filter(Boolean).join(" ") || "Attorney"}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {attorney.firmName || "Independent Practice"} · {attorney.barState || "N/A"} ·{" "}
                {attorney.yearsExperience ? `${attorney.yearsExperience}+ years experience` : "Years not specified"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {attorney.badges.map((b) => (
                  <span key={b.badgeType} className="rounded-full border border-slate-300 px-2 py-1">
                    {b.badgeType.replaceAll("_", " ")}
                  </span>
                ))}
                <span className="rounded-full border border-slate-300 px-2 py-1">{tier.label}</span>
              </div>
            </div>
            <div className="min-w-[220px] rounded-lg border border-slate-200 p-3 text-sm">
              <p className="text-xs text-slate-500">Lawyer Trust Score</p>
              <p className="mt-1 text-2xl font-bold">{trust.totalScore}/100</p>
              <p className="text-xs text-slate-600">Grade {trust.grade} · Tier {tier.label}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
            {attorney.bio?.trim() || "No public bio provided."}
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold">资质验证状态</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              <li>Identity Verification: {String(attorney.identityVerificationStatus)}</li>
              <li>Bar Verification: {String(attorney.barVerificationStatus)}</li>
              <li>Bar State: {attorney.barState || "N/A"}</li>
              <li>License Number: {maskedBarNo}</li>
              <li>Bar Verified On: {fmtDate(attorney.barVerifiedAt)}</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">平台展示基于律师提交及审核信息。</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold">擅长领域 / 服务区域 / 语言</h2>
            <p className="mt-2 text-xs text-slate-500">Practice Areas</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              {attorney.specialties.length ? attorney.specialties.map((s) => (
                <span key={s.category} className="rounded-full border border-slate-300 px-2 py-1">{s.category}</span>
              )) : <span className="text-slate-500">N/A</span>}
            </div>
            <p className="mt-3 text-xs text-slate-500">Service States</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              {attorney.serviceAreas.length ? attorney.serviceAreas.map((s) => (
                <span key={s.stateCode} className="rounded-full border border-slate-300 px-2 py-1">{s.stateCode}</span>
              )) : <span className="text-slate-500">N/A</span>}
            </div>
            <p className="mt-3 text-xs text-slate-500">Languages</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              {attorney.languages.length ? attorney.languages.map((l) => (
                <span key={l.language} className="rounded-full border border-slate-300 px-2 py-1">{l.language}</span>
              )) : <span className="text-slate-500">N/A</span>}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold">客户评价摘要</h2>
          <p className="mt-2 text-sm">平均评分：{reviewAvg ? reviewAvg.toFixed(1) : "N/A"} / 5.0（{reviewCount} 条）</p>
          <div className="mt-3 space-y-2">
            {attorney.clientReviews.length ? attorney.clientReviews.map((r, idx) => (
              <div key={`${r.createdAt.toISOString()}-${idx}`} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{fmtDate(r.createdAt)}</span>
                  <span>评分 {r.ratingOverall}/5</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-slate-700">{r.comment}</p>}
              </div>
            )) : <p className="text-sm text-slate-500">暂无公开评价。</p>}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold">成功案例摘要（匿名化）</h2>
          <div className="mt-3 space-y-2">
            {attorney.showcaseCases.length ? attorney.showcaseCases.map((s, idx) => (
              <div key={`${s.caseType}-${idx}`} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium">{s.caseType} · {s.outcomeCategory}</p>
                <p className="mt-1 text-xs text-slate-500">{s.jurisdiction || "N/A"} · {s.year || "N/A"}</p>
                <p className="mt-1 text-sm text-slate-700">{s.summaryMasked}</p>
                <p className="mt-1 text-xs text-slate-600">服务内容：{s.serviceProvided}</p>
              </div>
            )) : <p className="text-sm text-slate-500">暂无公开成功案例。</p>}
          </div>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          本资料为平台生成的律师公开档案打印版，仅用于客户比较律师资质与服务信息，不构成具体法律意见或案件结果保证。
          <br />
          Generated at: {generatedAt.toLocaleString()} · Source: /attorneys/{attorneyId}
        </section>
      </div>
    </main>
  );
}
