export const revalidate = 3600; // ISR — rebuild every hour
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import { AttorneyCard } from "@/components/attorney/attorney-card";
import { LEGAL_CATEGORIES } from "@/lib/legal-categories";
import { computeAttorneyTrustSummary, computeAttorneyTier } from "@/lib/attorney-trust";
import { CATEGORY_FAQS, CITY_MAP } from "@/lib/attorney-city-data";

// ─── Slug → Category mapping ───────────────────────────────────────────────
const SPECIALTY_SLUGS: Record<string, string> = {
  immigration:       "IMMIGRATION",
  criminal:          "CRIMINAL",
  civil:             "CIVIL",
  "real-estate":     "REAL_ESTATE",
  family:            "FAMILY",
  business:          "BUSINESS",
  "estate-planning": "ESTATE_PLAN",
  labor:             "LABOR",
  tax:               "TAX",
};

export async function generateStaticParams() {
  return Object.keys(SPECIALTY_SLUGS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categoryKey = SPECIALTY_SLUGS[slug];
  if (!categoryKey) return { title: "律师目录 - Law119" };
  const cat = LEGAL_CATEGORIES.find((c) => c.key === categoryKey);
  if (!cat) return { title: "律师目录 - Law119" };
  return {
    title: `${cat.nameZh}律师 · 美国华人${cat.nameEn} Lawyer | Law119`,
    description: `在 Law119 找专业华人${cat.nameZh}律师。${cat.description}。全美执照核验律师，支持普通话/国语服务，免费发案匹配，0 前期费用。`,
    openGraph: {
      title: `${cat.nameZh}律师 - Law119 华人法律平台`,
      description: `专业${cat.nameZh}律师，${cat.description}。免费发布案件获得报价。`,
      url: `https://www.law119.com/attorneys/specialty/${slug}`,
    },
    alternates: {
      canonical: `https://www.law119.com/attorneys/specialty/${slug}`,
    },
    keywords: [
      `${cat.nameZh}律师`,
      `${cat.nameEn} lawyer`,
      `华人${cat.nameZh}律师`,
      `Chinese ${cat.nameEn} attorney`,
      "美国华人律师",
      "Law119",
    ],
  };
}

export default async function SpecialtyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const categoryKey = SPECIALTY_SLUGS[slug];
  if (!categoryKey) notFound();

  const cat = LEGAL_CATEGORIES.find((c) => c.key === categoryKey);
  if (!cat) notFound();

  const attorneys = await prisma.attorneyProfile.findMany({
    where: {
      reviewStatus: { in: ["APPROVED", "RE_REVIEW_REQUIRED"] },
      specialties: { some: { category: categoryKey as never } },
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
      const reviewAvg =
        reviewCount
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
      return {
        attorney: a,
        trust,
        tier,
        reviewCount,
        reviewAvg: reviewAvg != null ? Number(reviewAvg.toFixed(1)) : null,
        snapshot,
        recentReviewComment:
          a.clientReviews.find((r) => r.comment && r.comment.trim().length > 10)
            ?.comment ?? null,
      };
    })
    .sort((a, b) => {
      const scoreA =
        a.trust.totalScore * 0.45 +
        (a.snapshot?.qualityScore ?? 50) * 0.35 +
        Math.max(0, 100 - (a.snapshot?.complianceRiskScore ?? 0)) * 0.2;
      const scoreB =
        b.trust.totalScore * 0.45 +
        (b.snapshot?.qualityScore ?? 50) * 0.35 +
        Math.max(0, 100 - (b.snapshot?.complianceRiskScore ?? 0)) * 0.2;
      return scoreB - scoreA;
    });

  const faqs = CATEGORY_FAQS[categoryKey] ?? [];

  // Related categories (excluding current)
  const relatedCats = LEGAL_CATEGORIES.filter((c) => c.key !== categoryKey).slice(0, 5);
  const categorySlugReverse = Object.fromEntries(
    Object.entries(SPECIALTY_SLUGS).map(([slug, key]) => [key, slug])
  );

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-white">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="bg-slate-900 text-white py-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            {/* Breadcrumb */}
            <nav className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
              <Link href="/" className="hover:text-slate-300 transition-colors">首页</Link>
              <span>/</span>
              <Link href="/attorneys" className="hover:text-slate-300 transition-colors">律师目录</Link>
              <span>/</span>
              <span className="text-slate-400">{cat.nameZh}</span>
            </nav>

            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{cat.emoji}</span>
              <div>
                <h1 className="text-3xl font-bold leading-tight">
                  {cat.nameZh}律师
                  <span className="ml-3 text-amber-400 text-xl font-semibold">{cat.nameEn} Lawyers</span>
                </h1>
                <p className="mt-1 text-slate-400 text-base">{cat.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <Link
                href="/case/new"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                免费发布{cat.nameZh}案件 →
              </Link>
              <span className="text-slate-500 text-sm">
                {rows.length > 0 ? `${rows.length} 位认证律师在服务` : "平台审核律师即将上线"}
              </span>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-400">
              <span>✅ 执照核验律师</span>
              <span>🈶 支持普通话服务</span>
              <span>🔒 匿名发案保护隐私</span>
              <span>⚡ 48小时内获得报价</span>
            </div>
          </div>
        </section>

        {/* ── Sub-category quick links ──────────────────────────────── */}
        {cat.subCategories.length > 0 && (
          <section className="bg-slate-50 border-b border-slate-200">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">细分服务：</span>
                {cat.subCategories.filter((s) => s.hot).map((sub) => (
                  <Link
                    key={sub.slug}
                    href={`/case/new?subCategory=${sub.slug}`}
                    className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
                  >
                    🔥 {sub.nameZh}
                  </Link>
                ))}
                {cat.subCategories.filter((s) => !s.hot).slice(0, 6).map((sub) => (
                  <Link
                    key={sub.slug}
                    href={`/case/new?subCategory=${sub.slug}`}
                    className="inline-flex items-center rounded-full bg-white border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400 transition-colors"
                  >
                    {sub.nameZh}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          {/* ── Attorney list ──────────────────────────────────────── */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {cat.nameZh}律师列表
                {rows.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-slate-500">（按信任评分排序）</span>
                )}
              </h2>
              <Link href="/attorneys" className="text-sm text-amber-600 hover:text-amber-500">
                查看全部律师 →
              </Link>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <p className="text-2xl mb-3">🔍</p>
                <p className="text-slate-600 font-medium">暂无该专业认证律师</p>
                <p className="text-slate-500 text-sm mt-1">
                  平台正在持续招募更多华人{cat.nameZh}律师入驻
                </p>
                <Link
                  href="/case/new"
                  className="mt-4 inline-flex bg-amber-500 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm"
                >
                  免费发案，律师主动联系你
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {rows.map(({ attorney, trust, tier, reviewAvg, reviewCount, snapshot, recentReviewComment }) => (
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
                ))}
              </div>
            )}
          </section>

          {/* ── How it works ──────────────────────────────────────── */}
          <section className="mb-12 rounded-2xl bg-slate-900 text-white p-8">
            <h2 className="text-xl font-bold mb-6 text-center">如何在 Law119 找到{cat.nameZh}律师</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { step: "1", icon: "📝", title: "免费发布案件", desc: "匿名描述您的法律问题，无需注册，0 前期费用" },
                { step: "2", icon: "⚖️", title: "律师主动报价", desc: `专业${cat.nameZh}律师查看您的案件后主动联系并提供报价` },
                { step: "3", icon: "✅", title: "选择并签约", desc: "对比多名律师报价，平台托管付款，全程有保障" },
              ].map((s) => (
                <div key={s.step} className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-amber-500 text-slate-900 font-bold text-lg flex items-center justify-center flex-shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">{s.title}</p>
                    <p className="text-slate-400 text-sm leading-6">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── FAQ ────────────────────────────────────────────────── */}
          {faqs.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                常见问题：{cat.nameZh}
              </h2>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
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

          {/* ── Find by City ─────────────────────────────────────── */}
          <section className="mb-10">
            <h2 className="text-base font-semibold text-slate-700 mb-4">
              按城市找{cat.nameZh}律师
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CITY_MAP).map(([citySlug, c]) => (
                <Link
                  key={citySlug}
                  href={`/attorneys/city/${citySlug}/${slug}`}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
                >
                  {c.nameZh}{cat.nameZh}律师
                </Link>
              ))}
            </div>
          </section>

          {/* ── Related specialties ─────────────────────────────────── */}
          <section className="mb-8">
            <h2 className="text-base font-semibold text-slate-700 mb-4">其他法律专业领域</h2>
            <div className="flex flex-wrap gap-2">
              {relatedCats.map((rc) => {
                const rslug = categorySlugReverse[rc.key];
                if (!rslug) return null;
                return (
                  <Link
                    key={rc.key}
                    href={`/attorneys/specialty/${rslug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
                  >
                    {rc.emoji} {rc.nameZh}
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
