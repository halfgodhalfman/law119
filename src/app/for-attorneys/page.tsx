import Link from "next/link";
import { NavBar } from "../../components/ui/nav-bar";
import { Footer } from "../../components/ui/footer";
import { ArrowRightIcon, CheckCircleIcon, ScalesIcon, ShieldCheckIcon } from "../../components/ui/icons";

const BENEFITS = [
  {
    emoji: "🎯",
    title: "精准案源，减少无效咨询",
    desc: "平台按您的专长领域、执业州、语言能力精准推送案件，90%以上的案件与您的执业范围匹配，告别大海捞针。",
  },
  {
    emoji: "💰",
    title: "透明收费，成本完全可控",
    desc: "Credit 竞价制度：您只在感兴趣并报价时消耗积分，无月费、无隐性收费。每个 Credit 的价值完全透明。",
  },
  {
    emoji: "⏱️",
    title: "节省获客时间",
    desc: "案件已经过平台结构化处理，包含案由、紧急程度、地点、预算区间，您一眼判断是否接单，无需反复询问基础信息。",
  },
  {
    emoji: "📊",
    title: "数据看板，可视化运营",
    desc: "查看您的响应率、转化率、客户评分、案件类型分布。用数据优化您的接单策略，像管理企业一样管理您的执业。",
  },
  {
    emoji: "🔒",
    title: "平台履约保障",
    desc: "沟通记录、合同模板、付款节点全程在平台留痕。降低纠纷风险，专注提供专业法律服务。",
  },
  {
    emoji: "🌐",
    title: "触达全美华人客户",
    desc: "覆盖全美50州，专注华人社区。客户因语言和文化信任华人律师，您的专业优势在这里被放大。",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "提交入驻申请",
    desc: "填写执业州、专长领域、律师执照号码。平台核验您的州律协执照状态。",
    badge: "约5分钟",
  },
  {
    step: "02",
    title: "完善律师档案",
    desc: "填写执业经验、律所信息、收费区间、语言能力，帮助客户了解您的专业背景。",
    badge: "约15分钟",
  },
  {
    step: "03",
    title: "浏览与接单",
    desc: "平台自动推送匹配您专长的案件。查看案件详情，感兴趣就提交方案与报价。",
    badge: "实时推送",
  },
  {
    step: "04",
    title: "客户选择您",
    desc: "客户对比多位律师的方案，选择您后双方在平台内安全沟通，正式启动服务。",
    badge: "平均48h",
  },
];

const PRICING = [
  {
    tier: "免费注册",
    price: "¥0",
    desc: "完全免费创建账号和档案",
    features: [
      "创建律师档案",
      "浏览平台案件列表",
      "查看案件摘要信息",
      "设置专业领域与服务州",
    ],
    cta: "免费注册",
    href: "/attorney/onboarding",
    highlight: false,
  },
  {
    tier: "Credit 竞价",
    price: "按量付费",
    desc: "只为您真正感兴趣的案件付费",
    features: [
      "查看案件完整详情",
      "向客户提交方案与报价",
      "与客户安全沟通",
      "案件管理工具",
      "响应率 / 转化率看板",
    ],
    cta: "了解定价详情",
    href: "/attorney/onboarding",
    highlight: true,
  },
];

const TESTIMONIALS = [
  {
    name: "Michael Chen 陈律师",
    city: "纽约",
    specialty: "移民法",
    text: "加入华人119找律师网第一个月就接了4个案子，而且都是移民类的，完全在我专长范围内。比我在Yelp上投广告划算多了。",
    time: "2个月前",
  },
  {
    name: "Lisa Wang 王律师",
    city: "洛杉矶",
    specialty: "家庭法 / 离婚",
    text: "案件信息很结构化，我一眼就能判断能不能接。紧急程度、预算区间、州——这些关键信息都有，不用浪费时间去电话沟通。",
    time: "1个月前",
  },
  {
    name: "James Liu 刘律师",
    city: "休斯顿",
    specialty: "商业法",
    text: "平台客户都是华人，语言沟通无障碍。而且客户发案前已经描述了案情，第一次沟通就能进入实质性讨论。效率比以前高很多。",
    time: "3个月前",
  },
];

const FAQS = [
  {
    q: "华人119找律师网如何核验律师执照？",
    a: "我们通过各州官方州律师协会数据库核验您提供的执照号码和姓名，确认执照状态为有效（Active）。核验通常在1-2个工作日内完成。",
  },
  {
    q: "Credit 竞价制度是怎么运作的？",
    a: "您购买Credit积分后，每次向案件提交报价/方案时消耗一定数量的Credit。Credit消耗量根据案件类型和客单价有所不同。如果客户选择了您，后续沟通不再额外收费。",
  },
  {
    q: "我能看到客户的联系方式吗？",
    a: "客户默认匿名发案。当客户选择您并接受免责声明后，双方可在平台内安全沟通。客户自主决定何时披露个人信息。",
  },
  {
    q: "平台对律师收取成交佣金吗？",
    a: "目前平台采用Credit竞价制，不额外收取成交佣金。我们会根据平台发展适时调整定价策略，任何变更会提前通知律师。",
  },
  {
    q: "哪些执业州可以入驻？",
    a: "目前支持全美50州。我们优先拓展华人聚集州（CA、NY、TX、WA、NJ、MA等），这些州的案件量最大。",
  },
];

export default function ForAttorneysPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <NavBar />

      {/* HERO */}
      <section className="relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="inline-flex items-center gap-2 bg-amber-600/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-8">
            <ScalesIcon className="h-4 w-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">面向律师 · For Attorneys</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
                精准华人案源，
                <span className="text-amber-400">在华人119等您</span>
              </h1>
              <p className="mt-4 text-lg text-slate-300 leading-7">
                无需投广告，无需买电话名单。美国华人119找律师网将真实有需求的华人客户直接推送给专业匹配的华人律师。
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "按专长、州精准匹配，减少无效咨询",
                  "Credit 竞价，成本透明可控",
                  "平台履约保障，专注执业本身",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-slate-300 text-sm">
                    <CheckCircleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/attorney/onboarding"
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  立即申请入驻
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link
                  href="/auth/sign-in?role=attorney"
                  className="inline-flex items-center gap-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors"
                >
                  已有账号？律师登录
                </Link>
              </div>
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "90%+", label: "案件与专长匹配率", sub: "Match Rate" },
                { value: "48h", label: "平均案件响应周期", sub: "Avg. Response" },
                { value: "500+", label: "平台累计匹配案件", sub: "Cases Matched" },
                { value: "50", label: "覆盖美国所有州", sub: "States Covered" },
              ].map((s) => (
                <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-bold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1 font-medium leading-tight">{s.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">为什么律师选择华人119找律师网</h2>
            <p className="mt-2 text-slate-500">Why Attorneys Join · Built for attorney growth</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b) => (
              <div key={b.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:border-amber-200 hover:shadow-sm transition-all">
                <div className="text-3xl mb-4">{b.emoji}</div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{b.title}</h3>
                <p className="text-sm text-slate-600 leading-6">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">入驻流程</h2>
            <p className="mt-2 text-slate-500">How to Join · Simple 4-step onboarding</p>
          </div>
          <div className="grid sm:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item, idx) => (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                {idx < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden sm:block absolute top-10 left-1/2 w-full h-0.5 bg-amber-200 z-0" />
                )}
                <div className="relative z-10 h-20 w-20 bg-white border-2 border-amber-300 rounded-2xl flex flex-col items-center justify-center mb-4 shadow-sm">
                  <span className="text-2xl font-black text-amber-600">{item.step}</span>
                </div>
                <div className="inline-flex items-center bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 mb-2">
                  <span className="text-amber-700 text-xs font-semibold">{item.badge}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-5">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/attorney/onboarding"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              开始入驻申请
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">透明定价</h2>
            <p className="mt-2 text-slate-500">Transparent Pricing · No hidden fees</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {PRICING.map((plan) => (
              <div
                key={plan.tier}
                className={`rounded-2xl border-2 p-6 ${
                  plan.highlight
                    ? "border-amber-400 bg-amber-50 shadow-lg shadow-amber-100"
                    : "border-slate-200 bg-white"
                }`}
              >
                {plan.highlight && (
                  <div className="inline-flex bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                    主要收费方式
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-900">{plan.tier}</h3>
                <p className="text-3xl font-black text-slate-900 mt-2">{plan.price}</p>
                <p className="text-sm text-slate-500 mt-1 mb-5">{plan.desc}</p>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    plan.highlight
                      ? "bg-amber-600 hover:bg-amber-500 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                  }`}
                >
                  {plan.cta}
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">律师怎么说</h2>
            <p className="mt-2 text-slate-500">Attorney Reviews · What our partners say</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex gap-0.5 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-amber-400 text-sm">★</span>)}
                </div>
                <p className="text-sm text-slate-700 leading-6 mb-4">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-bold text-slate-700">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.city} · {t.specialty}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">常见问题</h2>
            <p className="mt-2 text-slate-500">FAQ · Frequently Asked Questions</p>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-start gap-2">
                  <span className="text-amber-600 font-black text-base flex-shrink-0">Q</span>
                  {faq.q}
                </h3>
                <p className="text-sm text-slate-600 leading-6 pl-5">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-slate-900 py-14">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <ShieldCheckIcon className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white">准备好开始了吗？</h2>
          <p className="mt-3 text-slate-400 leading-7">
            注册免费，无隐性费用。填写入驻申请，等待执照核验，然后开始接触第一个案件。
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/attorney/onboarding"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              立即申请入驻
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/sign-in?role=attorney"
              className="inline-flex items-center gap-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors"
            >
              已有账号，直接登录
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
