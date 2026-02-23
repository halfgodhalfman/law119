import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/ui/nav-bar";
import { computeAttorneyTier, computeAttorneyTrustSummary } from "@/lib/attorney-trust";

function pct(v?: number | null) {
  return `${Math.round((v ?? 0) * 100)}%`;
}

export default async function AttorneysDirectoryPage() {
  const attorneys = await prisma.attorneyProfile.findMany({
    where: { reviewStatus: { in: ["APPROVED", "RE_REVIEW_REQUIRED"] } },
    include: {
      specialties: { select: { category: true } },
      serviceAreas: { select: { stateCode: true } },
      scoreSnapshots: {
        where: { period: "WEEKLY" },
        orderBy: { periodEnd: "desc" },
        take: 1,
      },
      clientReviews: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { ratingOverall: true },
      },
    },
    take: 60,
  });

  const rows = attorneys
    .map((a) => {
      const reviewCount = a.clientReviews.length;
      const reviewAvg = reviewCount ? a.clientReviews.reduce((s, r) => s + r.ratingOverall, 0) / reviewCount : null;
      const snapshot = a.scoreSnapshots[0] ?? null;
      const trust = computeAttorneyTrustSummary({
        isVerified: a.isVerified,
        barVerified: a.barNumberVerified,
        barState: a.barState,
        serviceAreasCount: a.serviceAreas.length,
        profileCompletenessScore: a.profileCompletenessScore,
        qualityScore: snapshot?.qualityScore ?? null,
        complianceRiskScore: snapshot?.complianceRiskScore ?? null,
        reviewAvg,
        reviewCount,
      });
      const rankingScore =
        trust.totalScore * 0.45 +
        (snapshot?.qualityScore ?? 50) * 0.35 +
        Math.max(0, 100 - (snapshot?.complianceRiskScore ?? 0)) * 0.2;
      const tier = computeAttorneyTier({
        trustScore: trust.totalScore,
        barVerified: a.barNumberVerified,
        identityVerified: a.isVerified,
        reviewCount,
        reviewAvg,
        qualityScore: snapshot?.qualityScore ?? null,
        complianceRiskScore: snapshot?.complianceRiskScore ?? null,
      });
      return {
        attorney: a,
        trust,
        tier,
        reviewCount,
        reviewAvg: reviewAvg != null ? Number(reviewAvg.toFixed(1)) : null,
        snapshot,
        rankingScore,
      };
    })
    .sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
      return (b.reviewAvg ?? 0) - (a.reviewAvg ?? 0);
    });

  const featured = rows.slice(0, 3);
  const list = rows.slice(3);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Attorney Directory</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">律师目录（Trust-based 推荐）</h1>
              <p className="mt-2 text-sm text-slate-500">
                默认按律师信任分、质量表现与合规表现综合排序，弱化价格因素，帮助客户做更专业的选择。
              </p>
            </div>
            <Link href="/marketplace/post-case" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              发布案件
            </Link>
          </div>

          {featured.length > 0 && (
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">推荐律师位（Top Picks）</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {featured.map(({ attorney, trust, tier, reviewAvg, reviewCount, snapshot }, idx) => (
                  <Link
                    key={attorney.id}
                    href={`/attorneys/${attorney.id}`}
                    className="rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">推荐位 #{idx + 1}</span>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">Trust {trust.totalScore} ({trust.grade})</span>
                      <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700">{tier.label}</span>
                    </div>
                    <p className="font-semibold text-slate-900">
                      {[attorney.firstName, attorney.lastName].filter(Boolean).join(" ") || "Attorney"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {attorney.firmName || "Independent Practice"} · {attorney.barState || "N/A"} · {attorney.yearsExperience ? `${attorney.yearsExperience}+ years` : "Years N/A"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {attorney.barNumberVerified && <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Bar Verified</span>}
                      {attorney.isVerified && <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Verified</span>}
                      {snapshot?.avgFirstMessageMinutes != null && snapshot.avgFirstMessageMinutes <= 60 && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">Fast Responder</span>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-slate-600">
                      评价 {reviewAvg != null ? `${reviewAvg}/5` : "暂无"}（{reviewCount}） · 完成率 {pct(snapshot?.completionRate)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">全部律师（按综合信任/质量排序）</h2>
            <div className="mt-4 grid gap-3">
              {rows.length === 0 && <p className="text-sm text-slate-500">暂无可展示律师。</p>}
              {rows.map(({ attorney, trust, tier, reviewAvg, reviewCount, snapshot }) => (
                <div key={attorney.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {[attorney.firstName, attorney.lastName].filter(Boolean).join(" ") || "Attorney"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {attorney.firmName || "Independent Practice"} · {attorney.barState || "N/A"} · {attorney.yearsExperience ? `${attorney.yearsExperience}+ years` : "Years N/A"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {attorney.specialties.slice(0, 4).map((s) => (
                          <span key={`${attorney.id}-${s.category}`} className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{s.category}</span>
                        ))}
                        {attorney.serviceAreas.slice(0, 4).map((s) => (
                          <span key={`${attorney.id}-${s.stateCode}`} className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{s.stateCode}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">Trust {trust.totalScore}/100</p>
                      <p className="text-xs text-slate-500">等级 {trust.grade} · {tier.label}</p>
                      <p className="mt-1 text-xs text-slate-500">评价 {reviewAvg != null ? `${reviewAvg}/5` : "暂无"}（{reviewCount}）</p>
                      <Link href={`/attorneys/${attorney.id}`} className="mt-2 inline-block rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50">
                        查看品牌页
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
