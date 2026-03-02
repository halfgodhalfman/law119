export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import { computeAttorneyTier, computeAttorneyTrustSummary } from "@/lib/attorney-trust";
import { AttorneyCard } from "@/components/attorney/attorney-card";
import { LEGAL_CATEGORIES } from "@/lib/legal-categories";

// ─── SEO Metadata ─────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "美国华人律师目录 | 移民律师 · 刑事律师 · 房产律师 | Law119",
  description:
    "在 Law119 找经过执照核验的美国华人律师。覆盖移民、刑事、房产、家庭、商业等领域。支持中文服务，免费发布案件获得多位律师报价。",
  alternates: { canonical: "https://www.law119.com/attorneys" },
  keywords: [
    "美国华人律师",
    "美国移民律师",
    "Chinese American attorney",
    "美国刑事律师",
    "美国房产律师",
    "美国家庭律师",
    "中文律师",
    "Law119",
  ],
  openGraph: {
    title: "美国华人律师目录 | Law119",
    description: "经执照核验的专业华人律师，中文服务，全美执业，免费发案获得报价。",
    url: "https://www.law119.com/attorneys",
    type: "website",
  },
};

// ─── City quick-links ─────────────────────────────────────────────────────────
const CITIES = [
  { slug: "los-angeles",   nameZh: "洛杉矶",      nameEn: "Los Angeles" },
  { slug: "san-francisco", nameZh: "旧金山/湾区", nameEn: "San Francisco" },
  { slug: "new-york",      nameZh: "纽约",        nameEn: "New York" },
  { slug: "houston",       nameZh: "休斯顿",      nameEn: "Houston" },
  { slug: "chicago",       nameZh: "芝加哥",      nameEn: "Chicago" },
  { slug: "seattle",       nameZh: "西雅图",      nameEn: "Seattle" },
  { slug: "boston",        nameZh: "波士顿",      nameEn: "Boston" },
  { slug: "dallas",        nameZh: "达拉斯",      nameEn: "Dallas" },
  { slug: "washington-dc", nameZh: "华盛顿DC",    nameEn: "Washington DC" },
  { slug: "atlanta",       nameZh: "亚特兰大",    nameEn: "Atlanta" },
  { slug: "las-vegas",     nameZh: "拉斯维加斯",  nameEn: "Las Vegas" },
  { slug: "miami",         nameZh: "迈阿密",      nameEn: "Miami" },
];

const STATE_LINKS = [
  { slug: "california",  nameZh: "加州 CA" },
  { slug: "new-york",    nameZh: "纽约州 NY" },
  { slug: "texas",       nameZh: "德州 TX" },
  { slug: "illinois",    nameZh: "伊州 IL" },
  { slug: "washington",  nameZh: "华州 WA" },
  { slug: "new-jersey",  nameZh: "新泽西 NJ" },
  { slug: "massachusetts", nameZh: "麻州 MA" },
  { slug: "florida",     nameZh: "佛州 FL" },
  { slug: "georgia",     nameZh: "佐州 GA" },
  { slug: "nevada",      nameZh: "内州 NV" },
  { slug: "virginia",    nameZh: "弗州 VA" },
];

const SPECIALTY_LINKS = [
  { slug: "immigration",    nameZh: "移民签证", emoji: "✈️" },
  { slug: "criminal",       nameZh: "刑事辩护", emoji: "⚖️" },
  { slug: "real-estate",    nameZh: "房产地产", emoji: "🏠" },
  { slug: "family",         nameZh: "家庭法律", emoji: "👨‍👩‍👧" },
  { slug: "business",       nameZh: "商业公司", emoji: "🏢" },
  { slug: "civil",          nameZh: "民事诉讼", emoji: "📋" },
  { slug: "estate-planning",nameZh: "遗产信托", emoji: "📜" },
  { slug: "labor",          nameZh: "劳工雇佣", emoji: "💼" },
  { slug: "tax",            nameZh: "税务财务", emoji: "💰" },
];

function pct(v?: number | null) {
  return `${Math.round((v ?? 0) * 100)}%`;
}

// ─── Page ──────────────────────────────────────────────────────────────────────
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
        select: { ratingOverall: true, comment: true },
      },
    },
    take: 60,
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
      const recentReviewComment =
        a.clientReviews.find((r) => r.comment && r.comment.trim().length > 10)?.comment ?? null;
      return {
        attorney: a, trust, tier, reviewCount,
        reviewAvg: reviewAvg != null ? Number(reviewAvg.toFixed(1)) : null,
        snapshot, rankingScore, recentReviewComment,
      };
    })
    .sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
      return (b.reviewAvg ?? 0) - (a.reviewAvg ?? 0);
    });

  const featured = rows.slice(0, 3);

  // Schema.org ItemList for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "美国华人律师目录",
    description: "经执照核验的美国华人律师，支持中文服务",
    url: "https://www.law119.com/attorneys",
    numberOfItems: rows.length,
    itemListElement: rows.slice(0, 10).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "LegalService",
        name: [r.attorney.firstName, r.attorney.lastName].filter(Boolean).join(" ") || "Attorney",
        url: `https://www.law119.com/attorneys/${r.attorney.id}`,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NavBar />
      <main className="min-h-screen bg-white pb-12">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-14">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-4xl font-bold mb-3">
              美国华人律师目录
              <span className="block text-amber-400 text-2xl font-semibold mt-1">
                Chinese American Attorney Directory
              </span>
            </h1>
            <p className="text-slate-300 text-base max-w-2xl mb-6">
              执照核验 · 信誉评分 · 中文服务 · 全美 {rows.length > 0 ? `${rows.length}+` : "多位"} 认证律师
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/case/new"
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                免费发布案件，获得多位律师报价 →
              </Link>
              <Link
                href="/qa"
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl text-sm transition-colors"
              >
                先问律师问题（免费）
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 mt-6 text-xs text-slate-400">
              <span>✅ 全部律师经执照核验</span>
              <span>🈶 支持普通话/粤语服务</span>
              <span>⭐ 真实客户评价透明展示</span>
              <span>🔒 隐私保护，匿名发案</span>
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 py-10">
          {/* ── 按城市浏览 ──────────────────────────────────────────── */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 mb-1">按城市找律师</h2>
            <p className="text-slate-500 text-sm mb-4">全美华人聚居城市专属目录</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {CITIES.map((city) => (
                <Link
                  key={city.slug}
                  href={`/attorneys/city/${city.slug}`}
                  className="flex items-center justify-between gap-2 border border-slate-200 rounded-xl px-4 py-3 hover:border-amber-400 hover:bg-amber-50 transition-colors group"
                >
                  <div>
                    <p className="text-slate-900 font-medium text-sm group-hover:text-amber-700">{city.nameZh}</p>
                    <p className="text-slate-500 text-xs">{city.nameEn}</p>
                  </div>
                  <span className="text-amber-500 text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>
              ))}
            </div>
          </section>

          {/* ── 按专长浏览 ─────────────────────────────────────────── */}
          <section className="mb-10 pb-10 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-1">按专长领域找律师</h2>
            <p className="text-slate-500 text-sm mb-4">选择您的法律需求类别</p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_LINKS.map((s) => (
                <Link
                  key={s.slug}
                  href={`/attorneys/specialty/${s.slug}`}
                  className="inline-flex items-center gap-1.5 border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-700 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  {s.emoji} {s.nameZh}
                </Link>
              ))}
            </div>
          </section>

          {/* ── 按州浏览 ───────────────────────────────────────────── */}
          <section className="mb-10 pb-10 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">按州找律师</h2>
            <div className="flex flex-wrap gap-2">
              {STATE_LINKS.map((s) => (
                <Link
                  key={s.slug}
                  href={`/attorneys/state/${s.slug}`}
                  className="inline-flex items-center border border-slate-200 rounded-full px-4 py-1.5 text-sm text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
                >
                  {s.nameZh}
                </Link>
              ))}
            </div>
          </section>

          {/* ── 推荐律师 ───────────────────────────────────────────── */}
          {featured.length > 0 && (
            <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900">⭐ 平台精选推荐律师</h2>
                <span className="text-xs text-slate-500">按信任评分综合排序</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {featured.map(({ attorney, trust, tier, reviewAvg, reviewCount, snapshot }, idx) => (
                  <Link
                    key={attorney.id}
                    href={`/attorneys/${attorney.id}`}
                    className="rounded-xl border border-slate-200 p-4 hover:border-amber-300 hover:bg-amber-50 transition-colors"
                  >
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">推荐 #{idx + 1}</span>
                      {tier.label && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">{tier.label}</span>}
                    </div>
                    <p className="font-semibold text-slate-900">
                      {[attorney.firstName, attorney.lastName].filter(Boolean).join(" ") || "Attorney"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {attorney.firmName || "执业律师"} · {attorney.barState || "N/A"}
                      {attorney.yearsExperience ? ` · ${attorney.yearsExperience}+ 年经验` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1 text-xs">
                      {attorney.barNumberVerified && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">执照核验 ✓</span>
                      )}
                      {attorney.isVerified && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">身份认证</span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Trust {trust.totalScore} · 评价 {reviewAvg != null ? `${reviewAvg}/5` : "暂无"}（{reviewCount}）
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── 全部律师列表 ────────────────────────────────────────── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">
                全部认证律师
                {rows.length > 0 && <span className="ml-2 text-sm font-normal text-slate-500">（{rows.length} 位，按综合评分排序）</span>}
              </h2>
            </div>
            <div className="grid gap-3">
              {rows.length === 0 && (
                <p className="text-sm text-slate-500 py-8 text-center">暂无可展示律师，敬请期待。</p>
              )}
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
          </section>

          {/* ── SEO FAQ ──────────────────────────────────────────────── */}
          <section className="mt-12 rounded-2xl bg-slate-50 border border-slate-200 p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6">常见问题 FAQ</h2>
            <div className="space-y-5">
              {[
                { q: "Law119 上的律师都经过认证吗？", a: "是的。平台所有执业律师均经过美国各州律师协会（State Bar）执照核验，并通过平台身份审核后方可接案，确保您对接到持有效执照的专业律师。" },
                { q: "如何在 Law119 找到适合的律师？", a: "您可以按城市、专长领域或所在州浏览律师，也可以直接免费发布法律案件，系统会自动匹配专长对口的律师主动报价，您对比后选择最满意的。" },
                { q: "Law119 支持中文吗？", a: "是的。平台专为美国华人设计，所有界面支持中文，绝大多数律师提供普通话和/或粤语服务。您可以用中文描述法律问题，律师用中文回复。" },
                { q: "发布案件要收费吗？", a: "发布案件完全免费。只有在您选择律师并确认合作后，才会产生律师费，且律师费由平台托管，按服务进展逐步释放，有效保护您的资金安全。" },
              ].map((item, i) => (
                <div key={i}>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">Q: {item.q}</h3>
                  <p className="text-slate-600 text-sm">A: {item.a}</p>
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
