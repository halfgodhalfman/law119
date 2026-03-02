import Link from "next/link";
import { CATEGORY_MAP } from "@/lib/legal-categories";

interface MatchedAttorney {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  firmName: string | null;
  isVerified: boolean;
  yearsExperience: number | null;
  specialties: { category: string }[];
}

interface QaAttorneyCtaProps {
  category: string;
  stateCode?: string | null;
  matchedAttorneys?: MatchedAttorney[];
}

export function QaAttorneyCta({ category, stateCode, matchedAttorneys = [] }: QaAttorneyCtaProps) {
  const cat = CATEGORY_MAP[category as keyof typeof CATEGORY_MAP];
  const caseUrl = `/case/new${category ? `?category=${category}` : ""}${
    stateCode ? `&state=${stateCode}` : ""
  }`;

  return (
    <div className="bg-gradient-to-br from-amber-950/40 to-slate-800 border border-amber-600/30 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl flex-shrink-0">{cat?.emoji ?? "⚖️"}</span>
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">
            需要深入的{cat?.nameZh ?? "法律"}咨询？
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            平台上的认证{cat?.nameZh ?? ""}律师可为您提供一对一专业法律服务。
            发布案件后，多位律师将主动报价，您对比后选择最合适的律师。
          </p>
        </div>
      </div>

      {/* 匹配律师卡片 */}
      {matchedAttorneys.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-amber-400/80 font-medium mb-2">
            ✨ 平台上 {matchedAttorneys.length} 位{cat?.nameZh ?? ""}专长律师可为您服务
          </p>
          <div className="space-y-2">
            {matchedAttorneys.map((attorney) => {
              const name =
                [attorney.firstName, attorney.lastName].filter(Boolean).join(" ") || "律师";
              const initials = name.slice(0, 1).toUpperCase();
              return (
                <div
                  key={attorney.id}
                  className="flex items-center justify-between gap-3 bg-slate-800/60 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {attorney.avatarUrl ? (
                      <img
                        src={attorney.avatarUrl}
                        alt={name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{initials}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-xs font-medium truncate">{name}</span>
                        {attorney.isVerified && (
                          <span className="text-[10px] bg-blue-900/40 text-blue-400 border border-blue-600/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            ✓ 认证
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11px] truncate">
                        {attorney.firmName ?? "执业律师"}
                        {attorney.yearsExperience ? ` · ${attorney.yearsExperience}年经验` : ""}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/attorneys/${attorney.id}`}
                    className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg bg-amber-700/40 text-amber-400 hover:bg-amber-700/60 transition-colors border border-amber-600/20"
                  >
                    查看
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Link
        href={caseUrl}
        className="block w-full text-center px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
      >
        免费发布法律案件，获得多位律师报价 →
      </Link>
    </div>
  );
}
