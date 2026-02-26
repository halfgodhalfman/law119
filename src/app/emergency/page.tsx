import Link from "next/link";
import { NavBar } from "../../components/ui/nav-bar";
import { Footer } from "../../components/ui/footer";
import { ArrowRightIcon, ShieldCheckIcon, CheckCircleIcon } from "../../components/ui/icons";

const EMERGENCY_CATEGORIES = [
  {
    emoji: "🔒",
    title: "刑事拘留 / 逮捕",
    en: "Criminal Arrest & Detention",
    desc: "被警方逮捕、拘留，需要立即联系刑事辩护律师，了解您的权利，安排保释。",
    urgency: "URGENT",
    href: "/case/new?category=CRIMINAL&urgency=URGENT",
    color: "border-rose-300 bg-rose-50",
    badge: "bg-rose-600 text-white",
  },
  {
    emoji: "🏠",
    title: "止赎令 / 驱逐通知",
    en: "Foreclosure & Eviction Notice",
    desc: "收到法院止赎令或房东驱逐通知，有严格的法定期限，需要尽快获得法律援助。",
    urgency: "URGENT",
    href: "/case/new?category=REAL_ESTATE&urgency=URGENT",
    color: "border-rose-300 bg-rose-50",
    badge: "bg-rose-600 text-white",
  },
  {
    emoji: "👨‍👩‍👧",
    title: "家暴 / 保护令",
    en: "Domestic Violence & Restraining Order",
    desc: "遭遇家庭暴力，需要申请保护令或紧急人身安全保护，法律援助可快速介入。",
    urgency: "URGENT",
    href: "/case/new?category=FAMILY&urgency=URGENT",
    color: "border-rose-300 bg-rose-50",
    badge: "bg-rose-600 text-white",
  },
  {
    emoji: "✈️",
    title: "移民拘留 / ICE",
    en: "Immigration Detention & ICE",
    desc: "被移民局（ICE）拘留，或收到驱逐令，需要立即联系移民律师处理紧急状况。",
    urgency: "URGENT",
    href: "/case/new?category=IMMIGRATION&urgency=URGENT",
    color: "border-rose-300 bg-rose-50",
    badge: "bg-rose-600 text-white",
  },
  {
    emoji: "🚗",
    title: "酒驾 / 交通事故",
    en: "DUI / Traffic Accident",
    desc: "DUI被捕、重大交通事故伤亡、肇事逃逸，有短暂窗口期申诉驾照和处理刑事指控。",
    urgency: "HIGH",
    href: "/case/new?category=CRIMINAL&urgency=HIGH",
    color: "border-orange-300 bg-orange-50",
    badge: "bg-orange-500 text-white",
  },
  {
    emoji: "🏢",
    title: "紧急商业纠纷",
    en: "Emergency Business Dispute",
    desc: "合同违约、财产冻结、紧急禁令申请，商业纠纷中时效性关键，需快速法律介入。",
    urgency: "HIGH",
    href: "/case/new?category=BUSINESS&urgency=HIGH",
    color: "border-orange-300 bg-orange-50",
    badge: "bg-orange-500 text-white",
  },
  {
    emoji: "💼",
    title: "劳工权益紧急事项",
    en: "Urgent Labor & Employment",
    desc: "被非法解雇、拖欠工资、职场骚扰，劳工法投诉有严格时效，务必尽早寻求法律建议。",
    urgency: "HIGH",
    href: "/case/new?category=LABOR&urgency=HIGH",
    color: "border-orange-300 bg-orange-50",
    badge: "bg-orange-500 text-white",
  },
  {
    emoji: "💰",
    title: "诈骗追回 / 资产追偿",
    en: "Fraud Recovery & Asset Recovery",
    desc: "投资诈骗、网络骗局、被骗资金追回，时间越短追回成功率越高。",
    urgency: "HIGH",
    href: "/case/new?category=CIVIL&urgency=HIGH",
    color: "border-orange-300 bg-orange-50",
    badge: "bg-orange-500 text-white",
  },
];

const URGENCY_STEPS = [
  {
    step: "1",
    title: "立即发案",
    desc: "选择紧急案件类型，简要描述情况。匿名发案，无需注册，2分钟完成。",
    emoji: "📋",
  },
  {
    step: "2",
    title: "快速匹配",
    desc: "平台优先推送给专注该领域且响应最快的律师，紧急案件响应时间通常 < 2 小时。",
    emoji: "⚡",
  },
  {
    step: "3",
    title: "律师联系您",
    desc: "律师在平台内与您沟通，您只在准备好时才披露个人信息，全程安全。",
    emoji: "💬",
  },
];

const URGENCY_MAP: Record<string, string> = {
  URGENT: "紧急",
  HIGH: "高优先",
};

export default function EmergencyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <NavBar />

      {/* EMERGENCY HERO */}
      <section className="relative bg-rose-950 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-950 via-slate-900 to-slate-900" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          {/* Pulsing Badge */}
          <div className="inline-flex items-center gap-2 bg-rose-600/20 border border-rose-500/30 rounded-full px-4 py-2 mb-8">
            <span className="h-2.5 w-2.5 bg-rose-500 rounded-full animate-pulse" />
            <span className="text-rose-300 text-sm font-semibold">紧急法律求助 · Emergency Legal Help</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            🚨 紧急法律救援中心
          </h1>
          <p className="mt-3 text-xl text-rose-300 font-semibold">
            美国华人119找律师网 · Emergency Legal Hotline
          </p>
          <p className="mt-5 text-base text-slate-400 max-w-xl mx-auto leading-7">
            刑事拘留、移民危机、家暴、止赎——遇到紧急法律情况，
            每分钟都可能影响结果。立即发案，优先匹配最快响应的华人律师。
          </p>

          <div className="mt-10">
            <Link
              href="/case/new?urgency=URGENT"
              className="inline-flex items-center gap-3 bg-rose-600 hover:bg-rose-500 text-white font-bold px-8 py-4 rounded-xl transition-all text-lg shadow-lg shadow-rose-900/40"
            >
              <span className="text-xl">🚨</span>
              立即发布紧急案件
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <p className="text-slate-500 text-sm mt-3">匿名 · 免费发案 · 无需注册 · 优先处理</p>
          </div>
        </div>
      </section>

      {/* HOW FAST */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { value: "< 2h", label: "紧急案件律师响应", sub: "Emergency Response" },
              { value: "24/7", label: "平台始终在线接案", sub: "Always Available" },
              { value: "0元", label: "发案费用，完全免费", sub: "Free to Post" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl sm:text-3xl font-bold text-rose-600">{s.value}</p>
                <p className="text-xs sm:text-sm text-slate-700 font-medium mt-1">{s.label}</p>
                <p className="text-xs text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-900 text-center mb-8">紧急求助 3 步流程</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {URGENCY_STEPS.map((s) => (
              <div key={s.step} className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
                <div className="h-14 w-14 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">{s.emoji}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">第{s.step}步 · {s.title}</h3>
                <p className="text-xs text-slate-500 leading-5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMERGENCY CATEGORIES */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">紧急法律情况类型</h2>
            <p className="mt-2 text-slate-500">Emergency Legal Categories · Point to your situation</p>
          </div>

          {/* URGENT */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2.5 w-2.5 bg-rose-500 rounded-full animate-pulse" />
              <h3 className="text-base font-bold text-rose-700">🚨 最紧急 — 需立即处理（可能涉及人身自由或安全）</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {EMERGENCY_CATEGORIES.filter(c => c.urgency === "URGENT").map((cat) => (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className={`group flex flex-col gap-3 p-5 rounded-2xl border-2 transition-all hover:shadow-lg hover:-translate-y-0.5 ${cat.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{cat.emoji}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cat.badge}`}>
                      {URGENCY_MAP[cat.urgency]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{cat.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{cat.en}</p>
                  </div>
                  <p className="text-xs text-slate-600 leading-5">{cat.desc}</p>
                  <div className="flex items-center gap-1 text-rose-600 text-xs font-semibold mt-auto group-hover:gap-2 transition-all">
                    立即发案 <ArrowRightIcon className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* HIGH */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2.5 w-2.5 bg-orange-500 rounded-full" />
              <h3 className="text-base font-bold text-orange-700">⚡ 高优先 — 有法定时效，尽快处理</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {EMERGENCY_CATEGORIES.filter(c => c.urgency === "HIGH").map((cat) => (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className={`group flex flex-col gap-3 p-5 rounded-2xl border-2 transition-all hover:shadow-lg hover:-translate-y-0.5 ${cat.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{cat.emoji}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cat.badge}`}>
                      {URGENCY_MAP[cat.urgency]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{cat.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{cat.en}</p>
                  </div>
                  <p className="text-xs text-slate-600 leading-5">{cat.desc}</p>
                  <div className="flex items-center gap-1 text-orange-600 text-xs font-semibold mt-auto group-hover:gap-2 transition-all">
                    立即发案 <ArrowRightIcon className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* RIGHTS REMINDER */}
      <section className="py-12 bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-bold text-white text-center mb-6">📜 您的基本权利（请牢记）</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "您有权保持沉默（Miranda Rights）",
              "您有权要求律师在场后再接受问询",
              "您有权拒绝没有搜查令的搜查",
              "移民局问询时您有权不回答问题",
              "被逮捕后您有权通知家属或律师",
              "任何正式认罪前请先咨询律师",
            ].map((right) => (
              <div key={right} className="flex items-start gap-2.5 bg-slate-800 rounded-xl border border-slate-700 px-4 py-3">
                <ShieldCheckIcon className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300">{right}</p>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-xs text-center mt-4">
            以上信息仅供参考，不构成法律建议。每个案件情况不同，请尽快咨询执业律师。
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-rose-900 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white">不要等待，立即发案</h2>
          <p className="mt-2 text-rose-300 text-sm">
            在紧急法律情况下，每分钟都重要。美国华人119找律师网优先匹配响应最快的华人律师。
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/case/new?urgency=URGENT"
              className="inline-flex items-center gap-2 bg-white hover:bg-rose-50 text-rose-700 font-bold px-6 py-3 rounded-xl transition-colors text-base"
            >
              🚨 立即发布紧急案件
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 border border-rose-700 hover:border-rose-500 text-rose-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors"
            >
              查看所有法律服务
            </Link>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-rose-400 text-xs">
            <CheckCircleIcon className="h-3.5 w-3.5" />
            <span>匿名发案 · 无需注册 · 完全免费 · 24小时在线</span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
