import Link from "next/link";
import { NavBar } from "../../components/ui/nav-bar";
import { Footer } from "../../components/ui/footer";
import { ArrowRightIcon, ScalesIcon, ShieldCheckIcon, LockClosedIcon, GlobeAltIcon } from "../../components/ui/icons";

const MISSION_VALUES = [
  {
    emoji: "🎯",
    title: "使命 Mission",
    content: "让每个在美国遇到法律问题的华人，都能在最短时间内找到合适的人、对的律师、最佳方案。",
    en: "Every Chinese person in the US deserves access to the right attorney — quickly, transparently, and in their language.",
  },
  {
    emoji: "🌐",
    title: "愿景 Vision",
    content: "成为北美华人法律服务的基础设施（Legal Infrastructure for Chinese Community in the US）。",
    en: "To become the legal infrastructure for the Chinese community across North America.",
  },
  {
    emoji: "⚖️",
    title: "价值主张 Value",
    content: "把「非标服务」做成「可比较、可管理、可复购」的平台型产品。让法律服务透明、可信、可追溯。",
    en: "Transform non-standardized legal services into a comparable, manageable, and scalable platform product.",
  },
];

const PLATFORM_PRINCIPLES = [
  {
    icon: ShieldCheckIcon,
    title: "律师执照核验",
    desc: "所有入驻律师必须通过州律师协会执照验证，确保合规执业资格，保护客户利益。",
  },
  {
    icon: LockClosedIcon,
    title: "信息独立与合规",
    desc: "平台不提供法律建议，不与律师共担法律责任。律师与客户之间的关系完全独立，平台仅提供撮合与履约工具。",
  },
  {
    icon: GlobeAltIcon,
    title: "沟通留痕与透明",
    desc: "所有沟通记录、合同节点、付款状态在平台内留存，确保双方权益有据可查。",
  },
  {
    icon: ScalesIcon,
    title: "中立撮合原则",
    desc: "平台按客观指标（响应率、专长匹配度、客户评分）排名律师，不接受付费排名，确保推荐结果公正。",
  },
];

const PAIN_POINTS = [
  {
    side: "客户痛点",
    emoji: "😟",
    color: "bg-rose-50 border-rose-200",
    titleColor: "text-rose-800",
    items: [
      "不知道找谁、怕被坑、语言与文化沟通成本高",
      "法律服务高度不透明：收费、流程、风险、时间线全靠感觉",
      "很多是紧急情况（移民/刑事/家暴/拘留/止赎），需要快速响应",
    ],
  },
  {
    side: "律师痛点",
    emoji: "📉",
    color: "bg-amber-50 border-amber-200",
    titleColor: "text-amber-800",
    items: [
      "获客成本高，依赖熟人圈/广告平台，线索质量不稳定",
      "咨询多但转化低，时间被大量非目标客户消耗",
      "很难规模化：个人品牌强，团队与流程弱",
    ],
  },
];

const COMPLIANCE = [
  "平台不提供法律意见，不替代律师，不承诺案件结果",
  "平台是「信息与交易撮合平台」，律师自行执业、独立承担责任",
  "律师入驻需要核验：执照编号、执业州、执照有效状态",
  "排名机制透明化：响应率、成交率、用户评分等客观指标决定排名，不接受付费置顶",
  "关键流程留痕：沟通记录、付款节点、服务条款、纠纷机制全程可追溯",
];

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <NavBar />

      {/* HERO */}
      <section className="relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-600/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="text-amber-400 text-sm font-medium">关于我们 · About Us</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            美国华人119找律师网
          </h1>
          <p className="mt-4 text-xl text-amber-400 font-semibold">
            全美华人法律服务撮合平台 · Law119
          </p>
          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-7">
            面向北美华人市场的"法律服务撮合与履约平台"——让华人客户一键发布案件，让华人律师按专业在线竞价接单，形成标准化、可规模化的法律服务供给网络。
          </p>
        </div>
      </section>

      {/* ONE-LINER POSITIONING */}
      <section className="py-12 bg-amber-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-white text-lg sm:text-2xl font-bold leading-snug">
            "有法律问题，找119"
          </p>
          <p className="text-amber-100 mt-2 text-sm sm:text-base">
            发布案件 · 智能匹配 · 律师接单 · 安全透明 · 高效解决
          </p>
        </div>
      </section>

      {/* MISSION / VISION / VALUE */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">我们的使命与愿景</h2>
            <p className="mt-2 text-slate-500">Mission, Vision & Values</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {MISSION_VALUES.map((item) => (
              <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="text-3xl mb-4">{item.emoji}</div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-700 leading-6 mb-3">{item.content}</p>
                <p className="text-xs text-slate-400 leading-5 italic">{item.en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY WE EXIST — Pain Points */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">我们解决的核心问题</h2>
            <p className="mt-2 text-slate-500">The Problems We Solve</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {PAIN_POINTS.map((section) => (
              <div key={section.side} className={`rounded-2xl border-2 p-6 ${section.color}`}>
                <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${section.titleColor}`}>
                  <span className="text-2xl">{section.emoji}</span>
                  {section.side}
                </h3>
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span className="text-slate-400 mt-1 flex-shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Solution */}
          <div className="mt-8 bg-slate-900 rounded-2xl p-6 text-center">
            <h3 className="text-white font-bold text-lg mb-3">
              华人119找律师网 = 案件发布 + 智能分流 + 律师接单 + 履约管理 + 评价体系
            </h3>
            <p className="text-slate-400 text-sm leading-6">
              把找律师这件事做成"可交易、可管理"的流程。不是黄页，不是广告平台。
            </p>
          </div>
        </div>
      </section>

      {/* PLATFORM PRINCIPLES */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">平台运营原则</h2>
            <p className="mt-2 text-slate-500">Platform Principles · How we operate</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLATFORM_PRINCIPLES.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <div className="h-10 w-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-amber-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">{p.title}</h3>
                  <p className="text-xs text-slate-600 leading-5">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* COMPLIANCE */}
      <section className="py-16 bg-amber-50 border-y border-amber-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">合规声明</h2>
            <p className="mt-2 text-slate-500 text-sm">Compliance & Legal Framework</p>
          </div>
          <div className="space-y-3">
            {COMPLIANCE.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-xl border border-amber-200 px-4 py-3">
                <span className="h-5 w-5 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 leading-5">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-white rounded-xl border border-amber-200 px-4 py-4">
            <p className="text-xs text-slate-500 leading-5">
              <strong className="text-slate-700">法律免责声明：</strong>
              美国华人119找律师网（Law119）不是律师事务所，不提供法律建议，不保证案件结果。使用本平台不构成律师-客户关系。所有律师均为独立执业者，对其法律代理行为独立承担专业责任。
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-14">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">开始使用美国华人119找律师网</h2>
          <p className="mt-3 text-slate-400">无论您是需要法律帮助的客户，还是寻找精准案源的律师</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/case/new"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              发布案件（客户）
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/for-attorneys"
              className="inline-flex items-center gap-2 border border-slate-600 hover:border-amber-500 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors"
            >
              律师入驻了解详情 →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
