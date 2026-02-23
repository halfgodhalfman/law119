import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { summarizeCaseDescription } from "../../../../../lib/case-redaction";
import { requireAuthContext } from "../../../../../lib/auth-context";
import { computeAttorneyTrustSummary } from "../../../../../lib/attorney-trust";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

type CaseWithBids = Prisma.CaseGetPayload<{
  include: {
    bids: {
      select: {
        id: true;
        attorneyProfileId: true;
        message: true;
        feeQuoteMin: true;
        feeQuoteMax: true;
        feeMode: true;
        serviceScope: true;
        estimatedDays: true;
        includesConsultation: true;
        version: true;
        versions: {
          orderBy: { version: "desc" };
          take: 10;
          select: {
            id: true;
            version: true;
            message: true;
            feeQuoteMin: true;
            feeQuoteMax: true;
            feeMode: true;
            serviceScope: true;
            estimatedDays: true;
            includesConsultation: true;
            status: true;
            createdAt: true;
          };
        };
        status: true;
        updatedAt: true;
        createdAt: true;
        attorney: {
          select: {
            isVerified: true;
            barNumberVerified: true;
            barState: true;
            profileCompletenessScore: true;
            serviceAreas: { select: { id: true } };
            scoreSnapshots: {
              orderBy: { periodEnd: "desc" };
              take: 1;
              select: {
                qualityScore: true;
                complianceRiskScore: true;
              };
            };
            clientReviews: {
              where: { status: "PUBLISHED" };
              orderBy: { createdAt: "desc" };
              take: 20;
              select: { ratingOverall: true };
            };
          };
        };
      };
    };
    engagementConfirmations: {
      select: {
        id: true;
        bidId: true;
        attorneyProfileId: true;
        conversationId: true;
        status: true;
        updatedAt: true;
      };
      orderBy: { updatedAt: "desc" };
      take: 5;
    };
    _count: { select: { bids: true } };
  };
}>;

type MarketplaceCaseViewerDTO = {
  authenticated: boolean;
  role: "ANONYMOUS" | UserRole;
  isOwnerClient: boolean;
  canBid: boolean;
  canSelectBid: boolean;
  canSeeFullDescription: boolean;
  canSeeAllBids: boolean;
};

type MarketplaceBidDTO = {
  id: string;
  attorneyProfileId: string;
  proposalText: string;
  priceMin: Prisma.Decimal | null;
  priceMax: Prisma.Decimal | null;
  feeMode: string | null;
  serviceScope: string | null;
  estimatedDays: number | null;
  includesConsultation: boolean;
  version: number;
    versionHistory: Array<{
      id: string;
      version: number;
      proposalText: string;
      priceMin: Prisma.Decimal | null;
      priceMax: Prisma.Decimal | null;
      feeMode: string;
      serviceScope: string | null;
      estimatedDays: number | null;
    includesConsultation: boolean;
    status: string;
    createdAt: Date;
  }>;
  status: string;
  updatedAt: Date;
  createdAt: Date;
  attorneyTrust?: {
    totalScore: number;
    grade: "A+" | "A" | "B" | "C";
    credentialsScore: number;
    qualitySignalScore: number;
    complianceScore: number;
    serviceScore: number;
    reviewAvg: number | null;
    reviewCount: number;
  } | null;
};

type MarketplaceCaseDetailDTO = {
  id: string;
  title: string;
  category: string;
  stateCode: string;
  city: string | null;
  zipCodeMasked: string;
  zipCode?: string;
  urgency: string;
  status: string;
  preferredLanguage: string;
  descriptionMasked: string;
  description?: string;
  feeMode: string | null;
  budgetMin: Prisma.Decimal | null;
  budgetMax: Prisma.Decimal | null;
  quoteDeadline: Date | null;
  selectedBidId: string | null;
  createdAt: Date;
  updatedAt: Date;
  quoteCount: number;
  engagementSummary?: {
    id: string;
    status: string;
    bidId: string;
    conversationId: string | null;
    isMyEngagement: boolean;
    updatedAt: Date;
  } | null;
  bids: MarketplaceBidDTO[];
  viewer: MarketplaceCaseViewerDTO;
};

function toBidDTO(bid: CaseWithBids["bids"][number]): MarketplaceBidDTO {
  const reviewCount = bid.attorney?.clientReviews.length ?? 0;
  const reviewAvg =
    reviewCount > 0
      ? bid.attorney!.clientReviews.reduce((sum, r) => sum + r.ratingOverall, 0) / reviewCount
      : null;
  const latestSnapshot = bid.attorney?.scoreSnapshots[0] ?? null;
  const trustSummary = bid.attorney
    ? computeAttorneyTrustSummary({
        isVerified: bid.attorney.isVerified,
        barVerified: bid.attorney.barNumberVerified,
        barState: bid.attorney.barState,
        serviceAreasCount: bid.attorney.serviceAreas.length,
        profileCompletenessScore: bid.attorney.profileCompletenessScore,
        qualityScore: latestSnapshot?.qualityScore ?? null,
        complianceRiskScore: latestSnapshot?.complianceRiskScore ?? null,
        reviewAvg,
        reviewCount,
      })
    : null;
  return {
    id: bid.id,
    attorneyProfileId: bid.attorneyProfileId,
    proposalText: bid.message ?? "",
    priceMin: bid.feeQuoteMin,
    priceMax: bid.feeQuoteMax,
    feeMode: bid.feeMode,
    serviceScope: bid.serviceScope,
    estimatedDays: bid.estimatedDays,
    includesConsultation: bid.includesConsultation,
    version: bid.version,
    versionHistory: bid.versions.map((v) => ({
      id: v.id,
      version: v.version,
      proposalText: v.message ?? "",
      priceMin: v.feeQuoteMin,
      priceMax: v.feeQuoteMax,
      feeMode: v.feeMode,
      serviceScope: v.serviceScope,
      estimatedDays: v.estimatedDays,
      includesConsultation: v.includesConsultation,
      status: v.status,
      createdAt: v.createdAt,
    })),
    status: bid.status,
    updatedAt: bid.updatedAt,
    createdAt: bid.createdAt,
    attorneyTrust: trustSummary
      ? {
          ...trustSummary,
          reviewAvg: reviewAvg != null ? Number(reviewAvg.toFixed(2)) : null,
          reviewCount,
        }
      : null,
  };
}

function toCaseDetailDTO(
  item: CaseWithBids,
  viewer: MarketplaceCaseViewerDTO,
  ownAttorneyBid: CaseWithBids["bids"][number] | null,
): MarketplaceCaseDetailDTO {
  const visibleBids = viewer.canSeeAllBids ? item.bids : ownAttorneyBid ? [ownAttorneyBid] : [];
  const engagement =
    item.engagementConfirmations.find((e) => e.bidId === item.selectedBidId) ??
    item.engagementConfirmations[0] ??
    null;
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    stateCode: item.stateCode,
    city: item.city,
    zipCodeMasked: `${item.zipCode.slice(0, 3)}**`,
    zipCode: viewer.canSelectBid || viewer.role === "ADMIN" ? item.zipCode : undefined,
    urgency: item.urgency,
    status: item.status,
    preferredLanguage: item.preferredLanguage,
    descriptionMasked: item.descriptionMasked ?? summarizeCaseDescription(item.description, 320),
    description: viewer.canSeeFullDescription ? item.description : undefined,
    feeMode: item.feeMode,
    budgetMin: item.budgetMin,
    budgetMax: item.budgetMax,
    quoteDeadline: item.quoteDeadline,
    selectedBidId: item.selectedBidId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    quoteCount: item._count.bids,
    engagementSummary: engagement
      ? {
          id: engagement.id,
          status: engagement.status,
          bidId: engagement.bidId,
          conversationId: engagement.conversationId,
          isMyEngagement: Boolean(ownAttorneyBid && engagement.bidId === ownAttorneyBid.id),
          updatedAt: engagement.updatedAt,
        }
      : null,
    bids: visibleBids.map(toBidDTO),
    viewer,
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await Promise.resolve(params);
    const auth = await requireAuthContext().catch(() => null);

    const item = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        bids: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            attorneyProfileId: true,
            message: true,
            feeQuoteMin: true,
            feeQuoteMax: true,
            feeMode: true,
            serviceScope: true,
            estimatedDays: true,
            includesConsultation: true,
            version: true,
            versions: {
              orderBy: { version: "desc" },
              take: 10,
              select: {
                id: true,
                version: true,
                message: true,
                feeQuoteMin: true,
                feeQuoteMax: true,
                feeMode: true,
                serviceScope: true,
                estimatedDays: true,
                includesConsultation: true,
                status: true,
                createdAt: true,
              },
            },
            status: true,
            updatedAt: true,
            createdAt: true,
            attorney: {
              select: {
                isVerified: true,
                barNumberVerified: true,
                barState: true,
                profileCompletenessScore: true,
                serviceAreas: { select: { id: true } },
                scoreSnapshots: {
                  orderBy: { periodEnd: "desc" },
                  take: 1,
                  select: { qualityScore: true, complianceRiskScore: true },
                },
                clientReviews: {
                  where: { status: "PUBLISHED" },
                  orderBy: { createdAt: "desc" },
                  take: 20,
                  select: { ratingOverall: true },
                },
              },
            },
          },
        },
        _count: {
          select: { bids: true },
        },
        engagementConfirmations: {
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            bidId: true,
            attorneyProfileId: true,
            conversationId: true,
            status: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    const isAdmin = auth?.role === "ADMIN";
    const isOwnerClient = Boolean(auth?.clientProfileId && item.clientProfileId === auth.clientProfileId);
    const ownAttorneyBid = auth?.attorneyProfileId
      ? item.bids.find((b) => b.attorneyProfileId === auth.attorneyProfileId)
      : null;
    const isAttorneyViewer = auth?.role === "ATTORNEY";
    const canSeeFullDescription = isAdmin || isOwnerClient || isAttorneyViewer;
    const canSeeAllBids = isAdmin || isOwnerClient;
    const canBid = Boolean(isAttorneyViewer && item.status !== "CLOSED" && item.status !== "CANCELLED");
    const canSelectBid = Boolean(isAdmin || isOwnerClient);
    const viewer: MarketplaceCaseViewerDTO = {
      authenticated: Boolean(auth),
      role: auth?.role ?? "ANONYMOUS",
      isOwnerClient,
      canBid,
      canSelectBid,
      canSeeFullDescription,
      canSeeAllBids,
    };
    const response = toCaseDetailDTO(item, viewer, ownAttorneyBid ?? null);

    return NextResponse.json({ ok: true, case: response });
  } catch (error) {
    console.error("GET /api/marketplace/cases/[caseId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
