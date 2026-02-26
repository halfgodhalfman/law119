export const dynamic = "force-dynamic";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { summarizeCaseDescription } from "../../../../../lib/case-redaction";
import { requireAuthContext } from "../../../../../lib/auth-context";
import { zip3ProximityScore } from "../../../../../lib/matching/geo";

const OPEN_CASE_STATUSES = ["OPEN", "MATCHING"] as const;

function hashStringToPercent(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    const attorneyProfileId = auth?.role === "ATTORNEY" ? auth.attorneyProfileId : null;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const stateCode = searchParams.get("stateCode")?.toUpperCase();
    const zipPrefix = searchParams.get("zipPrefix");
    const urgency = searchParams.get("urgency");
    const feeMode = searchParams.get("feeMode");
    const budgetMin = Number(searchParams.get("budgetMin") ?? "");
    const budgetMax = Number(searchParams.get("budgetMax") ?? "");
    const mineBidOnly = searchParams.get("mineBidOnly") === "1";
    const deadlineWindow = searchParams.get("deadlineWindow"); // 24h / 7d / overdue
    const recommendationReasonsRaw = searchParams.get("recommendationReasons")?.trim();
    const recommendationReasons =
      recommendationReasonsRaw
        ? recommendationReasonsRaw
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : [];
    const quoteableOnly = searchParams.get("quoteableOnly") === "1";
    const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? "12") || 12, 1), 50);
    const sort =
      searchParams.get("sort") === "quotes_desc" ||
      searchParams.get("sort") === "deadline_asc" ||
      searchParams.get("sort") === "recommended" ||
      searchParams.get("sort") === "budget_desc" ||
      searchParams.get("sort") === "low_competition"
        ? (searchParams.get("sort") as "quotes_desc" | "deadline_asc" | "recommended" | "budget_desc" | "low_competition")
        : "latest";

    const attorneySignals = attorneyProfileId
      ? await prisma.attorneyProfile.findUnique({
          where: { id: attorneyProfileId },
          select: {
            specialties: { select: { category: true } },
            serviceAreas: { select: { stateCode: true, zipCode: true } },
          },
        })
      : null;
    const specialtySet = new Set(attorneySignals?.specialties.map((s) => s.category) ?? []);
    const serviceStateSet = new Set(attorneySignals?.serviceAreas.map((s) => s.stateCode) ?? []);
    const attorneyZip = attorneySignals?.serviceAreas.find((s) => s.zipCode)?.zipCode ?? null;
    const recommendationConfig = await prisma.recommendationConfig.findUnique({ where: { key: "case_hall" } });

    const variant =
      recommendationConfig?.abEnabled && attorneyProfileId
        ? hashStringToPercent(attorneyProfileId) < (recommendationConfig.abRolloutPercent ?? 50)
          ? "B"
          : "A"
        : (recommendationConfig?.activeVariant === "B" ? "B" : "A");
    const useConfig = recommendationConfig?.enabled !== false && !!recommendationConfig;
    const wl = new Set(asStringArray(recommendationConfig?.categoryWhitelist));
    const bl = new Set(asStringArray(recommendationConfig?.categoryBlacklist));

    const attorneyExposureLoad = attorneyProfileId
      ? (
          (await prisma.conversation.count({
            where: { attorneyProfileId, status: "OPEN" },
          })) +
          (await prisma.engagementConfirmation.count({
            where: { attorneyProfileId, status: { in: ["DRAFT", "PENDING_CLIENT", "PENDING_ATTORNEY", "ACTIVE"] } },
          }))
        )
      : 0;

    const andFilters: Prisma.CaseWhereInput[] = [];
    if (Number.isFinite(budgetMin)) {
      andFilters.push({
        OR: [{ budgetMax: { gte: budgetMin } }, { budgetMin: { gte: budgetMin } }],
      });
    }
    if (Number.isFinite(budgetMax)) {
      andFilters.push({
        OR: [{ budgetMin: null }, { budgetMin: { lte: budgetMax } }],
      });
    }
    const where: Prisma.CaseWhereInput = {
      status: { in: [...OPEN_CASE_STATUSES] },
      ...(category ? { category: category as never } : {}),
      ...(stateCode ? { stateCode } : {}),
      ...(zipPrefix ? { zipCode: { startsWith: zipPrefix } } : {}),
      ...(urgency ? { urgency: urgency as never } : {}),
      ...(feeMode ? { feeMode: feeMode as never } : {}),
      ...(quoteableOnly
        ? {
            OR: [{ quoteDeadline: null }, { quoteDeadline: { gt: new Date() } }],
          }
        : {}),
      ...(deadlineWindow === "overdue"
        ? { quoteDeadline: { lte: new Date() } }
        : deadlineWindow === "24h"
          ? {
              quoteDeadline: { gt: new Date(), lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
            }
          : deadlineWindow === "7d"
            ? {
                quoteDeadline: { gt: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
              }
            : {}),
      ...(andFilters.length ? { AND: andFilters } : {}),
    };
    const total = await prisma.case.count({ where });

    const cases = await prisma.case.findMany({
      where,
      orderBy:
        sort === "deadline_asc"
          ? [{ quoteDeadline: "asc" }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { bids: true },
        },
        ...(attorneyProfileId
          ? {
              bids: {
                where: { attorneyProfileId },
                select: { id: true },
                take: 1,
              },
            }
          : {}),
      },
    });
    const sortedCases =
      sort === "quotes_desc"
        ? [...cases].sort((a, b) => b._count.bids - a._count.bids || b.createdAt.getTime() - a.createdAt.getTime())
        : sort === "budget_desc"
          ? [...cases].sort(
              (a, b) =>
                (Number(b.budgetMax ?? b.budgetMin ?? 0) - Number(a.budgetMax ?? a.budgetMin ?? 0)) ||
                b.createdAt.getTime() - a.createdAt.getTime(),
            )
          : sort === "low_competition"
            ? [...cases].sort((a, b) => a._count.bids - b._count.bids || b.createdAt.getTime() - a.createdAt.getTime())
        : sort === "recommended"
          ? [...cases].sort((a, b) => {
              function score(item: (typeof cases)[number]) {
                const now = Date.now();
                const hasMyBid = attorneyProfileId ? item.bids.length > 0 : false;
                const deadlineTs = item.quoteDeadline ? item.quoteDeadline.getTime() : null;
                const quoteable = !deadlineTs || deadlineTs > now;
                const soon = !!deadlineTs && deadlineTs > now && deadlineTs - now <= 24 * 60 * 60 * 1000;
                const urgencyScore = item.urgency === "URGENT"
                  ? (useConfig ? (variant === "B" ? recommendationConfig!.weightUrgentB : recommendationConfig!.weightUrgentA) : 80)
                  : item.urgency === "HIGH"
                    ? (useConfig ? (variant === "B" ? recommendationConfig!.weightHighB : recommendationConfig!.weightHighA) : 50)
                    : item.urgency === "MEDIUM"
                      ? 20
                      : 0;
                const specialtyMatch = specialtySet.has(item.category);
                const stateMatch = serviceStateSet.has(item.stateCode);
                const ageHours = Math.max((now - item.createdAt.getTime()) / 36e5, 0);
                const recencyMax = useConfig
                  ? (variant === "B" ? recommendationConfig!.weightRecencyMaxBoostB : recommendationConfig!.weightRecencyMaxBoostA)
                  : 30;
                const recencyBoost = Math.max(recencyMax - ageHours, 0);
                const bidCrowdingPenaltyPer = useConfig
                  ? (variant === "B" ? recommendationConfig!.weightBidCrowdingPenaltyB : recommendationConfig!.weightBidCrowdingPenaltyA)
                  : 8;
                const bidCrowdingPenaltyCap = useConfig
                  ? (variant === "B" ? recommendationConfig!.bidCrowdingPenaltyCapB : recommendationConfig!.bidCrowdingPenaltyCapA)
                  : 48;
                const categoryWeight = useConfig
                  ? (variant === "B" ? recommendationConfig!.weightCategoryMatchB : recommendationConfig!.weightCategoryMatchA)
                  : 60;
                const stateWeight = useConfig
                  ? (variant === "B" ? recommendationConfig!.weightStateMatchB : recommendationConfig!.weightStateMatchA)
                  : 40;
                const unquotedWeight = useConfig
                  ? (variant === "B" ? recommendationConfig!.weightUnquotedB : recommendationConfig!.weightUnquotedA)
                  : 140;
                const quoteableWeight = useConfig
                  ? (variant === "B" ? recommendationConfig!.weightQuoteableB : recommendationConfig!.weightQuoteableA)
                  : 100;
                const soonWeight = useConfig
                  ? (variant === "B" ? recommendationConfig!.weightSoonDeadlineB : recommendationConfig!.weightSoonDeadlineA)
                  : 70;

                const proximityScore =
                  item.zipCode && attorneyZip
                    ? zip3ProximityScore(item.zipCode, attorneyZip)
                    : 0;

                let scoreValue =
                  (hasMyBid ? -120 : unquotedWeight) +
                  (quoteable ? quoteableWeight : -200) +
                  (soon ? soonWeight : 0) +
                  urgencyScore +
                  (specialtyMatch ? categoryWeight : 0) +
                  (stateMatch ? stateWeight : 0) +
                  recencyBoost +
                  proximityScore -
                  Math.min(item._count.bids * bidCrowdingPenaltyPer, bidCrowdingPenaltyCap);

                if (useConfig) {
                  if (wl.size > 0) {
                    scoreValue += wl.has(item.category) ? recommendationConfig!.whitelistBoost : -recommendationConfig!.nonWhitelistPenalty;
                  }
                  if (bl.has(item.category)) {
                    scoreValue -= recommendationConfig!.blacklistPenalty;
                  }
                  const over = Math.max(attorneyExposureLoad - recommendationConfig!.attorneyExposureSoftCap, 0);
                  scoreValue -= over * recommendationConfig!.attorneyExposurePenaltyPerExtra;
                }

                return scoreValue;
              }
              return score(b) - score(a) || b.createdAt.getTime() - a.createdAt.getTime();
            })
          : cases;

    const caseIds = sortedCases.map((c) => c.id);
    const [ruleEvents, disputeCounts, reportRows] = caseIds.length
      ? await Promise.all([
          prisma.contentRuleEvent.groupBy({
            by: ["caseId"],
            where: { caseId: { in: caseIds } },
            _count: { _all: true },
          }),
          prisma.disputeTicket.groupBy({
            by: ["caseId"],
            where: { caseId: { in: caseIds } },
            _count: { _all: true },
          }),
          prisma.conversationReport.findMany({
            where: { conversation: { caseId: { in: caseIds } } },
            select: { conversation: { select: { caseId: true } } },
          }),
        ])
      : [[], [], []];
    const ruleHitsByCase = new Map(ruleEvents.filter((r) => r.caseId).map((r) => [r.caseId!, r._count._all]));
    const disputesByCase = new Map(disputeCounts.filter((r) => r.caseId).map((r) => [r.caseId!, r._count._all]));
    const reportsByCase = new Map<string, number>();
    for (const r of reportRows) {
      const cid = r.conversation.caseId;
      reportsByCase.set(cid, (reportsByCase.get(cid) ?? 0) + 1);
    }

    let items = sortedCases.map((item) => {
      const now = Date.now();
      const hasMyBid = attorneyProfileId ? item.bids.length > 0 : false;
      const deadlineTs = item.quoteDeadline ? item.quoteDeadline.getTime() : null;
      const quoteable = !deadlineTs || deadlineTs > now;
      const soon = !!deadlineTs && deadlineTs > now && deadlineTs - now <= 24 * 60 * 60 * 1000;
      const ruleHits = ruleHitsByCase.get(item.id) ?? 0;
      const reportCount = reportsByCase.get(item.id) ?? 0;
      const disputeCount = disputesByCase.get(item.id) ?? 0;
      const highRisk =
        !!recommendationConfig &&
        useConfig &&
        ((ruleHits >= recommendationConfig.highRiskRuleHitThreshold && recommendationConfig.highRiskRuleHitThreshold > 0) ||
          (reportCount >= recommendationConfig.highRiskReportThreshold && recommendationConfig.highRiskReportThreshold > 0) ||
          (disputeCount >= recommendationConfig.highRiskDisputeThreshold && recommendationConfig.highRiskDisputeThreshold > 0));
      const reasons: string[] = [];
      if (attorneyProfileId) {
        if (!hasMyBid) reasons.push("未报价");
        if (quoteable) reasons.push("可报价");
        if (soon) reasons.push("24h内截止");
        if (specialtySet.has(item.category)) reasons.push("类目匹配");
        if (serviceStateSet.has(item.stateCode)) reasons.push("服务州匹配");
        if (wl.size > 0 && wl.has(item.category)) reasons.push("白名单类目");
        if (bl.has(item.category)) reasons.push("黑名单类目(降权)");
        if (item.zipCode && attorneyZip && zip3ProximityScore(item.zipCode, attorneyZip) > 0)
          reasons.push("距离优先");
      }
      if (item.urgency === "URGENT" || item.urgency === "HIGH") reasons.push(`紧急度${item.urgency}`);
      if (highRisk) reasons.push("高风险降权");

      return {
        id: item.id,
        title: item.title,
        category: item.category,
        stateCode: item.stateCode,
        city: item.city,
        zipCodeMasked: `${item.zipCode.slice(0, 3)}**`,
        urgency: item.urgency,
        status: item.status,
        feeMode: item.feeMode,
        budgetMin: item.budgetMin,
        budgetMax: item.budgetMax,
        quoteDeadline: item.quoteDeadline,
        quoteCount: item._count.bids,
        hasMyBid,
        riskSignals: { ruleHits, reportCount, disputeCount, highRisk },
        recommendationReasons: reasons.slice(0, 4),
        riskHints: [
          ...(ruleHits > 0 ? ["敏感词命中"] : []),
          ...(reportCount > 0 ? ["高争议风险"] : []),
          ...((!item.descriptionMasked || item.descriptionMasked.trim().length < 20) ? ["资料不足"] : []),
        ].slice(0, 3),
        descriptionMasked:
          item.descriptionMasked ??
          summarizeCaseDescription(item.description, 220),
        createdAt: item.createdAt,
      };
    });

    if (mineBidOnly && attorneyProfileId) {
      items = items.filter((i) => i.hasMyBid);
    }

    if (sort === "recommended" && useConfig && recommendationConfig.maxPerCategoryInTopN > 0) {
      const windowSize = Math.max(recommendationConfig.categoryExposureWindow, 1);
      const perCatCap = recommendationConfig.maxPerCategoryInTopN;
      const withinWindowCounts = new Map<string, number>();
      const adjusted: typeof items = [];
      const overflow: typeof items = [];
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (i >= windowSize) {
          adjusted.push(item);
          continue;
        }
        const cnt = withinWindowCounts.get(item.category) ?? 0;
        if (cnt >= perCatCap) {
          overflow.push({ ...item, recommendationReasons: [...(item.recommendationReasons ?? []), "类目曝光上限"] });
          continue;
        }
        withinWindowCounts.set(item.category, cnt + 1);
        adjusted.push(item);
      }
      items = [...adjusted, ...overflow];
    }
    if (recommendationReasons.length > 0 && sort === "recommended") {
      items = items.filter((item) =>
        recommendationReasons.every((reason) => (item.recommendationReasons ?? []).includes(reason)),
      );
    }

    if (sort === "recommended" && useConfig && recommendationConfig.highRiskPenalty > 0) {
      items = [...items].sort((a, b) => {
        const ah = a.riskSignals?.highRisk ? 1 : 0;
        const bh = b.riskSignals?.highRisk ? 1 : 0;
        return ah - bh || 0;
      });
    }

    return NextResponse.json({
      ok: true,
      items,
      count: items.length,
      filters: {
        category: category ?? "",
        stateCode: stateCode ?? "",
        urgency: urgency ?? "",
        recommendationReasons,
        quoteableOnly,
        feeMode: feeMode ?? "",
        budgetMin: Number.isFinite(budgetMin) ? budgetMin : null,
        budgetMax: Number.isFinite(budgetMax) ? budgetMax : null,
        mineBidOnly,
        deadlineWindow: deadlineWindow ?? "",
        sort,
        rankingExperiment: sort === "recommended" ? { configEnabled: useConfig, variant, abEnabled: recommendationConfig?.abEnabled ?? false } : null,
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    });
  } catch (error) {
    console.error("GET /api/marketplace/cases/hall failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
