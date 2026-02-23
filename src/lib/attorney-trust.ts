export type AttorneyTrustInputs = {
  isVerified: boolean;
  barVerified: boolean;
  barState?: string | null;
  serviceAreasCount: number;
  profileCompletenessScore: number;
  qualityScore?: number | null;
  complianceRiskScore?: number | null;
  reviewAvg?: number | null; // 1-5
  reviewCount?: number;
};

export type AttorneyTrustSummary = {
  totalScore: number;
  grade: "A+" | "A" | "B" | "C";
  credentialsScore: number;
  qualitySignalScore: number;
  complianceScore: number;
  serviceScore: number;
};

export type AttorneyTier = "VERIFIED" | "TRUSTED" | "TOP_RATED" | "ELITE_COUNSEL";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function gradeFor(score: number): AttorneyTrustSummary["grade"] {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  return "C";
}

// Lightweight score for UI/ranking use (client-facing comparison / profile badges).
export function computeAttorneyTrustSummary(input: AttorneyTrustInputs): AttorneyTrustSummary {
  const credentialsScore = clamp(
    (input.isVerified ? 20 : 0) +
      (input.barVerified ? 25 : 0) +
      (input.barState ? 10 : 0) +
      (input.serviceAreasCount > 0 ? 10 : 0) +
      Math.round((clamp(input.profileCompletenessScore ?? 0, 0, 100) / 100) * 10),
    0,
    75,
  );

  const qualitySignalScore = clamp(Math.round((input.qualityScore ?? 0) * 0.15), 0, 15);
  const complianceScore = clamp(10 - Math.round((input.complianceRiskScore ?? 0) * 0.1), 0, 10);
  const serviceScore = input.reviewAvg != null ? clamp(Math.round((input.reviewAvg / 5) * 10), 0, 10) : 6;
  const total = clamp(credentialsScore + qualitySignalScore + complianceScore + serviceScore, 0, 100);

  return {
    totalScore: total,
    grade: gradeFor(total),
    credentialsScore,
    qualitySignalScore,
    complianceScore,
    serviceScore,
  };
}

export function computeAttorneyTier(params: {
  trustScore: number;
  barVerified: boolean;
  identityVerified: boolean;
  reviewCount?: number;
  reviewAvg?: number | null;
  qualityScore?: number | null;
  complianceRiskScore?: number | null;
}) {
  const reviewCount = params.reviewCount ?? 0;
  const reviewAvg = params.reviewAvg ?? null;
  const quality = params.qualityScore ?? 0;
  const risk = params.complianceRiskScore ?? 100;

  let tier: AttorneyTier = "VERIFIED";
  if (params.barVerified && params.identityVerified) tier = "TRUSTED";
  if (
    params.barVerified &&
    params.identityVerified &&
    params.trustScore >= 80 &&
    reviewCount >= 3 &&
    (reviewAvg ?? 0) >= 4.2 &&
    quality >= 65 &&
    risk <= 35
  ) {
    tier = "TOP_RATED";
  }
  if (
    params.barVerified &&
    params.identityVerified &&
    params.trustScore >= 90 &&
    reviewCount >= 8 &&
    (reviewAvg ?? 0) >= 4.5 &&
    quality >= 75 &&
    risk <= 20
  ) {
    tier = "ELITE_COUNSEL";
  }

  const labels: Record<AttorneyTier, string> = {
    VERIFIED: "Verified",
    TRUSTED: "Trusted",
    TOP_RATED: "Top Rated",
    ELITE_COUNSEL: "Elite Counsel",
  };

  const benefitsMap: Record<AttorneyTier, string[]> = {
    VERIFIED: ["基础展示资格", "参与案件匹配"],
    TRUSTED: ["信任徽章展示", "推荐排序基础加权"],
    TOP_RATED: ["高质量律师标识", "更高推荐优先级"],
    ELITE_COUNSEL: ["平台精选律师层级", "高级品牌展示位候选"],
  };

  return {
    tier,
    label: labels[tier],
    benefits: benefitsMap[tier],
  };
}
