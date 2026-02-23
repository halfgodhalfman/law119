import { AttorneyBadgeType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeAttorneyTier, computeAttorneyTrustSummary } from "@/lib/attorney-trust";

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export async function syncAttorneySystemBadges(attorneyId: string) {
  const attorney = await prisma.attorneyProfile.findUnique({
    where: { id: attorneyId },
    select: {
      id: true,
      isVerified: true,
      identityVerificationStatus: true,
      barNumberVerified: true,
      barVerificationStatus: true,
      barState: true,
      profileCompletenessScore: true,
      languages: { select: { language: true } },
      serviceAreas: { select: { stateCode: true } },
      clientReviews: {
        where: { status: "PUBLISHED" },
        select: { ratingOverall: true },
      },
      scoreSnapshots: {
        orderBy: { periodEnd: "desc" },
        take: 1,
        select: {
          qualityScore: true,
          complianceRiskScore: true,
          avgFirstBidMinutes: true,
          avgFirstMessageMinutes: true,
          bidConversionRate: true,
          disputeRate: true,
          bidsCount: true,
          acceptedBidsCount: true,
          conversationsCount: true,
        },
      },
      badges: {
        where: { source: "SYSTEM" },
        select: { id: true, badgeType: true, active: true },
      },
    },
  });
  if (!attorney) return;

  const latest = attorney.scoreSnapshots[0] ?? null;
  const reviewCount = attorney.clientReviews.length;
  const reviewAvg = reviewCount
    ? attorney.clientReviews.reduce((s, r) => s + r.ratingOverall, 0) / reviewCount
    : null;

  const trust = computeAttorneyTrustSummary({
    isVerified: attorney.isVerified,
    barVerified: attorney.barNumberVerified,
    barState: attorney.barState,
    serviceAreasCount: attorney.serviceAreas.length,
    profileCompletenessScore: attorney.profileCompletenessScore ?? 0,
    qualityScore: latest?.qualityScore ?? null,
    complianceRiskScore: latest?.complianceRiskScore ?? null,
    reviewAvg,
    reviewCount,
  });
  const tier = computeAttorneyTier({
    trustScore: trust.totalScore,
    barVerified: attorney.barNumberVerified,
    identityVerified: attorney.isVerified,
    reviewCount,
    reviewAvg,
    qualityScore: latest?.qualityScore ?? null,
    complianceRiskScore: latest?.complianceRiskScore ?? null,
  });

  const desired: AttorneyBadgeType[] = [];
  if (attorney.identityVerificationStatus === "VERIFIED" || attorney.isVerified) desired.push("VERIFIED_IDENTITY");
  if (attorney.barVerificationStatus === "VERIFIED" || attorney.barNumberVerified) desired.push("BAR_VERIFIED");
  if ((latest?.avgFirstMessageMinutes ?? 999999) <= 60 || (latest?.avgFirstBidMinutes ?? 999999) <= 180) {
    desired.push("FAST_RESPONDER");
  }
  if (tier.tier === "TOP_RATED" || tier.tier === "ELITE_COUNSEL") desired.push("TOP_RATED");
  if ((latest?.acceptedBidsCount ?? 0) >= 3 && (latest?.bidConversionRate ?? 0) >= 0.25) desired.push("HIGH_CONVERSION");
  if ((latest?.conversationsCount ?? 0) >= 5 && (latest?.disputeRate ?? 1) <= 0.05) desired.push("LOW_DISPUTE_RATE");
  if (unique(attorney.languages.map((l) => l.language).filter(Boolean)).length >= 2) desired.push("MULTILINGUAL");

  const desiredSet = new Set(desired);
  const existingMap = new Map(attorney.badges.map((b) => [b.badgeType, b] as const));

  const toActivate = desired.filter((badgeType) => !existingMap.get(badgeType)?.active);
  const toDeactivate = attorney.badges
    .filter((b) => b.active && !desiredSet.has(b.badgeType))
    .map((b) => b.badgeType);

  await prisma.$transaction(async (tx) => {
    for (const badgeType of toActivate) {
      const existing = attorney.badges.find((b) => b.badgeType === badgeType);
      if (existing) {
        await tx.attorneyBadgeGrant.update({
          where: { id: existing.id },
          data: {
            active: true,
            reviewedAt: new Date(),
            expiresAt: null,
            reason: "System badge sync reactivated",
          },
        });
      } else {
        await tx.attorneyBadgeGrant.create({
          data: {
            attorneyId,
            badgeType,
            source: "SYSTEM",
            active: true,
            reason: "System badge sync",
            reviewedAt: new Date(),
          },
        });
      }
    }
    if (toDeactivate.length) {
      await tx.attorneyBadgeGrant.updateMany({
        where: { attorneyId, source: "SYSTEM", badgeType: { in: toDeactivate }, active: true },
        data: { active: false, reviewedAt: new Date(), reason: "System badge sync review" },
      });
    }
  });

  return {
    desiredBadges: desired,
    tier: tier.tier,
    trustScore: trust.totalScore,
  };
}

