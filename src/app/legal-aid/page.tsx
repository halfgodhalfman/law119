"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";

// ─── Types ───────────────────────────────────────────────────────────────────

type PackageType = "PRO_BONO" | "SLIDING_SCALE" | "FIXED_PRICE" | "FREE_CONSULT";
type LegalCategory =
  | "IMMIGRATION" | "CRIMINAL" | "CIVIL" | "REAL_ESTATE"
  | "FAMILY" | "BUSINESS" | "ESTATE_PLAN" | "LABOR" | "TAX" | "OTHER";

interface ServicePackage {
  id: string;
  title: string;
  titleEn?: string | null;
  category: LegalCategory;
  stateCode?: string | null;
  description: string;
  deliverables: string;
  packageType: PackageType;
  price?: number | null;
  priceLabel?: string | null;
  incomeCapAnnual?: number | null;
  eligibilityCriteria?: string | null;
  estimatedDays?: number | null;
  sessionCount?: number | null;
  sessionMinutes?: number | null;
  maxCasesPerMonth?: number | null;
  totalBooked: number;
  attorney: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    firmName?: string | null;
    avatarUrl?: string | null;
    barNumberVerified: boolean;
    isVerified: boolean;
    yearsExperience?: number | null;
    proBonoAvailable: boolean;
    slidingScaleAvailable: boolean;
    legalAidPartner: boolean;
    specialties: { category: LegalCategory }[];
    serviceAreas: { stateCode: string }[];
    languages: { language: string }[];
    badges: { badgeType: string }[];
    avgRating?: number | null;
    reviewCount: number;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<LegalCategory, string> = {
  IMMIGRATION: "🌎 移民", CRIMINAL: "⚖️ 刑事", CIVIL: "🏛️ 民事",
  REAL_ESTATE: "🏠 房产", FAMILY: "👨‍👩‍👧 家庭", BUSINESS: "💼 商业",
  ESTATE_PLAN: "📜 信托遗产", LABOR: "👷 劳工", TAX: "💰 税务", OTHER: "📋 其他",
};

const PACKAGE_TYPE_CONFIG: Record<PackageType, {
  label: string; labelEn: string; color: string; bg: string; border: string; icon: string; desc: string;
}> = {
  PRO_BONO:      { label: "完全免费", labelEn: "Pro Bono",      color: "text-emerald-300", bg: "bg-emerald-900/30", border: "border-emerald-600/40", icon: "🤝", desc: "律师自愿提供的公益免费服务" },
  FREE_CONSULT:  { label: "免费咨询", labelEn: "Free Consult",  color: "text-sky-300",     bg: "bg-sky-900/30",     border: "border-sky-600/40",     icon: "💬", desc: "初次咨询免费，后续服务另议" },
  SLIDING_SCALE: { label: "滑动收费", labelEn: "Sliding Scale", color: "text-amber-300",   bg: "bg-amber-900/30",   border: "border-amber-600/40",   icon: "📊", desc: "按您的收入比例协商费用" },
  FIXED_PRICE:   { label: "固定低价", labelEn: "Fixed Price",   color: "text-violet-300",  bg: "bg-violet-900/30",  border: "border-violet-600/40",  icon: "🏷️", desc: "透明定价，无隐藏收费" },
};

const US_STATES: Record<string, string> = {
  CA: "加州", NY: "纽约", TX: "德州", WA: "华盛顿州",
  IL: "伊利诺伊", MA: "马萨诸塞", NJ: "新泽西", GA: "佐治亚",
  FL: "佛罗里达", VA: "弗吉尼亚", MD: "马里兰", PA: "宾夕法尼亚",
};

// ─── Package Card ────────────────────────────────────────────────────────────

function PackageCard({ pkg }: { pkg: ServicePackage }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = PACKAGE_TYPE_CONFIG[pkg.packageType];
  const atty = pkg.attorney;
  const name = [atty.firstName, atty.lastName].filter(Boolean).join(" ") || "律师";
  const states = atty.serviceAreas.map((s) => US_STATES[s.stateCode] ?? s.stateCode).slice(0, 3);

  // Pre-fill case form URL
  const caseUrl = `/case/new?category=${pkg.category}&title=${encodeURIComponent(`咨询：${pkg.title}`)}&description=${encodeURIComponent(`您好，我希望预约律师 ${name} 的"${pkg.title}"服务包。`)}`;

  return (
    <div className={`rounded-xl border ${typeConfig.border} ${typeConfig.bg} overflow-hidden transition-all`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            {/* Type badge */}
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${typeConfig.border} ${typeConfig.color} mb-2`}>
              {typeConfig.icon} {typeConfig.label}
            </span>
            <h3 className="text-white font-bold text-base leading-tight">{pkg.title}</h3>
            {pkg.titleEn && <p className="text-slate-400 text-xs mt-0.5">{pkg.titleEn}</p>}
          </div>
          {/* Price */}
          <div className="text-right flex-shrink-0">
            <div className={`text-xl font-black ${typeConfig.color}`}>
              {pkg.priceLabel ?? (pkg.price != null ? `$${pkg.price}` : "免费")}
            </div>
            {pkg.incomeCapAnnual && (
              <div className="text-xs text-slate-500 mt-0.5">
                年收入 &lt; ${pkg.incomeCapAnnual.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Category + State */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full">
            {CATEGORY_LABELS[pkg.category]}
          </span>
          {states.length > 0 && (
            <span className="text-xs text-slate-400">📍 {states.join(" · ")}{atty.serviceAreas.length > 3 ? "..." : ""}</span>
          )}
          {pkg.sessionCount && (
            <span className="text-xs text-slate-400">
              🗓️ {pkg.sessionCount}次咨询{pkg.sessionMinutes ? `×${pkg.sessionMinutes}分钟` : ""}
            </span>
          )}
          {pkg.estimatedDays && (
            <span className="text-xs text-slate-400">⏱️ 约{pkg.estimatedDays}天</span>
          )}
        </div>

        {/* Description */}
        <p className="text-slate-300 text-sm leading-relaxed line-clamp-2">{pkg.description}</p>

        {/* Attorney info */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-700/40">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden">
            {atty.avatarUrl ? (
              <img src={atty.avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                {name.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-white text-sm font-semibold truncate">{name}</span>
              {atty.barNumberVerified && <span className="text-emerald-400 text-xs">✓执照核验</span>}
              {atty.legalAidPartner && <span className="text-sky-400 text-xs">🏛️援助机构</span>}
            </div>
            <div className="flex items-center gap-2">
              {atty.avgRating && (
                <span className="text-amber-400 text-xs">★ {atty.avgRating} ({atty.reviewCount}评价)</span>
              )}
              {atty.yearsExperience && (
                <span className="text-slate-400 text-xs">{atty.yearsExperience}年经验</span>
              )}
              {atty.languages.map((l) => (
                <span key={l.language} className="text-slate-500 text-xs">
                  {l.language === "MANDARIN" ? "普" : l.language === "CANTONESE" ? "粤" : "英"}
                </span>
              ))}
            </div>
          </div>
          {pkg.totalBooked > 0 && (
            <div className="text-slate-500 text-xs flex-shrink-0">{pkg.totalBooked}人预约</div>
          )}
        </div>
      </div>

      {/* Expand / Collapse */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-2.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-700/40 transition-colors flex items-center justify-center gap-1"
      >
        {expanded ? "收起详情 ▲" : "查看包含内容 ▼"}
      </button>

      {expanded && (
        <div className="px-5 py-4 bg-slate-800/50 border-t border-slate-700/30">
          {/* Deliverables */}
          <p className="text-slate-400 text-xs font-semibold mb-2">📦 包含内容</p>
          <div className="text-slate-300 text-sm whitespace-pre-line leading-relaxed mb-4">
            {pkg.deliverables}
          </div>

          {/* Eligibility */}
          {pkg.eligibilityCriteria && (
            <div className="bg-amber-900/20 border border-amber-600/20 rounded-lg px-4 py-2.5 mb-4">
              <p className="text-amber-300 text-xs font-semibold mb-1">📋 申请资格</p>
              <p className="text-amber-200/80 text-xs leading-relaxed">{pkg.eligibilityCriteria}</p>
            </div>
          )}

          {/* Max per month */}
          {pkg.maxCasesPerMonth && (
            <p className="text-slate-500 text-xs mb-4">
              ⚠️ 每月限接 {pkg.maxCasesPerMonth} 个申请，额满即止
            </p>
          )}

          {/* CTA */}
          <div className="flex gap-2">
            <Link
              href={`/attorneys/${atty.id}`}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors text-center"
            >
              查看律师主页
            </Link>
            <Link
              href={caseUrl}
              className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-bold transition-colors text-center ${
                pkg.packageType === "PRO_BONO" || pkg.packageType === "FREE_CONSULT"
                  ? "bg-emerald-700 hover:bg-emerald-600"
                  : "bg-amber-600 hover:bg-amber-500"
              }`}
            >
              {pkg.packageType === "PRO_BONO" ? "申请免费援助 →" :
               pkg.packageType === "FREE_CONSULT" ? "预约免费咨询 →" :
               pkg.packageType === "SLIDING_SCALE" ? "了解滑动收费 →" :
               "立即预约 →"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LegalAidPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeType, setActiveType] = useState<PackageType | "">("");
  const [activeCategory, setActiveCategory] = useState<LegalCategory | "">("");
  const [activeState, setActiveState] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        pageSize: String(PAGE_SIZE),
        page: String(page),
        ...(activeType ? { type: activeType } : {}),
        ...(activeCategory ? { category: activeCategory } : {}),
        ...(activeState ? { stateCode: activeState } : {}),
      });
      const res = await fetch(`/api/marketplace/service-packages?${qs}`);
      const json = await res.json();
      if (json.ok) {
        setPackages(json.packages ?? []);
        setTotal(json.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [activeType, activeCategory, activeState, page]);

  useEffect(() => { void load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [activeType, activeCategory, activeState]);

  const typeFilters: { key: PackageType | ""; label: string; icon: string }[] = [
    { key: "",             label: "全部",    icon: "✦" },
    { key: "PRO_BONO",    label: "完全免费", icon: "🤝" },
    { key: "FREE_CONSULT",label: "免费咨询", icon: "💬" },
    { key: "SLIDING_SCALE",label: "滑动收费",icon: "📊" },
    { key: "FIXED_PRICE", label: "固定低价", icon: "🏷️" },
  ];

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-900">

        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="text-center max-w-3xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-900/40 border border-emerald-600/30 text-emerald-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                法律援助专区 · Legal Aid Center
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
                华人法律援助 &amp; 低价服务
              </h1>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8">
                汇聚平台认证律师提供的<strong className="text-emerald-300">免费公益服务</strong>、
                <strong className="text-amber-300">滑动收费</strong>（按收入定价）及
                <strong className="text-violet-300">固定低价套餐</strong>，
                让每位华人都能获得专业法律帮助
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-10">
                {[
                  { label: "服务包", value: String(total || "--"), sub: "免费/低价" },
                  { label: "法律领域", value: "10", sub: "全覆盖" },
                  { label: "语言支持", value: "3", sub: "中英粤" },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-800/60 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-white">{s.value}</div>
                    <div className="text-xs text-slate-400">{s.label}</div>
                    <div className="text-xs text-emerald-400">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                {[
                  { icon: "🤝", title: "公益 Pro Bono", desc: "律师自愿提供，完全免费，帮助真正需要法律援助的华人家庭" },
                  { icon: "📊", title: "滑动收费", desc: "根据您的年收入协商费用，低收入家庭可享最低档收费" },
                  { icon: "🏷️", title: "固定低价包", desc: "透明定价，无隐藏收费，一次付清，适合预算有限的用户" },
                ].map((card) => (
                  <div key={card.title} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                    <div className="text-2xl mb-2">{card.icon}</div>
                    <h3 className="text-white font-semibold text-sm mb-1">{card.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Filters ──────────────────────────────────────── */}
        <section className="sticky top-16 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-wrap gap-2">
              {/* Type filters */}
              {typeFilters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActiveType(f.key)}
                  className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    activeType === f.key
                      ? "bg-emerald-700 border-emerald-600 text-white"
                      : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400"
                  }`}
                >
                  {f.icon} {f.label}
                </button>
              ))}

              <div className="w-px h-6 bg-slate-700 self-center mx-1" />

              {/* Category */}
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value as LegalCategory | "")}
                className="text-xs bg-slate-800 border border-slate-600 text-slate-300 rounded-full px-3 py-1.5 appearance-none cursor-pointer"
              >
                <option value="">所有领域</option>
                {(Object.entries(CATEGORY_LABELS) as [LegalCategory, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              {/* State */}
              <select
                value={activeState}
                onChange={(e) => setActiveState(e.target.value)}
                className="text-xs bg-slate-800 border border-slate-600 text-slate-300 rounded-full px-3 py-1.5 appearance-none cursor-pointer"
              >
                <option value="">所有州</option>
                {Object.entries(US_STATES).map(([code, name]) => (
                  <option key={code} value={code}>{name}({code})</option>
                ))}
              </select>

              {/* Reset */}
              {(activeType || activeCategory || activeState) && (
                <button
                  type="button"
                  onClick={() => { setActiveType(""); setActiveCategory(""); setActiveState(""); }}
                  className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5 transition-colors"
                >
                  × 清除筛选
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── Package List ──────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-slate-400 mb-2">暂无符合条件的服务包</p>
              <p className="text-slate-500 text-sm">请调整筛选条件，或</p>
              <Link href="/qa" className="text-emerald-400 hover:text-emerald-300 text-sm underline mt-1 inline-block">
                免费向律师提问 →
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-bold">
                  共 <span className="text-emerald-400">{total}</span> 个服务包
                </h2>
                <p className="text-slate-500 text-sm">按优先级排序：免费 &gt; 免费咨询 &gt; 滑动收费 &gt; 固定低价</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 text-sm"
                  >
                    ← 上一页
                  </button>
                  <span className="text-slate-400 text-sm">{page} / {totalPages}</span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 text-sm"
                  >
                    下一页 →
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── How to Apply ──────────────────────────────────── */}
        <section className="border-t border-slate-700/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <h2 className="text-white font-bold text-xl text-center mb-8">如何申请法律援助？</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              {[
                { step: "1", icon: "🔍", title: "浏览服务包", desc: "按类型、州、领域筛选，找到适合您的援助服务" },
                { step: "2", icon: "📋", title: "查看资格要求", desc: "确认您符合该服务包的申请资格（如收入限制）" },
                { step: "3", icon: "📝", title: "提交申请", desc: "点击「申请援助」，填写您的案情描述，发送给律师" },
                { step: "4", icon: "💬", title: "律师联系您", desc: "律师审核后通过平台与您取得联系，确认服务细节" },
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-900/50 border border-emerald-600/40 flex items-center justify-center mx-auto mb-3">
                    <span className="text-emerald-300 font-bold text-sm">{s.step}</span>
                  </div>
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <h3 className="text-white font-semibold text-sm mb-1">{s.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA for attorneys ─────────────────────────────── */}
        <section className="border-t border-slate-700/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="bg-gradient-to-r from-slate-800 to-slate-800/60 border border-slate-600/30 rounded-2xl p-8 text-center">
              <div className="text-3xl mb-3">⚖️</div>
              <h3 className="text-white font-bold text-lg mb-2">律师：加入法律援助专区</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                发布您的免费/低价服务包，帮助更多华人获得法律帮助，
                同时提升您的平台曝光度和用户信任。
                平台将为您授予 <strong className="text-emerald-300">「Pro Bono 公益律师」</strong> 专属徽章。
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/qa"
                  className="px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
                >
                  免费问答回答问题
                </Link>
                <Link
                  href="/attorney/service-packages"
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-colors"
                >
                  发布我的服务包 →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Disclaimer ────────────────────────────────────── */}
        <section className="border-t border-slate-700/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <p className="text-slate-600 text-xs leading-relaxed text-center">
              ⚠️ 法律援助服务包由律师个人自愿发布，Law119 平台仅作展示，不对服务内容、可用性及服务结果负责。
              使用援助服务前请仔细阅读服务说明及资格要求。本页面内容不构成法律建议。
              如遇紧急法律情况，请拨打当地法律援助热线。
            </p>
          </div>
        </section>

      </main>
    </>
  );
}
