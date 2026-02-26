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

// ─── Slug → State mapping ──────────────────────────────────────────────────
const STATE_SLUGS: Record<
  string,
  { code: string; nameZh: string; nameEn: string; chineseCommunity: string }
> = {
  california: { code: "CA", nameZh: "加州", nameEn: "California", chineseCommunity: "洛杉矶、旧金山、圣地亚哥等" },
  "new-york": { code: "NY", nameZh: "纽约州", nameEn: "New York", chineseCommunity: "纽约市、法拉盛等" },
  texas: { code: "TX", nameZh: "德州", nameEn: "Texas", chineseCommunity: "休斯顿、达拉斯等" },
  illinois: { code: "IL", nameZh: "伊州", nameEn: "Illinois", chineseCommunity: "芝加哥" },
  washington: { code: "WA", nameZh: "华州", nameEn: "Washington", chineseCommunity: "西雅图" },
  "new-jersey": { code: "NJ", nameZh: "新泽西州", nameEn: "New Jersey", chineseCommunity: "中部城市" },
  massachusetts: { code: "MA", nameZh: "麻州", nameEn: "Massachusetts", chineseCommunity: "波士顿、剑桥" },
  florida: { code: "FL", nameZh: "佛州", nameEn: "Florida", chineseCommunity: "迈阿密、奥兰多" },
  georgia: { code: "GA", nameZh: "佐州", nameEn: "Georgia", chineseCommunity: "亚特兰大" },
  nevada: { code: "NV", nameZh: "内州", nameEn: "Nevada", chineseCommunity: "拉斯维加斯" },
  virginia: { code: "VA", nameZh: "弗州", nameEn: "Virginia", chineseCommunity: "华盛顿 DC 周边" },
};

export async function generateStaticParams() {
  return Object.keys(STATE_SLUGS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const stateInfo = STATE_SLUGS[slug];
  if (!stateInfo) return { title: "律师目录 - Law119" };

  return {
    title: `${stateInfo.nameZh}律师 · ${stateInfo.nameEn} Lawyers | Law119 华人法律平台`,
    description: `在 Law119 找${stateInfo.nameZh}（${stateInfo.nameEn}）华人律师。执照核验、信誉评分、用户评价透明展示。免费发布${stateInfo.nameZh}法律案件，匿名保护隐私。`,
    openGraph: {
      title: `${stateInfo.nameZh}律师 - Law119`,
      description: `${stateInfo.nameZh}（${stateInfo.nameEn}）专业华人律师 · 免费发案获得报价`,
      url: `https://www.law119.com/attorneys/state/${slug}`,
    },
    alternates: {
      canonical: `https://www.law119.com/attorneys/state/${slug}`,
    },
    keywords: [
      `${stateInfo.nameZh}律师`,
      `${stateInfo.nameEn} lawyer`,
      `华人${stateInfo.nameZh}律师`,
      `Chinese ${stateInfo.nameEn} attorney`,
      "美国华人律师",
      "Law119",
      stateInfo.chineseCommunity,
    ],
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stateInfo = STATE_SLUGS[slug];
  if (!stateInfo) notFound();

  const attorneys = await prisma.attorneyProfile.findMany({
    where: {
      reviewStatus: { in: ["APPROVED", "RE_REVIEW_REQUIRED"] },
      serviceAreas: { some: { stateCode: stateInfo.code } },
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
    take: 60,
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

  // Get top 5 categories represented in this state
  const categoryMap = Object.fromEntries(LEGAL_CATEGORIES.map((c) => [c.key, c]));
  const categorySlugMap = {
    IMMIGRATION: "immigration",
    CRIMINAL: "criminal",
    CIVIL: "civil",
    REAL_ESTATE: "real-estate",
    FAMILY: "family",
    BUSINESS: "business",
    ESTATE_PLAN: "estate-planning",
    LABOR: "labor",
    TAX: "tax",
  };
  const categoryCounts = new Map<string, number>();
  rows.forEach(({ attorney }) => {
    attorney.specialties.forEach(({ category }) => {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    });
  });
  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([catKey]) => catKey);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-white">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            {/* Breadcrumb */}
            <nav className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
              <Link href="/" className="hover:text-slate-300 transition-colors">首页</Link>
              <span>/</span>
              <Link href="/attorneys" className="hover:text-slate-300 transition-colors">律师目录</Link>
              <span>/</span>
              <span className="text-slate-300">{stateInfo.nameZh}</span>
            </nav>

            <h1 className="text-4xl font-bold leading-tight mb-2">
              {stateInfo.nameZh}律师
              <span className="text-amber-400 text-2xl font-semibold ml-3">{stateInfo.nameEn}</span>
            </h1>
            <p className="text-slate-300 text-lg mb-2">
              {stateInfo.chineseCommunity}等地华人社区专业法律服务
            </p>
            <p className="text-slate-400 text-sm">在 Law119 找到执照核验、信誉优秀的{stateInfo.nameZh}律师</p>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <Link
                href="/case/new"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                免费发布{stateInfo.nameZh}法律案件 →
              </Link>
              <span className="text-slate-400 text-sm">
                {rows.length > 0 ? `${rows.length} 位认证律师在线服务` : "律师即将入驻"}
              </span>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-300">
              <span>✅ 执照核验律师</span>
              <span>🈶 支持普通话 / 国语</span>
              <span>🔒 匿名发案、隐私保护</span>
              <span>⚡ 48 小时内获得律师报价</span>
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          {/* ── Practice area filters ──────────────────────────────── */}
          {topCategories.length > 0 && (
            <section className="mb-8 pb-8 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                {stateInfo.nameZh}热门法律服务
              </p>
              <div className="flex flex-wrap gap-2">
                {topCategories.map((catKey) => {
                  const cat = categoryMap[catKey as keyof typeof categoryMap];
                  if (!cat) return null;
                  const slug = categorySlugMap[catKey as keyof typeof categorySlugMap];
                  if (!slug) return null;
                  const count = categoryCounts.get(catKey) ?? 0;
                  return (
                    <Link
                      key={catKey}
                      href={`/attorneys/specialty/${slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
                    >
                      {cat.emoji} {cat.nameZh} <span className="text-slate-500">({count})</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Attorney list ──────────────────────────────────────── */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {stateInfo.nameZh}律师列表
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
                <p className="text-slate-600 font-medium">暂无该州律师入驻</p>
                <p className="text-slate-500 text-sm mt-1">
                  但您仍可以免费发布案件，全美律师会主动与您联系
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

          {/* ── Why choose Law119 ──────────────────────────────────── */}
          <section className="mb-12 rounded-2xl bg-slate-50 border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">为什么选择 Law119？</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  icon: "✅",
                  title: "执照验证",
                  desc: "所有律师均通过美国各州律师协会（State Bar）执照核验",
                },
                {
                  icon: "⭐",
                  title: "真实评价",
                  desc: "客户真实案件评价和完成率透明展示，帮您做更好的选择",
                },
                {
                  icon: "💰",
                  title: "费用透明",
                  desc: "律师直接报价，平台托管付款，按照程序进展逐步释放费用",
                },
                {
                  icon: "🔒",
                  title: "隐私保护",
                  desc: "匿名发案，无需填写个人信息，所有沟通在平台内加密进行",
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

          {/* ── Other states ──────────────────────────────────────── */}
          <section>
            <h2 className="text-base font-semibold text-slate-700 mb-4">全美其他州</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATE_SLUGS)
                .filter(([s]) => s !== slug)
                .slice(0, 8)
                .map(([s, info]) => (
                  <Link
                    key={s}
                    href={`/attorneys/state/${s}`}
                    className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
                  >
                    {info.nameZh}
                  </Link>
                ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
