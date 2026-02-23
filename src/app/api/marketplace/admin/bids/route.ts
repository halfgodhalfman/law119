import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

function bidAbnormalReasons(input: {
  status: string;
  caseStatus: string;
  feeQuoteMin: number | null;
  feeQuoteMax: number | null;
  caseBudgetMin: number | null;
  caseBudgetMax: number | null;
  version: number;
  versionCount: number;
}) {
  const reasons: string[] = [];
  if (
    input.caseBudgetMin != null &&
    input.caseBudgetMax != null &&
    input.caseBudgetMin > input.caseBudgetMax
  ) {
    reasons.push("case_budget_invalid");
  }
  if (
    input.feeQuoteMin != null &&
    input.feeQuoteMax != null &&
    input.feeQuoteMin > input.feeQuoteMax
  ) {
    reasons.push("bid_price_invalid");
  }
  if (
    input.caseBudgetMax != null &&
    ((input.feeQuoteMin != null && input.feeQuoteMin > input.caseBudgetMax * 2) ||
      (input.feeQuoteMax != null && input.feeQuoteMax > input.caseBudgetMax * 2))
  ) {
    reasons.push("far_above_budget");
  }
  if (input.status === "ACCEPTED" && input.caseStatus === "CANCELLED") reasons.push("accepted_on_cancelled_case");
  if (input.versionCount > 10 || input.version > 10) reasons.push("frequent_revisions");
  return reasons;
}

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "").trim();
    const caseId = (url.searchParams.get("caseId") ?? "").trim();
    const q = (url.searchParams.get("q") ?? "").trim();
    const abnormalOnly = url.searchParams.get("abnormalOnly") === "1";
    const abnormalType = (url.searchParams.get("abnormalType") ?? "").trim();
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);

    const where = {
      ...(status ? { status: status as "PENDING" | "WITHDRAWN" | "ACCEPTED" | "REJECTED" } : {}),
      ...(caseId ? { caseId } : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" as const } },
              { attorneyProfileId: { contains: q, mode: "insensitive" as const } },
              { message: { contains: q, mode: "insensitive" as const } },
              { case: { is: { title: { contains: q, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    };

    const [total, bids] = await Promise.all([
      prisma.bid.count({ where }),
      prisma.bid.findMany({
        where,
        select: {
          id: true,
          caseId: true,
          attorneyProfileId: true,
          status: true,
          version: true,
          feeQuoteMin: true,
          feeQuoteMax: true,
          feeMode: true,
          estimatedDays: true,
          includesConsultation: true,
          message: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { versions: true } },
          case: {
            select: {
              title: true,
              status: true,
              category: true,
              stateCode: true,
              budgetMin: true,
              budgetMax: true,
              selectedBidId: true,
            },
          },
          attorney: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              isVerified: true,
              user: { select: { email: true } },
            },
          },
          conversation: { select: { id: true, status: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = bids
      .map((b) => {
        const abnormalReasons = bidAbnormalReasons({
          status: b.status,
          caseStatus: b.case.status,
          feeQuoteMin: b.feeQuoteMin == null ? null : Number(b.feeQuoteMin),
          feeQuoteMax: b.feeQuoteMax == null ? null : Number(b.feeQuoteMax),
          caseBudgetMin: b.case.budgetMin == null ? null : Number(b.case.budgetMin),
          caseBudgetMax: b.case.budgetMax == null ? null : Number(b.case.budgetMax),
          version: b.version,
          versionCount: b._count.versions,
        });
        return {
          ...b,
          abnormalReasons,
          selected: b.case.selectedBidId === b.id,
          attorneyName: [b.attorney.firstName, b.attorney.lastName].filter(Boolean).join(" "),
        };
      })
      .filter((b) => (abnormalOnly ? b.abnormalReasons.length > 0 : true))
      .filter((b) => (abnormalType ? b.abnormalReasons.includes(abnormalType) : true));

    return NextResponse.json({
      ok: true,
      items,
      filters: { status, caseId, q, abnormalOnly, abnormalType, page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/bids failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

