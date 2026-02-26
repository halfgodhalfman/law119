import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ engagementId: string }> };

/**
 * GET /api/marketplace/engagements/[engagementId]/milestones
 *
 * Returns full milestone tracker data for an engagement:
 * - Engagement summary (status, service scope, fee info)
 * - Attorney + case info
 * - All PaymentOrders with milestones and events
 *
 * Auth: user must be the clientProfileId or attorneyProfileId of this engagement.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { engagementId } = await params;

    const engagement = await prisma.engagementConfirmation.findUnique({
      where: { id: engagementId },
      select: {
        id: true,
        status: true,
        serviceBoundary: true,
        serviceScopeSummary: true,
        stagePlan: true,
        feeMode: true,
        feeAmountMin: true,
        feeAmountMax: true,
        includesConsultation: true,
        includesCourtAppearance: true,
        includesTranslation: true,
        includesDocumentFiling: true,
        attorneyConflictChecked: true,
        attorneyConfirmedAt: true,
        clientConfirmedAt: true,
        createdAt: true,
        updatedAt: true,
        clientProfileId: true,
        attorneyProfileId: true,

        case: {
          select: {
            id: true,
            title: true,
            category: true,
            stateCode: true,
            status: true,
          },
        },
        attorney: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firmName: true,
            barState: true,
            isVerified: true,
          },
        },
        paymentOrders: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            status: true,
            feeMode: true,
            amountTotal: true,
            amountHeld: true,
            amountReleased: true,
            amountRefunded: true,
            createdAt: true,
            updatedAt: true,
            milestones: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                sortOrder: true,
                title: true,
                deliverable: true,
                amount: true,
                targetDate: true,
                status: true,
                releaseRequestedAt: true,
                releaseReviewStatus: true,
                releasedAt: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            events: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                type: true,
                amount: true,
                note: true,
                createdAt: true,
                milestoneId: true,
              },
            },
          },
        },
      },
    });

    if (!engagement) {
      return NextResponse.json({ error: "Engagement not found." }, { status: 404 });
    }

    // Access control: must be the client, attorney, or admin
    const isClient =
      auth.role === "CLIENT" &&
      auth.clientProfileId &&
      engagement.clientProfileId === auth.clientProfileId;
    const isAttorney =
      auth.role === "ATTORNEY" &&
      auth.attorneyProfileId &&
      engagement.attorneyProfileId === auth.attorneyProfileId;
    const isAdmin = auth.role === "ADMIN";

    if (!isClient && !isAttorney && !isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Compute summary totals across all payment orders
    const totalOrdered = engagement.paymentOrders.reduce(
      (sum, o) => sum + Number(o.amountTotal ?? 0),
      0,
    );
    const totalReleased = engagement.paymentOrders.reduce(
      (sum, o) => sum + Number(o.amountReleased ?? 0),
      0,
    );
    const totalMilestones = engagement.paymentOrders.reduce(
      (sum, o) => sum + o.milestones.length,
      0,
    );
    const completedMilestones = engagement.paymentOrders.reduce(
      (sum, o) => sum + o.milestones.filter((m) => m.status === "RELEASED").length,
      0,
    );

    return NextResponse.json({
      ok: true,
      viewer: {
        role: auth.role,
        isClient: Boolean(isClient),
        isAttorney: Boolean(isAttorney),
        isAdmin: Boolean(isAdmin),
      },
      engagement: {
        ...engagement,
        feeAmountMin: engagement.feeAmountMin?.toString() ?? null,
        feeAmountMax: engagement.feeAmountMax?.toString() ?? null,
        paymentOrders: engagement.paymentOrders.map((order) => ({
          ...order,
          amountTotal: order.amountTotal.toString(),
          amountHeld: order.amountHeld.toString(),
          amountReleased: order.amountReleased.toString(),
          amountRefunded: order.amountRefunded.toString(),
          milestones: order.milestones.map((m) => ({
            ...m,
            amount: m.amount.toString(),
          })),
          events: order.events.map((e) => ({
            ...e,
            amount: e.amount?.toString() ?? null,
          })),
        })),
      },
      summary: {
        totalOrdered: totalOrdered.toFixed(2),
        totalReleased: totalReleased.toFixed(2),
        progressPct:
          totalOrdered > 0
            ? Math.round((totalReleased / totalOrdered) * 100)
            : 0,
        totalMilestones,
        completedMilestones,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/marketplace/engagements/[engagementId]/milestones failed",
      error,
    );
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
