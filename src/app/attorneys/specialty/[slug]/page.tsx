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

// FAQs per category
const CATEGORY_FAQS: Record<string, { q: string; a: string }[]> = {
  IMMIGRATION: [
    { q: "在美国申请绿卡需要多长时间？", a: "绿卡处理时间因类型而异：家庭类绿卡通常需要1-10年，职业类绿卡（EB-1/EB-2）约1-5年，EB-3约5-10年。具体等待时间受国籍配额影响，华人（中国大陆出生）等待期通常较长。" },
    { q: "H-1B被裁员后有多长时间找新工作？", a: "H-1B持有者在失去工作后通常有60天的宽限期（Grace Period），在此期间需要找到新雇主做H-1B转移（Transfer），或申请其他身份，或离开美国。建议立即咨询移民律师。" },
    { q: "什么情况下需要聘请移民律师？", a: "当您的案情涉及以下情况时强烈建议聘请律师：曾有被拒记录、有犯罪记录、跨国离婚情况、庇护申请、驱逐出境听证，或任何复杂的身份问题。" },
    { q: "Law119 上的移民律师都有执照吗？", a: "是的。所有在 Law119 执业的律师均经过平台执照核验（Bar Verification），确保其持有有效的美国律师执照（通过各州 State Bar 认证），方可在平台接案。" },
  ],
  CRIMINAL: [
    { q: "被捕后第一步应该做什么？", a: "第一步：保持沉默（援引第五修正案权利），不接受警方问话；第二步：立即联系刑事辩护律师；第三步：如有需要请求获得翻译服务。记住：任何你说的话都可能被用来对付你。" },
    { q: "轻罪（Misdemeanor）和重罪（Felony）有什么区别？", a: "轻罪最高刑期通常不超过1年（在郡监狱服刑），重罪可判1年以上（在州或联邦监狱服刑）。重罪定罪会严重影响您的移民身份、工作机会和社会福利资格。" },
    { q: "DUI 定罪会影响绿卡或签证吗？", a: "DUI 本身不一定直接导致驱逐，但多次 DUI、伴随伤亡或伴随毒品犯罪的 DUI 可能影响绿卡申请和续签。强烈建议同时咨询刑事律师和移民律师。" },
  ],
  CIVIL: [
    { q: "民事诉讼和刑事诉讼有什么区别？", a: "刑事诉讼由政府检察官代表国家起诉，目的是惩罚犯罪行为；民事诉讼由受损害方个人或公司提起，目的是获得赔偿或强制执行权利。民事案件证明标准为「优势证据」，低于刑事案件的「排除合理怀疑」。" },
    { q: "遭遇加密货币诈骗还能追回资金吗？", a: "追回难度较大但并非不可能。可通过以下途径：向 FBI、FTC、SEC 举报；聘请专业律师提起民事诉讼；在某些情况下追踪链上资产。成功率取决于诈骗者是否可被识别定位。" },
    { q: "小额法庭（Small Claims Court）有什么限制？", a: "各州金额上限不同，加州为 $10,000，纽约为 $10,000，德州为 $20,000。通常不需要律师代理，但案情复杂的情况下律师咨询仍有价值。" },
  ],
  REAL_ESTATE: [
    { q: "买房需要律师参与吗？", a: "在部分州（如纽约、新泽西、马萨诸塞）法律要求律师参与房产交易；其他州通常不强制要求。但即使不强制，在交易金额较大或合同条款复杂时，聘请房产律师审查合同非常值得。" },
    { q: "房东驱逐房客需要经过法律程序吗？", a: "是的。美国任何州均不允许「自力驱逐」（更换门锁、断水断电等），必须通过正式的法律驱逐程序（Eviction/Unlawful Detainer）。违法驱逐可能导致房东承担巨额赔偿。" },
    { q: "HOA 纠纷如何解决？", a: "首先尝试与 HOA 书面沟通，要求说明依据；如无效可申请调解（Mediation）；最终可聘请律师提起诉讼。若 HOA 违反其自身章程或联邦/州法律，胜诉可能性较高。" },
  ],
  FAMILY: [
    { q: "离婚时如何分割在中国的资产？", a: "这是典型的「跨国离婚」问题，涉及中美两国法律。一般而言，美国法院可判决分割，但执行在中国的资产需通过中国法院认可，实际操作较复杂，需同时聘请精通两国法律的律师。" },
    { q: "孩子抚养权争夺中法院如何判定？", a: "美国法院以「子女最佳利益」（Best Interest of the Child）为核心原则，考虑因素包括：双方与子女的关系、各方提供稳定环境的能力、子女自身意愿（年龄足够时）、以及任何家暴记录。" },
    { q: "婚前协议（Prenuptial Agreement）有法律效力吗？", a: "有效力，但需满足：双方自愿签署、无胁迫、双方充分披露财产信息、有各自独立的律师代理、协议条款不违反公共政策。建议至少在婚前30天完成签署。" },
  ],
  BUSINESS: [
    { q: "LLC 和 Corporation（Corp）有什么区别？", a: "LLC（有限责任公司）灵活性更高，税务处理较简单（穿透税），适合小型企业；Corporation 结构更正式，可发行股票，适合计划融资或上市的企业。两者均提供个人资产保护。" },
    { q: "商标注册保护范围是什么？", a: "在美国，联邦商标注册（USPTO）提供全国范围保护；州注册仅保护该州。商标保护范围限于注册类别，一般有效期10年可续期。建议在启动品牌前先进行商标检索。" },
    { q: "遇到商业合同纠纷应该如何处理？", a: "首先仔细查看合同中的争议解决条款（仲裁还是诉讼？哪个州法律管辖？）；其次保留所有相关证据；然后向对方发送正式违约通知；最后根据条款决定是仲裁还是诉讼。" },
  ],
  ESTATE_PLAN: [
    { q: "没有遗嘱会怎样？", a: "如果没有遗嘱（Intestate），资产将按照所在州的无遗嘱继承法分配，通常按照配偶、子女、父母的顺序。这可能不符合您的意愿，且会大大增加家人处理遗产的时间和成本。" },
    { q: "信托（Trust）和遗嘱（Will）有什么区别？", a: "遗嘱在您去世后生效，需经过 Probate（遗产认证）程序，信息公开；信托可在生前生效，通常可绕过 Probate，保密性更强，效率更高。两者可以同时使用（Pour-over Will + Trust）。" },
    { q: "Probate 遗产认证程序需要多长时间？", a: "Probate 时间因州而异，简单案件约6-12个月，复杂案件或有遗产税的情况可能需要2-3年。加州的 Probate 尤其繁琐且费用高，因此在加州做好信托规划尤为重要。" },
  ],
  LABOR: [
    { q: "被非法解雇（Wrongful Termination）如何证明？", a: "需要证明解雇原因属于非法动机，如：因种族、性别、年龄、残疾、怀孕等受保护特征；因举报违法行为（Whistleblower）；因行使合法权利（请假、工人赔偿）。保留所有邮件、聊天记录和文件非常重要。" },
    { q: "雇主不支付加班费（Overtime）怎么办？", a: "联邦法（FLSA）规定，工作超过40小时/周须支付1.5倍工资。可向美国劳工部（DOL）投诉，或聘请劳工律师提起集体诉讼（Class Action）。许多律师在这类案件中采用「不胜不取费」模式。" },
    { q: "遭受职场歧视需要先做什么？", a: "在起诉雇主之前，通常需要先向联邦平等就业机会委员会（EEOC）提交歧视投诉，并等待 EEOC 出具「起诉权通知」（Right to Sue Letter），时限通常为180-300天内。" },
  ],
  TAX: [
    { q: "收到 IRS 审计通知应该怎么办？", a: "不要惊慌，仔细阅读通知类型（通讯审计、办公室审计还是实地审计）；收集相关年份的所有财务记录；强烈建议聘请税务律师或注册会计师代理应对，不建议独自应付审计官员。" },
    { q: "海外账户必须申报吗？", a: "是的。美国公民/居民在任何时点拥有海外金融账户总额超过 $10,000 须申报 FBAR（FinCEN 114）；部分情况还需申报 FATCA（Form 8938）。未申报处罚极重，最高可达账户余额50%/年。" },
    { q: "欠了大量税款无力偿还怎么办？", a: "IRS 提供多种解决方案：分期付款协议（Installment Agreement）、部分税款减免（Offer in Compromise）、目前无力支付（Currently Not Collectible）状态。税务律师可帮助您选择最有利的方案。" },
  ],
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
