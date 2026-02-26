import Link from "next/link";

/**
 * AttorneyCard — animated attorney listing card.
 *
 * Uses Tailwind CSS `group` hover pattern for the "lift + expand" effect.
 * No Framer Motion required — all animations via CSS transitions.
 */

type AttorneyCardProps = {
  attorney: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    firmName: string | null;
    barState: string | null;
    yearsExperience: number | null;
    barNumberVerified: boolean;
    isVerified: boolean;
    specialties: { category: string }[];
    serviceAreas: { stateCode: string }[];
  };
  trust: {
    totalScore: number;
    grade: string;
  };
  tier: {
    label: string;
  };
  reviewAvg: number | null;
  reviewCount: number;
  snapshot: {
    avgFirstMessageMinutes: number | null;
    completionRate: number | null;
    qualityScore: number | null;
  } | null;
  /** Optional brief recent review comment shown on hover */
  recentReviewComment?: string | null;
};

export function AttorneyCard({
  attorney,
  trust,
  tier,
  reviewAvg,
  reviewCount,
  snapshot,
  recentReviewComment,
}: AttorneyCardProps) {
  const fullName =
    [attorney.firstName, attorney.lastName].filter(Boolean).join(" ") || "Attorney";

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-amber-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: name + badges + specialties */}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {attorney.barNumberVerified && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Bar Verified
              </span>
            )}
            {attorney.isVerified && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                Verified
              </span>
            )}
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {tier.label}
            </span>
            {snapshot?.avgFirstMessageMinutes != null &&
              snapshot.avgFirstMessageMinutes <= 60 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  ⚡ Fast Responder
                </span>
              )}
          </div>

          {/* Name — colour transition on hover */}
          <p className="font-semibold text-slate-900 transition-colors duration-300 group-hover:text-amber-700">
            {fullName}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {attorney.firmName || "Independent Practice"} &middot;{" "}
            {attorney.barState || "N/A"} &middot;{" "}
            {attorney.yearsExperience ? `${attorney.yearsExperience}+ years` : "Years N/A"}
          </p>

          {/* Specialties + service areas */}
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {attorney.specialties.slice(0, 3).map((s) => (
              <span
                key={`spec-${s.category}`}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700"
              >
                {s.category}
              </span>
            ))}
            {attorney.serviceAreas.slice(0, 3).map((s) => (
              <span
                key={`area-${s.stateCode}`}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500"
              >
                {s.stateCode}
              </span>
            ))}
          </div>
        </div>

        {/* Right: trust score */}
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-slate-900">
            Trust {trust.totalScore}/100
          </p>
          <p className="text-xs text-slate-500">等级 {trust.grade}</p>
          <p className="mt-1 text-xs text-slate-500">
            评价{" "}
            {reviewAvg != null ? `${reviewAvg}/5` : "暂无"}
            （{reviewCount}）
          </p>
        </div>
      </div>

      {/* ── Hover-expanded panel ─────────────────────────────────────── */}
      {/* max-h-0 → group-hover:max-h-48 gives a smooth CSS reveal */}
      <div className="max-h-0 overflow-hidden transition-all duration-300 ease-out group-hover:max-h-48">
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          {/* Performance snapshot */}
          {snapshot && (
            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
              {snapshot.avgFirstMessageMinutes != null && (
                <span>
                  ⚡ 首次响应 ~{Math.round(snapshot.avgFirstMessageMinutes)} 分钟
                </span>
              )}
              {snapshot.completionRate != null && (
                <span>
                  ✅ 完成率 {Math.round((snapshot.completionRate ?? 0) * 100)}%
                </span>
              )}
              {snapshot.qualityScore != null && (
                <span>⭐ 质量分 {Math.round(snapshot.qualityScore)}/100</span>
              )}
            </div>
          )}

          {/* Recent review excerpt */}
          {recentReviewComment && (
            <p className="line-clamp-2 text-xs italic text-slate-600">
              &ldquo;{recentReviewComment}&rdquo;
            </p>
          )}

          {/* CTA */}
          <Link
            href={`/attorneys/${attorney.id}`}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-500"
          >
            查看完整资料 →
          </Link>
        </div>
      </div>
    </div>
  );
}
