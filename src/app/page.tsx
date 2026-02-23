import Link from "next/link";
import { NavBar } from "../components/ui/nav-bar";
import { Footer } from "../components/ui/footer";
import {
  ScalesIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChatBubbleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from "../components/ui/icons";
import { LEGAL_CATEGORIES, HOT_SUB_CATEGORIES } from "../lib/legal-categories";

const STATS = [
  { value: "500+", label: "Cases Matched", zh: "成功匹配案件" },
  { value: "50+", label: "Verified Attorneys", zh: "认证华人律师" },
  { value: "10", label: "Practice Areas", zh: "法律专业领域" },
  { value: "48h", label: "Avg. Response", zh: "平均响应时间" },
];

const PLATFORM_STEPS = [
  {
    step: "01",
    emoji: "📋",
    title: "结构化发案",
    en: "Submit Your Case",
    desc: "填写州/案由/紧急程度/语言偏好，上传证据材料。全程匿名，无需注册。",
  },
  {
    step: "02",
    emoji: "🤖",
    title: "智能匹配律师",
    en: "Smart Attorney Matching",
    desc: "平台按专长、执业州、语言、响应率自动筛选最匹配的华人律师。",
  },
  {
    step: "03",
    emoji: "⚖️",
    title: "律师方案竞价",
    en: "Attorneys Bid & Propose",
    desc: "多位律师提交方案与报价区间，您可逐一查看、对比。",
  },
  {
    step: "04",
    emoji: "✅",
    title: "对比选择",
    en: "Compare & Choose",
    desc: "对比律师资历、报价、响应速度，自主决定选择哪位律师。",
  },
  {
    step: "05",
    emoji: "🔒",
    title: "平台履约保障",
    en: "Secure Engagement",
    desc: "沟通记录全程留痕，合同与付款在平台内完成，安全透明。",
  },
];

const COMPARISON = [
  { feature: "价格透明度", law119: "✅ 律师公开报价，可对比", traditional: "❌ 无法对比，靠感觉" },
  { feature: "响应速度", law119: "✅ 平均 48 小时", traditional: "❌ 不确定" },
  { feature: "语言保障", law119: "✅ 认证华人律师", traditional: "⚠️ 需自行确认" },
  { feature: "执照核验", law119: "✅ 平台统一核验", traditional: "❌ 自行在州律协查询" },
  { feature: "可对比性", law119: "✅ 多个方案同时对比", traditional: "❌ 只能逐一咨询" },
  { feature: "履约保障", law119: "✅ 沟通留痕 · 合同存档", traditional: "❌ 无任何保障" },
];

const REVIEWS = [
  {
    name: "王女士",
    city: "纽约",
    category: "移民法律",
    rating: 5,
    text: "H1B 转绿卡，在华人119找律师网发案后 6 小时就有律师报价，最终选了一位收费合理的华人律师，全程中文沟通，太方便了。",
    time: "3个月前",
  },
  {
    name: "李先生",
    city: "洛杉矶",
    category: "刑事案件",
    rating: 5,
    text: "凌晨遇到紧急情况，在华人119找律师网提交后不到2小时有律师回应。平台操作简单，关键时刻救了我。",
    time: "1个月前",
  },
  {
    name: "张女士",
    city: "休斯顿",
    category: "离婚家事",
    rating: 5,
    text: "对比了3位律师的方案和报价，最后选了最适合自己情况的。比自己在网上找靠谱多了，而且全程中文沟通。",
    time: "2个月前",
  },
  {
    name: "陈先生",
    city: "西雅图",
    category: "商业合同",
    rating: 5,
    text: "公司合同纠纷，华人119找律师网匹配到专注商业法的华人律师，报价透明，最终在平台谈妥合同，很顺畅。",
    time: "2周前",
  },
  {
    name: "刘女士",
    city: "旧金山",
    category: "房产纠纷",
    rating: 5,
    text: "房东不退押金，律师报价只要$500，发律师信搞定了。如果找传统律所根本不知道价格，找华人119让我心里有底。",
    time: "1个月前",
  },
  {
    name: "吴先生",
    city: "波士顿",
    category: "劳工雇佣",
    rating: 5,
    text: "被无故解雇，平台匹配了劳工法专业律师，详细告知了我的权利，最终达成和解。全程中文，不用担心语言障碍。",
    time: "6周前",
  },
];

const TRUST_FEATURES = [
  {
    icon: ShieldCheckIcon,
    title: "Bar-Verified Attorneys",
    zh: "执照认证律师",
    desc: "每位律师均经州律师协会执照核验，确保合规执业后才能接单。",
  },
  {
    icon: LockClosedIcon,
    title: "Anonymous by Default",
    zh: "默认匿名发案",
    desc: "无需提供姓名、电话即可发布案件，准备好了再披露身份。",
  },
  {
    icon: GlobeAltIcon,
    title: "Platform Accountability",
    zh: "平台履约保障",
    desc: "沟通记录、合同、付款节点全程在平台留痕，权益有保障。",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <NavBar />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-amber-600/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-amber-400 text-sm font-medium">
              全美唯一专注华人社区的法律服务撮合平台
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-3xl">
            有法律问题，
            <span className="text-amber-400">找119</span>
          </h1>
          <p className="mt-3 text-xl sm:text-2xl font-semibold text-slate-300">
            发布案件 · 律师竞价 · 透明对比 · 安全履约
          </p>
          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl leading-7">
            不是黄页，不是广告平台。华人119找律师网是撮合与履约平台——
            让每个华人客户一键发案，让合格华人律师在线接单报价，让法律服务<strong className="text-slate-200">透明、可比、可信</strong>。
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            {/* Emergency */}
            <Link
              href="/emergency"
              className="flex items-center gap-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold px-6 py-4 rounded-xl transition-all shadow-lg shadow-rose-900/30 text-base"
            >
              <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🚨</span>
              </div>
              <span>
                紧急法律求助
                <span className="block text-sm font-normal text-rose-100 mt-0.5">Emergency Legal Help →</span>
              </span>
            </Link>

            {/* Normal case */}
            <Link
              href="/case/new"
              className="flex items-center gap-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-4 rounded-xl transition-all shadow-lg shadow-amber-900/30 text-base"
            >
              <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <DocumentTextIcon className="h-5 w-5" />
              </div>
              <span>
                发布我的案件
                <span className="block text-sm font-normal text-amber-100 mt-0.5">Post My Case Free →</span>
              </span>
            </Link>

            {/* Attorney */}
            <Link
              href="/for-attorneys"
              className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold px-6 py-4 rounded-xl transition-all text-base"
            >
              <div className="h-8 w-8 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                <ScalesIcon className="h-5 w-5 text-amber-400" />
              </div>
              <span>
                律师入驻
                <span className="block text-sm font-normal text-slate-400 mt-0.5">Attorney Portal →</span>
              </span>
            </Link>
          </div>

          {/* Trust Pills */}
          <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
            {[
              { icon: ShieldCheckIcon, text: "匿名发案，无需注册" },
              { icon: CheckCircleIcon, text: "律师执照平台核验" },
              { icon: LockClosedIcon, text: "沟通记录加密留痕" },
              { icon: GlobeAltIcon, text: "普通话 · English 双语" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 divide-x divide-slate-100">
            {STATS.map((s) => (
              <div key={s.label} className="text-center px-4">
                <p className="text-3xl font-bold text-slate-900">{s.value}</p>
                <p className="text-sm font-medium text-slate-600 mt-0.5">{s.label}</p>
                <p className="text-xs text-slate-400">{s.zh}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — 5步平台机制 ───────────────────── */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">平台如何运作</h2>
            <p className="mt-2 text-slate-500">How Law119 Works · 5 steps from case to solution</p>
          </div>

          {/* Steps */}
          <div className="relative">
            {/* Connector line (desktop) */}
            <div className="hidden lg:block absolute top-10 left-[calc(10%+2rem)] right-[calc(10%+2rem)] h-0.5 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200" />

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 relative">
              {PLATFORM_STEPS.map((item, idx) => (
                <div key={item.step} className="flex flex-col items-center text-center">
                  {/* Icon Circle */}
                  <div className={`relative h-20 w-20 rounded-2xl flex flex-col items-center justify-center mb-4 border-2 ${
                    idx === 0 ? "bg-amber-600 border-amber-700 shadow-lg shadow-amber-900/20" :
                    idx === 4 ? "bg-emerald-600 border-emerald-700 shadow-lg shadow-emerald-900/20" :
                    "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <span className="text-2xl">{item.emoji}</span>
                    <span className={`text-[10px] font-black mt-0.5 ${
                      idx === 0 || idx === 4 ? "text-white/60" : "text-slate-300"
                    }`}>{item.step}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-xs text-amber-600 font-medium mb-2">{item.en}</p>
                  <p className="text-xs text-slate-500 leading-5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/case/new"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
            >
              免费发布案件，马上开始
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <p className="text-slate-400 text-sm mt-2">无需注册 · 匿名发案 · 0 前期费用</p>
          </div>
        </div>
      </section>

      {/* ── HOT SERVICES 热门法律服务 ─────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-3">
                <span className="text-amber-600 text-xs font-semibold">🔥 热门</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">热门法律服务</h2>
              <p className="mt-1.5 text-slate-500">Popular Legal Services · Most requested by Chinese clients</p>
            </div>
            <Link
              href="/services"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-500 transition-colors"
            >
              查看全部服务
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {HOT_SUB_CATEGORIES.slice(0, 16).map((item) => {
              const category = LEGAL_CATEGORIES.find((c) => c.key === item.categoryKey);
              return (
                <Link
                  key={item.slug}
                  href={`/case/new?category=${item.categoryKey}`}
                  className="group relative flex items-center gap-3 bg-white border border-slate-200 hover:border-amber-300 hover:shadow-md rounded-xl px-4 py-3.5 transition-all"
                >
                  <span className="text-xl flex-shrink-0">{category?.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-amber-700 truncate leading-tight">
                      {item.nameZh}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{item.nameEn}</p>
                  </div>
                  <ArrowRightIcon className="h-3.5 w-3.5 text-slate-300 group-hover:text-amber-500 flex-shrink-0 ml-auto transition-colors" />
                </Link>
              );
            })}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-500"
            >
              查看全部服务
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── VS COMPARISON 对比表 ─────────────────────────── */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">为什么不是黄页，不是广告平台</h2>
            <p className="mt-2 text-slate-400">华人119 vs. 传统找律师方式</p>
          </div>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 bg-slate-700/50 border-b border-slate-700">
              <div className="px-4 py-3.5 text-sm font-semibold text-slate-300">对比维度</div>
              <div className="px-4 py-3.5 text-sm font-bold text-amber-400 border-l border-slate-700 flex items-center gap-2">
                <ScalesIcon className="h-4 w-4" />
                Law119
              </div>
              <div className="px-4 py-3.5 text-sm font-semibold text-slate-400 border-l border-slate-700">传统方式</div>
            </div>

            {/* Rows */}
            {COMPARISON.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-3 border-b border-slate-700/50 ${i % 2 === 0 ? "" : "bg-slate-800/50"}`}>
                <div className="px-4 py-4 text-sm text-slate-300 font-medium flex items-center">{row.feature}</div>
                <div className="px-4 py-4 text-sm text-emerald-400 border-l border-slate-700/50 flex items-start">{row.law119}</div>
                <div className="px-4 py-4 text-sm text-slate-500 border-l border-slate-700/50 flex items-start">{row.traditional}</div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/case/new"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              体验一下，免费发案
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRACTICE AREAS 10大专业领域 ─────────────────── */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">十大法律服务领域</h2>
              <p className="mt-2 text-slate-500">Practice Areas · All major legal categories covered</p>
            </div>
            <Link
              href="/services"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-500 transition-colors"
            >
              细分服务列表
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {LEGAL_CATEGORIES.map((cat) => (
              <Link
                key={cat.key}
                href={`/services#${cat.key}`}
                className={`group flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all hover:shadow-md hover:-translate-y-0.5 ${cat.color} ${cat.borderColor}`}
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{cat.emoji}</span>
                <div className="text-center">
                  <p className={`text-sm font-bold ${cat.textColor}`}>{cat.nameZh}</p>
                  <p className={`text-xs mt-0.5 opacity-70 ${cat.textColor}`}>{cat.nameEn}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 border border-slate-300 hover:border-amber-400 hover:bg-amber-50 text-slate-700 hover:text-amber-700 font-medium px-5 py-2.5 rounded-xl transition-all text-sm"
            >
              查看所有细分服务 · View All 90+ Services
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── REVIEWS 客户评价墙 ───────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">客户真实反馈</h2>
            <p className="mt-2 text-slate-500">Real Client Reviews · Verified Cases</p>
            <div className="flex items-center justify-center gap-1 mt-3">
              {[1,2,3,4,5].map(i => (
                <span key={i} className="text-amber-400 text-xl">★</span>
              ))}
              <span className="ml-2 text-slate-600 text-sm font-medium">4.9/5.0 · 200+ 条评价</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {REVIEWS.map((review) => (
              <div key={review.name} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                {/* Stars */}
                <div className="flex gap-0.5 mb-3">
                  {[1,2,3,4,5].map(i => (
                    <span key={i} className="text-amber-400 text-sm">★</span>
                  ))}
                </div>
                {/* Quote */}
                <p className="text-sm text-slate-700 leading-6 mb-4">&ldquo;{review.text}&rdquo;</p>
                {/* Author */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center text-sm font-bold text-amber-700">
                      {review.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{review.name}</p>
                      <p className="text-xs text-slate-400">{review.city} · {review.category}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{review.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST FEATURES ───────────────────────────────── */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">为什么选择华人119找律师网</h2>
            <p className="mt-2 text-slate-500">Why Law119 · Built for Trust, Privacy and Accountability</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {TRUST_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="h-12 w-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                  <p className="text-sm font-medium text-amber-700 mb-2">{f.zh}</p>
                  <p className="text-sm text-slate-600 leading-6">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── COVERAGE 覆盖区域 ────────────────────────────── */}
      <section className="py-14 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">覆盖全美华人聚集州</h2>
            <p className="mt-1.5 text-slate-500 text-sm">重点布局华人密度最高的州，持续扩展中</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { code: "CA", name: "加州", hot: true },
              { code: "NY", name: "纽约", hot: true },
              { code: "TX", name: "德州", hot: true },
              { code: "WA", name: "华州", hot: true },
              { code: "NJ", name: "新泽西", hot: true },
              { code: "MA", name: "麻省", hot: false },
              { code: "FL", name: "佛罗里达", hot: false },
              { code: "IL", name: "伊利诺伊", hot: false },
              { code: "GA", name: "乔治亚", hot: false },
              { code: "VA", name: "弗吉尼亚", hot: false },
              { code: "MD", name: "马里兰", hot: false },
              { code: "HI", name: "夏威夷", hot: false },
              { code: "PA", name: "宾夕法尼亚", hot: false },
              { code: "MI", name: "密歇根", hot: false },
            ].map((state) => (
              <Link
                key={state.code}
                href={`/case/new`}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all hover:shadow-sm ${
                  state.hot
                    ? "bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-400"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                <span className="font-bold">{state.code}</span>
                <span className="text-xs opacity-70">{state.name}</span>
                {state.hot && <span className="text-xs text-amber-500">●</span>}
              </Link>
            ))}
            <div className="flex items-center px-4 py-2 text-sm text-slate-400">
              + 全美其他州...
            </div>
          </div>
        </div>
      </section>

      {/* ── ATTORNEY CTA ─────────────────────────────────── */}
      <section className="bg-slate-900 py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 bg-amber-600/10 border border-amber-500/20 rounded-2xl mb-6">
            <ScalesIcon className="h-7 w-7 text-amber-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">您是律师吗？</h2>
          <p className="mt-1.5 text-amber-400 font-medium text-lg">加入华人119找律师网，获取精准华人案源</p>
          <div className="mt-6 grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            {[
              { emoji: "🎯", title: "精准案源", desc: "按专长、州、语言筛选，减少无效咨询" },
              { emoji: "💰", title: "透明收费", desc: "Credit竞价制，按接单付费，成本可控" },
              { emoji: "📊", title: "数据看板", desc: "响应率、转化率、客户评分，优化运营" },
            ].map((item) => (
              <div key={item.title} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="text-2xl mb-2">{item.emoji}</div>
                <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-slate-400 text-xs leading-5">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/for-attorneys"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              了解律师入驻详情
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/attorney/onboarding"
              className="inline-flex items-center gap-2 border border-slate-600 hover:border-amber-500 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors"
            >
              立即申请入驻 →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
