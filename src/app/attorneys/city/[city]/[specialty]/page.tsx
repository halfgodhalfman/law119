export const revalidate = 3600; // ISR — 每小时更新

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import { AttorneyCard } from "@/components/attorney/attorney-card";
import {
  CITY_MAP,
  SPECIALTY_MAP,
  CATEGORY_FAQS,
} from "@/lib/attorney-city-data";
import { computeAttorneyTrustSummary, computeAttorneyTier } from "@/lib/attorney-trust";

interface Props {
  params: Promise<{ city: string; specialty: string }>;
}

export async function generateStaticParams() {
  const params: { city: string; specialty: string }[] = [];
  for (const city of Object.keys(CITY_MAP)) {
    for (const specialty of Object.keys(SPECIALTY_MAP)) {
      params.push({ city, specialty });
    }
  }
  return params; // 12 cities × 9 specialties = 108 pages
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, specialty } = await params;
  const cityInfo = CITY_MAP[city];
  const specialtyInfo = SPECIALTY_MAP[specialty];
  if (!cityInfo || !specialtyInfo) return { title: "律师目录 - Law119" };

  const title = `${cityInfo.nameZh}${specialtyInfo.nameZh}律师 · ${cityInfo.nameEn} ${specialtyInfo.nameEn} Lawyers | Law119`;
  const description = `在 Law119 找${cityInfo.nameZh}专业华人${specialtyInfo.nameZh}律师。${specialtyInfo.description}。执照核验、评价透明，${cityInfo.chineseCommunity}华人专属。`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.law119.com/attorneys/city/${city}/${specialty}`,
    },
    keywords: [
      `${cityInfo.nameZh}${specialtyInfo.nameZh}律师`,
      `${cityInfo.nameEn} ${specialtyInfo.nameEn} lawyer`,
      `${cityInfo.nameEn} ${specialtyInfo.nameEn} attorney`,
      `${cityInfo.nameEn} Chinese ${specialtyInfo.nameEn} attorney`,
      `${cityInfo.nameZh}华人${specialtyInfo.nameZh}律师`,
      ...specialtyInfo.keywords,
      "Law119",
    ],
    openGraph: {
      title,
      description,
      url: `https://www.law119.com/attorneys/city/${city}/${specialty}`,
      type: "website",
    },
  };
}

export default async function CitySpecialtyPage({ params }: Props) {
  const { city, specialty } = await params;
  const cityInfo = CITY_MAP[city];
  const specialtyInfo = SPECIALTY_MAP[specialty];
  if (!cityInfo || !specialtyInfo) notFound();

  // 查询该州 + 该专长的律师
  const attorneys = await prisma.attorneyProfile.findMany({
    where: {
      reviewStatus: { in: ["APPROVED", "RE_REVIEW_REQUIRED"] },
      serviceAreas: { some: { stateCode: cityInfo.stateCode } },
      specialties: { some: { category: specialtyInfo.categoryKey as never } },
    },
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
        take: 20,
        select: { ratingOverall: true, comment: true },
      },
    },
    take: 40,
  });

  const rows = attorneys
    .map((a) => {
      const reviewCount = a.clientReviews.length;
      const reviewAvg = reviewCount
        ? a.clientReviews.reduce((s, r) => s + r.ratingOverall, 0) / reviewCount
        : null;
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
      const tier = computeAttorneyTier({
        trustScore: trust.totalScore,
        barVerified: a.barNumberVerified,
        identityVerified: a.isVerified,
        reviewCount,
        reviewAvg,
        qualityScore: snapshot?.qualityScore ?? null,
        complianceRiskScore: snapshot?.complianceRiskScore ?? null,
      });
      const rankScore =
        trust.totalScore * 0.45 +
        (snapshot?.qualityScore ?? 50) * 0.35 +
        Math.max(0, 100 - (snapshot?.complianceRiskScore ?? 0)) * 0.2;
      return {
        attorney: a,
        trust,
        tier,
        reviewCount,
        reviewAvg: reviewAvg != null ? Number(reviewAvg.toFixed(1)) : null,
        snapshot,
        rankScore,
        recentReviewComment:
          a.clientReviews.find((r) => r.comment && r.comment.trim().length > 10)
            ?.comment ?? null,
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore);

  // Schema.org JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cityInfo.nameZh}${specialtyInfo.nameZh}律师`,
    description: `${cityInfo.nameZh}地区执照核验的专业华人${specialtyInfo.nameZh}律师`,
    url: `https://www.law119.com/attorneys/city/${city}/${specialty}`,
    numberOfItems: rows.length,
    itemListElement: rows.slice(0, 10).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "LegalService",
        name:
          [r.attorney.firstName, r.attorney.lastName].filter(Boolean).join(" ") ||
          "Attorney",
        url: `https://www.law119.com/attorneys/${r.attorney.id}`,
        areaServed: [
          { "@type": "City", name: cityInfo.nameEn },
          { "@type": "State", name: cityInfo.stateNameEn },
        ],
        knowsAbout: specialtyInfo.nameEn,
      },
    })),
  };

  // 同城市其他专长链接
  const otherSpecialties = Object.entries(SPECIALTY_MAP).filter(
    ([slug]) => slug !== specialty
  );

  // 同专长其他城市链接
  const otherCities = Object.entries(CITY_MAP)
    .filter(([slug]) => slug !== city)
    .slice(0, 6);

  // FAQs
  const faqs = CATEGORY_FAQS[specialtyInfo.categoryKey] ?? [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NavBar />
      <main className="min-h-screen bg-white">
        {/* Hero */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-14">
          <div className="max-w-5xl mx-auto px-4">
            {/* 面包屑 Breadcrumb */}
            <nav className="text-xs text-slate-400 mb-4 flex items-center gap-1.5 flex-wrap">
              <Link href="/" className="hover:text-slate-300">首页</Link>
              <span>/</span>
              <Link href="/attorneys" className="hover:text-slate-300">律师目录</Link>
              <span>/</span>
              <Link href={`/attorneys/city/${city}`} className="hover:text-slate-300">
                {cityInfo.nameZh}
              </Link>
              <span>/</span>
              <span className="text-slate-300">{specialtyInfo.nameZh}律师</span>
            </nav>

            <div className="flex items-start gap-4 mb-4">
              <span className="text-5xl flex-shrink-0">{specialtyInfo.emoji}</span>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
                  {cityInfo.nameZh}{specialtyInfo.nameZh}律师
                  <span className="text-amber-400 text-lg sm:text-xl font-semibold ml-3">
                    {cityInfo.nameEn} {specialtyInfo.nameEn}
                  </span>
                </h1>
                <p className="text-slate-300 text-sm mt-1.5">{cityInfo.chineseCommunity}</p>
                <p className="text-slate-400 text-xs mt-1">
                  {specialtyInfo.description} · {cityInfo.stateNameZh}（{cityInfo.stateCode}）
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                href="/case/new"
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                免费发布{cityInfo.nameZh}{specialtyInfo.nameZh}案件 →
              </Link>
              <span className="self-center text-slate-400 text-sm">
                {rows.length > 0
                  ? `${rows.length} 位${cityInfo.stateCode}州执照{specialtyInfo.nameZh}律师`
                  : "更多律师即将入驻"}
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
          {/* 同城其他专长快速跳转 */}
          <section className="mb-8 pb-8 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-600 mb-3">
              {cityInfo.nameZh}其他法律专长
            </h2>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/attorneys/city/${city}`}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition-colors"
              >
                全部{cityInfo.nameZh}律师
              </Link>
              {otherSpecialties.map(([slug, s]) => (
                <Link
                  key={slug}
                  href={`/attorneys/city/${city}/${slug}`}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  {s.emoji} {s.nameZh}
                </Link>
              ))}
            </div>
          </section>

          {/* 律师列表 */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {cityInfo.nameZh}{specialtyInfo.nameZh}律师列表
                {rows.length > 0 && (
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    （按信任评分排序）
                  </span>
                )}
              </h2>
              <Link href="/attorneys" className="text-sm text-amber-600 hover:text-amber-500">
                查看全部律师 →
              </Link>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <p className="text-2xl mb-3">🔍</p>
                <p className="text-slate-600 font-medium">
                  {cityInfo.nameZh}暂无{specialtyInfo.nameZh}律师入驻
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  但您仍可以免费发布案件，全美律师会主动联系您
                </p>
                <Link
                  href="/case/new"
                  className="mt-4 inline-flex bg-amber-500 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm"
                >
                  免费发案，律师主动报价
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {rows.map(
                  ({ attorney, trust, tier, reviewAvg, reviewCount, snapshot, recentReviewComment }) => (
                    <AttorneyCard
                      key={attorney.id}
                      attorney={attorney}
                      trust={trust}
                      tier={tier}
                      reviewAvg={reviewAvg}
                      reviewCount={reviewCount}
                      snapshot={snapshot}
                      recentReviewComment={recentReviewComment}
                    />
                  )
                )}
              </div>
            )}
          </section>

          {/* FAQ */}
          {faqs.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                {cityInfo.nameZh}{specialtyInfo.nameZh}常见问题
              </h2>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200 bg-white p-5"
                  >
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-start gap-2">
                      <span className="text-amber-500 flex-shrink-0">Q.</span>
                      {faq.q}
                    </h3>
                    <p className="text-slate-600 text-sm leading-7 pl-6">{faq.a}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-400">
                以上信息仅供参考，不构成法律建议。具体情况请咨询持执照律师。
              </p>
            </section>
          )}

          {/* 同专长其他城市 */}
          {otherCities.length > 0 && (
            <section className="mb-10">
              <h2 className="font-semibold text-slate-700 mb-3">
                其他城市{specialtyInfo.nameZh}律师
              </h2>
              <div className="flex flex-wrap gap-2">
                {otherCities.map(([slug, c]) => (
                  <Link
                    key={slug}
                    href={`/attorneys/city/${slug}/${specialty}`}
                    className="border border-slate-200 rounded-full px-4 py-1.5 text-sm text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
                  >
                    {c.nameZh}{specialtyInfo.nameZh}律师
                  </Link>
                ))}
                <Link
                  href={`/attorneys/specialty/${specialty}`}
                  className="border border-slate-200 rounded-full px-4 py-1.5 text-sm text-amber-600 hover:border-amber-400 transition-colors"
                >
                  查看全美{specialtyInfo.nameZh}律师 →
                </Link>
              </div>
            </section>
          )}

          {/* Why Law119 */}
          <section className="rounded-2xl bg-slate-50 border border-slate-200 p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-5">
              为什么在 Law119 找{cityInfo.nameZh}{specialtyInfo.nameZh}律师？
            </h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                {
                  icon: "✅",
                  title: "执照核验",
                  desc: `所有${cityInfo.nameZh}律师均通过 ${cityInfo.stateCode} State Bar 执照核验`,
                },
                {
                  icon: specialtyInfo.emoji,
                  title: `${specialtyInfo.nameZh}专精`,
                  desc: specialtyInfo.description,
                },
                {
                  icon: "⭐",
                  title: "评价透明",
                  desc: "真实客户案件评价和完成率公开，帮您做出更好的选择",
                },
                {
                  icon: "💰",
                  title: "透明收费",
                  desc: "律师直接报价，平台托管付款，按服务进展释放，资金有保障",
                },
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
