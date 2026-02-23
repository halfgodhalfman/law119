import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuthContext } from "../../../../../../lib/auth-context";

type RouteParams = {
  params: Promise<{ bidId: string }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ATTORNEY" || !auth.attorneyProfileId) {
      return NextResponse.json({ error: "Only attorneys can withdraw bids." }, { status: 403 });
    }

    const { bidId } = await Promise.resolve(params);

    const result = await prisma.$transaction(async (tx) => {
      const bid = await tx.bid.findUnique({
        where: { id: bidId },
        select: {
          id: true,
          caseId: true,
          attorneyProfileId: true,
          status: true,
          version: true,
          message: true,
          feeQuoteMin: true,
          feeQuoteMax: true,
          feeMode: true,
          serviceScope: true,
          estimatedDays: true,
          includesConsultation: true,
        },
      });

      if (!bid) throw new Error("BID_NOT_FOUND");
      if (bid.attorneyProfileId !== auth.attorneyProfileId) throw new Error("FORBIDDEN_BID_OWNER");
      if (bid.status === "WITHDRAWN") throw new Error("ALREADY_WITHDRAWN");
      if (bid.status === "ACCEPTED") throw new Error("BID_ACCEPTED");

      const legalCase = await tx.case.findUnique({
        where: { id: bid.caseId },
        select: { id: true, selectedBidId: true, status: true },
      });
      if (!legalCase) throw new Error("CASE_NOT_FOUND");
      if (legalCase.selectedBidId === bid.id) throw new Error("BID_SELECTED");

      const updated = await tx.bid.update({
        where: { id: bid.id },
        data: {
          status: "WITHDRAWN",
          version: { increment: 1 },
        },
        select: {
          id: true,
          caseId: true,
          status: true,
          version: true,
          message: true,
          feeQuoteMin: true,
          feeQuoteMax: true,
          feeMode: true,
          serviceScope: true,
          estimatedDays: true,
          includesConsultation: true,
          updatedAt: true,
        },
      });

      await tx.bidVersion.create({
        data: {
          bidId: updated.id,
          version: updated.version,
          message: updated.message,
          feeQuoteMin: updated.feeQuoteMin,
          feeQuoteMax: updated.feeQuoteMax,
          feeMode: updated.feeMode,
          serviceScope: updated.serviceScope,
          estimatedDays: updated.estimatedDays,
          includesConsultation: updated.includesConsultation,
          status: updated.status,
        },
      });

      await tx.caseStatusLog.create({
        data: {
          caseId: updated.caseId,
          fromStatus: legalCase.status,
          toStatus: legalCase.status,
          operatorId: auth.authUserId,
          reason: `Attorney withdrew bid ${updated.id}`,
        },
      });

      return updated;
    });

    return NextResponse.json({ ok: true, bid: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "BID_NOT_FOUND") return NextResponse.json({ error: "Bid not found." }, { status: 404 });
    if (message === "CASE_NOT_FOUND") return NextResponse.json({ error: "Case not found." }, { status: 404 });
    if (message === "FORBIDDEN_BID_OWNER") return NextResponse.json({ error: "You do not own this bid." }, { status: 403 });
    if (message === "ALREADY_WITHDRAWN") return NextResponse.json({ error: "Bid already withdrawn." }, { status: 409 });
    if (message === "BID_ACCEPTED" || message === "BID_SELECTED") {
      return NextResponse.json({ error: "Accepted/selected bid cannot be withdrawn." }, { status: 409 });
    }

    console.error("POST /api/marketplace/bids/[bidId]/withdraw failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

