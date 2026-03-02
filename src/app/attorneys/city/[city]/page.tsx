export const revalidate = 3600; // ISR — 每小时更新

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import { AttorneyCard } from "@/components/attorney/attorney-card";
import { CITY_MAP, SPECIALTY_MAP } from "@/lib/attorney-city-data";
import { computeAttorneyTrustSummary, computeAttorneyTier } from "@/lib/attorney-trust";

interface Props {
  params: Promise<{ city: string }>;
}

export async function generateStaticParams() {
  return Object.keys(CITY_MAP).map((city) => ({ city }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const cityInfo = CITY_MAP[city];
  if (!cityInfo) return { title: "律师目录 - Law119" };

  const title = `${cityInfo.nameZh}华人律师 · ${cityInfo.nameEn} Chinese Lawyers | Law119`;
  const description = `在 Law119 找${cityInfo.nameZh}（${cityInfo.nameEn}）专业华人律师。执照核验、评价透明，覆盖移民、刑事、房产、家庭等领域。${cityInfo.chineseCommunity}华人社区专属服务。`;

  return {
    title,
    description,
    alternates: { canonical: `https://www.law119.com/attorneys/city/${city}` },
    keywords: [
      `${cityInfo.nameZh}律师`,
      `${cityInfo.nameZh}华人律师`,
      `${cityInfo.nameEn} Chinese lawyer`,
      `${cityInfo.nameEn} attorney`,
      `${cityInfo.nameEn} Chinese attorney`,
      `${cityInfo.stateNameZh}律师`,
      "美国华人律师",
      "Law119",
    ],
    openGraph: {
      title,
      description,
      url: `https://www.law119.com/attorneys/city/${city}`,
      type: "website",
    },
  };
}

export default async function CityAttorneysPage({ params }: Props) {
  const { city } = await params;
  const cityInfo = CITY_MAP[city];
  if (!cityInfo) notFound();

  // 查询该州认证律师
  const attorneys = await prisma.attorneyProfile.findMany({
    where: {
      reviewStatus: { in: ["APPROVED", "RE_REVIEW_REQUIRED"] },
      serviceAreas: { some: { stateCode: cityInfo.stateCode } },
    },
    include: {
      specialties: { select: { category: true } },
      serviceAreas: { select: { stateCode: true } },
      scoreSnapshots: { where: { period: "WEEKLY" }, orderBy: { periodEnd: "desc" }, take: 1 },
      clientReviews: { where: { status: "PUBLISHED" }, take: 20, select: { ratingOverall: true, comment: true } },
    },
    take: 60,
  });

  const rows = attorneys
    .map((a) => {
      const reviewCount = a.clientReviews.length;
      const reviewAvg = reviewCount
        ? a.clientReviews.reduce((s, r) => s + r.ratingOverall, 0) / reviewCount : null;
      const snapshot = a.scoreSnapshots[0] ?? null;
      const trust = computeAttorneyTrustSummary({
        isVerified: a.isVerified, barVerified: a.barNumberVerified, barState: a.barState,
        serviceAreasCount: a.serviceAreas.length, profileCompletenessScore: a.profileCompletenessScore,
        qualityScore: snapshot?.qualityScore ?? null, complianceRiskScore: snapshot?.complianceRiskScore ?? null,
        reviewAvg, reviewCount,
      });
      const tier = computeAttorneyTier({
        trustScore: trust.totalScore, barVerified: a.barNumberVerified, identityVerified: a.isVerified,
        reviewCount, reviewAvg, qualityScore: snapshot?.qualityScore ?? null,
        complianceRiskScore: snapshot?.complianceRiskScore ?? null,
      });
      const rankScore = trust.totalScore * 0.45 + (snapshot?.qualityScore ?? 50) * 0.35 +
        Math.max(0, 100 - (snapshot?.complianceRiskScore ?? 0)) * 0.2;
      return {
        attorney: a, trust, tier, reviewCount,
        reviewAvg: reviewAvg != null ? Number(reviewAvg.toFixed(1)) : null,
        snapshot, rankScore,
        recentReviewComment: a.clientReviews.find((r) => r.comment && r.comment.trim().length > 10)?.comment ?? null,
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore);

  // 该城市有代表的专长统计
  const catCounts = new Map<string, number>();
  rows.forEach(({ attorney }) => {
    attorney.specialties.forEach(({ category }) => {
      catCounts.set(category, (catCounts.get(category) ?? 0) + 1);
    });
  });

  // Schema.org JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cityInfo.nameZh}华人律师`,
    description: `${cityInfo.nameZh}地区经执照核验的专业华人律师`,
    url: `https://www.law119.com/attorneys/city/${city}`,
    numberOfItems: rows.length,
    itemListElement: rows.slice(0, 10).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "LegalService",
        name: [r.attorney.firstName, r.attorney.lastName].filter(Boolean).join(" ") || "Attorney",
        url: `https://www.law119.com/attorneys/${r.attorney.id}`,
        areaServed: [{ "@type": "City", name: cityInfo.nameEn }, { "@type": "State", name: cityInfo.stateNameEn }],
      },
    })),
  };

  // 其他城市同州链接
  const sameCitiesOther = Object.entries(CITY_MAP)
    .filter(([slug, c]) => slug !== city && c.stateCode === cityInfo.stateCode)
    .slice(0, 4);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <NavBar />
      <main className="min-h-screen bg-white">
        {/* Hero */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-14">
          <div className="max-w-5xl mx-auto px-4">
            <nav className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
              <Link href="/" className="hover:text-slate-300">首页</Link>
              <span>/</span>
              <Link href="/attorneys" className="hover:text-slate-300">律师目录</Link>
              <span>/</span>
              <span className="text-slate-300">{cityInfo.nameZh}</span>
            </nav>
            <h1 className="text-4xl font-bold mb-2">
              {cityInfo.nameZh}华人律师
              <span className="text-amber-400 text-xl font-semibold ml-3">{cityInfo.nameEn} Chinese Lawyers</span>
            </h1>
            <p className="text-slate-300 text-base mb-1">{cityInfo.chineseCommunity}</p>
            <p className="text-slate-400 text-sm mb-6">
              华人人口约 {cityInfo.population} · {cityInfo.stateNameZh}（{cityInfo.stateCode}）
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/case/new"
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl text-sm transition-colors">
                免费发布{cityInfo.nameZh}法律案件 →
              </Link>
              <span className="self-center text-slate-400 text-sm">
                {rows.length > 0 ? `${rows.length} 位${cityInfo.stateCode}州认证律师` : "更多律师即将入驻"}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-6 text-xs text-slate-400">
              <span>✅ 执照核验律师</span>
              <span>🈶 普通话 / 粤语服务</span>
              <span>⭐ 真实客户评价</span>
              <span>🔒 匿名发案保护隐私</span>
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 py-10">
          {/* 按专长细分 CTA */}
          {catCounts.size > 0 && (
            <section className="mb-8 pb-8 border-b border-slate-200">
              <h2 className="font-bold text-slate-900 mb-3">
                {cityInfo.nameZh}专长领域律师
              </h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SPECIALTY_MAP)
                  .filter(([, s]) => catCounts.has(s.categoryKey))
                  .sort((a, b) => (catCounts.get(b[1].categoryKey) ?? 0) - (catCounts.get(a[1].categoryKey) ?? 0))
                  .map(([slug, s]) => (
                    <Link
                      key={slug}
                      href={`/attorneys/city/${city}/${slug}`}
                      className="inline-flex items-center gap-1.5 border border-slate-200 rounded-full px-4 py-1.5 text-sm text-slate-700 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      {s.emoji} {cityInfo.nameZh}{s.nameZh}律师
                      <span className="text-xs text-slate-400">({catCounts.get(s.categoryKey)})</span>
                    </Link>
                  ))}
              </div>
            </section>
          )}

          {/* 律师列表 */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {cityInfo.nameZh}律师列表
                {rows.length > 0 && <span className="text-sm font-normal text-slate-500 ml-2">（按信任评分排序）</span>}
              </h2>
              <Link href="/attorneys" className="text-sm text-amber-600 hover:text-amber-500">查看全部律师 →</Link>
            </div>
            {rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <p className="text-2xl mb-3">🔍</p>
                <p className="text-slate-600 font-medium">{cityInfo.nameZh}暂无律师入驻</p>
                <p className="text-slate-500 text-sm mt-1">但您仍可以免费发布案件，全美律师会主动联系您</p>
                <Link href="/case/new"
                  className="mt-4 inline-flex bg-amber-500 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm">
                  免费发案，律师主动报价
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {rows.map(({ attorney, trust, tier, reviewAvg, reviewCount, snapshot, recentReviewComment }) => (
                  <AttorneyCard key={attorney.id} attorney={attorney} trust={trust} tier={tier}
                    reviewAvg={reviewAvg} reviewCount={reviewCount} snapshot={snapshot}
                    recentReviewComment={recentReviewComment} />
                ))}
              </div>
            )}
          </section>

          {/* 同州其他城市 */}
          {sameCitiesOther.length > 0 && (
            <section className="mb-10">
              <h2 className="font-semibold text-slate-700 mb-3">{cityInfo.stateNameZh}其他城市</h2>
              <div className="flex flex-wrap gap-2">
                {sameCitiesOther.map(([slug, c]) => (
                  <Link key={slug} href={`/attorneys/city/${slug}`}
                    className="border border-slate-200 rounded-full px-4 py-1.5 text-sm text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors">
                    {c.nameZh}
                  </Link>
                ))}
                <Link href={`/attorneys/state/${cityInfo.stateSlug}`}
                  className="border border-slate-200 rounded-full px-4 py-1.5 text-sm text-amber-600 hover:border-amber-400 transition-colors">
                  查看全部{cityInfo.stateNameZh}律师 →
                </Link>
              </div>
            </section>
          )}

          {/* Why Law119 */}
          <section className="rounded-2xl bg-slate-50 border border-slate-200 p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-5">为什么在 Law119 找{cityInfo.nameZh}律师？</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                { icon: "✅", title: "执照核验", desc: `所有${cityInfo.nameZh}律师均通过 ${cityInfo.stateCode} State Bar 执照核验` },
                { icon: "🈶", title: "中文服务", desc: `${cityInfo.nameZh}华人社区专属，普通话/粤语全程沟通` },
                { icon: "⭐", title: "评价透明", desc: "真实客户案件评价和完成率公开，帮您做出更好的选择" },
                { icon: "💰", title: "透明收费", desc: "律师直接报价，平台托管付款，按服务进展释放，资金有保障" },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-3xl flex-shrink-0">{item.icon}</div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                    <p className="text-slate-600 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
