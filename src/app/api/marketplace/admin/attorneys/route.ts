export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { buildAttorneyReviewChecklist, computeAttorneyProfileCompleteness, deriveAttorneyQueueState } from "@/lib/admin-attorney-review";

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const verified = (url.searchParams.get("verified") ?? "").trim(); // true/false
    const barVerified = (url.searchParams.get("barVerified") ?? "").trim(); // true/false
    const state = (url.searchParams.get("state") ?? "").trim().toUpperCase();
    const category = (url.searchParams.get("category") ?? "").trim();
    const reviewQueue = (url.searchParams.get("reviewQueue") ?? "").trim() === "1";
    const reviewStatus = (url.searchParams.get("reviewStatus") ?? "").trim();
    const sort = (url.searchParams.get("sort") ?? "review_priority").trim();
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);

    const where = {
      ...(verified === "true" ? { isVerified: true } : verified === "false" ? { isVerified: false } : {}),
      ...(barVerified === "true"
        ? { barNumberVerified: true }
        : barVerified === "false"
          ? { barNumberVerified: false }
          : {}),
      ...(state ? { OR: [{ barState: state }, { serviceAreas: { some: { stateCode: state } } }] } : {}),
      ...(category ? { specialties: { some: { category: category as never } } } : {}),
      ...(reviewStatus ? { reviewStatus: reviewStatus as never } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
              { firmName: { contains: q, mode: "insensitive" as const } },
              { barLicenseNumber: { contains: q, mode: "insensitive" as const } },
              { user: { is: { email: { contains: q, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    };

    const items = await prisma.attorneyProfile.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          firmName: true,
          barLicenseNumber: true,
          barNumberVerified: true,
          barVerifiedAt: true,
          barState: true,
          yearsExperience: true,
          isVerified: true,
          reviewStatus: true,
          reviewRequestedAt: true,
          lastReviewedAt: true,
          reviewDecisionTemplate: true,
          reviewDecisionReason: true,
          profileCompletenessScore: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, email: true, role: true } },
          serviceAreas: { select: { stateCode: true, zipCode: true } },
          specialties: { select: { category: true } },
          languages: { select: { language: true } },
          reviewLogs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, action: true, toStatus: true, templateKey: true, reason: true, createdAt: true },
          },
          _count: { select: { bids: true, conversations: true } },
        },
      });

    let mapped = items.map((a) => {
      const checklist = buildAttorneyReviewChecklist(a);
      const completeness = computeAttorneyProfileCompleteness({
        ...a,
        specialtiesCount: a.specialties.length,
        serviceAreasCount: a.serviceAreas.length,
        languagesCount: a.languages.length,
      });
      const queue = deriveAttorneyQueueState(a);
      return {
          ...a,
          fullName: [a.firstName, a.lastName].filter(Boolean).join(" "),
          reviewChecklist: checklist,
          reviewQueue: queue,
          completeness,
        };
    });

    if (reviewQueue) {
      mapped = mapped.filter((a) => a.reviewQueue.pendingReviewQueue);
    }

    mapped.sort((a, b) => {
      if (sort === "completeness_desc") return b.completeness - a.completeness;
      if (sort === "updated_desc") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      // review_priority default: queue first, rereview first, lower completeness first, then newest
      const aq = a.reviewQueue.pendingReviewQueue ? 1 : 0;
      const bq = b.reviewQueue.pendingReviewQueue ? 1 : 0;
      if (bq !== aq) return bq - aq;
      const ar = a.reviewQueue.needsReReview ? 1 : 0;
      const br = b.reviewQueue.needsReReview ? 1 : 0;
      if (br !== ar) return br - ar;
      if (a.completeness !== b.completeness) return a.completeness - b.completeness;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const total = mapped.length;
    const paged = mapped.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      ok: true,
      items: paged,
      filters: { q, verified, barVerified, state, category, reviewQueue, reviewStatus, sort, page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/attorneys failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
