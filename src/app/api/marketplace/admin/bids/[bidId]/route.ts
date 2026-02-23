import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ bidId: string }> }) {
  try {
    await requireAdminAuth();
    const { bidId } = await params;
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      select: {
        id: true,
        caseId: true,
        attorneyProfileId: true,
        status: true,
        version: true,
        contactedAt: true,
        feeQuoteMin: true,
        feeQuoteMax: true,
        feeMode: true,
        serviceScope: true,
        estimatedDays: true,
        includesConsultation: true,
        message: true,
        createdAt: true,
        updatedAt: true,
        case: {
          select: {
            id: true,
            title: true,
            status: true,
            category: true,
            stateCode: true,
            city: true,
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
            barNumberVerified: true,
            barState: true,
            user: { select: { id: true, email: true } },
          },
        },
        conversation: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { messages: true } },
          },
        },
        versions: {
          orderBy: { createdAt: "desc" },
          take: 30,
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
      },
    });
    if (!bid) return NextResponse.json({ error: "Bid not found." }, { status: 404 });
    return NextResponse.json({ ok: true, bid });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/bids/[bidId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

