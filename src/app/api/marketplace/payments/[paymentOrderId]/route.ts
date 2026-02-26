export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-action-log";
import { createManyUserNotifications } from "@/lib/user-notifications";

const actionSchema = z.object({
  action: z.enum([
    "mark_paid_held",
    "request_milestone_release",
    "release_milestone",
    "approve_milestone_release",
    "reject_milestone_release",
    "admin_hold",
    "admin_release_hold",
    "set_hold_reason",
    "set_reconciliation_status",
    "refund_request",
    "refund_approve",
    "refund_reject",
    "refund_complete",
  ]),
  milestoneId: z.string().optional(),
  note: z.string().trim().max(1000).optional(),
  holdReasonCode: z.enum(["DISPUTE_BLOCK", "FRAUD_REVIEW", "COMPLIANCE_REVIEW", "DOCUMENT_MISSING", "MANUAL_HOLD", "OTHER"]).optional(),
  reconciliationStatus: z.enum(["UNRECONCILED", "MATCHED", "MANUAL_REVIEW", "MISMATCH", "RECONCILED"]).optional(),
  refundReason: z.enum(["SERVICE_NOT_STARTED", "SERVICE_INCOMPLETE", "QUALITY_ISSUE", "COMMUNICATION_ISSUE", "OVERCHARGED", "OTHER"]).optional(),
  refundDescription: z.string().trim().max(2000).optional(),
});

async function hasBlockingDispute(order: { conversationId: string | null; caseId: string | null; bidId: string | null }) {
  return prisma.disputeTicket.findFirst({
    where: {
      status: { in: ["OPEN", "UNDER_REVIEW", "WAITING_PARTY"] },
      OR: [
        ...(order.conversationId ? [{ conversationId: order.conversationId }] : []),
        ...(order.caseId ? [{ caseId: order.caseId }] : []),
        ...(order.bidId ? [{ bidId: order.bidId }] : []),
      ],
    },
    select: { id: true, status: true },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ paymentOrderId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { paymentOrderId } = await params;
    const item = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: {
        milestones: { orderBy: { sortOrder: "asc" } },
        events: { orderBy: { createdAt: "desc" }, include: { actor: { select: { email: true, role: true } } } },
        engagement: { select: { id: true, status: true, serviceBoundary: true, serviceScopeSummary: true } },
      },
    });
    if (!item) return NextResponse.json({ error: "Payment order not found." }, { status: 404 });

    const isAdmin = auth.role === "ADMIN";
    const isClient = auth.role === "CLIENT" && auth.clientProfileId && item.clientProfileId === auth.clientProfileId;
    const isAttorney = auth.role === "ATTORNEY" && auth.attorneyProfileId && item.attorneyProfileId === auth.attorneyProfileId;
    const canView = isAdmin || Boolean(isClient) || Boolean(isAttorney);
    if (!canView) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    return NextResponse.json({
      ok: true,
      paymentOrder: item,
      viewer: {
        role: auth.role,
        canClientActions: isClient || isAdmin,
        canAttorneyActions: isAttorney || isAdmin,
        isAdmin,
      },
    });
  } catch (error) {
    console.error("GET /api/marketplace/payments/[paymentOrderId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ paymentOrderId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { paymentOrderId } = await params;
    const parsed = actionSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const { action, milestoneId, note } = parsed.data;

    const order = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: { milestones: true },
    });
    if (!order) return NextResponse.json({ error: "Payment order not found." }, { status: 404 });

    const isAdmin = auth.role === "ADMIN";
    const isClient = auth.role === "CLIENT" && auth.clientProfileId && order.clientProfileId === auth.clientProfileId;
    const isAttorney = auth.role === "ATTORNEY" && auth.attorneyProfileId && order.attorneyProfileId === auth.attorneyProfileId;
    if (!isAdmin && !isClient && !isAttorney) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    if (["release_milestone", "admin_release_hold"].includes(action)) {
      const dispute = await hasBlockingDispute(order);
      if (dispute) {
        await prisma.paymentOrder.update({
          where: { id: order.id },
          data: { holdBlockedByDispute: true, holdBlockedReason: `Blocked by dispute ${dispute.id}` },
        }).catch(() => null);
        await prisma.paymentEvent.create({
          data: {
            paymentOrderId: order.id,
            actorUserId: auth.authUserId,
            type: "DISPUTE_BLOCK",
            note: `Blocked by dispute ${dispute.id}`,
            metadata: { disputeId: dispute.id, disputeStatus: dispute.status, attemptedAction: action },
          },
        }).catch(() => null);
        return NextResponse.json({ error: "Payout/release blocked by active dispute.", disputeId: dispute.id }, { status: 409 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const updates: any = {};
      let eventType: any = null;
      let eventAmount: string | null = null;

      if (action === "mark_paid_held") {
        if (!isClient && !isAdmin) throw new Error("CLIENT_OR_ADMIN_ONLY");
        updates.status = "PAID_HELD";
        updates.amountHeld = order.amountTotal;
        eventType = "PAYMENT_SUCCEEDED";
        eventAmount = order.amountTotal.toString();
      } else if (action === "request_milestone_release") {
        if (!isAttorney && !isAdmin) throw new Error("ATTORNEY_OR_ADMIN_ONLY");
        if (!milestoneId) throw new Error("MILESTONE_REQUIRED");
        await tx.paymentMilestone.update({
          where: { id: milestoneId },
          data: {
            status: "READY_FOR_RELEASE",
            releaseRequestedAt: now,
            releaseReviewStatus: "PENDING_REVIEW",
            releaseReviewRequestedAt: now,
            releaseReviewNote: note ?? null,
          },
        });
        eventType = "MILESTONE_RELEASE_REQUESTED";
      } else if (action === "release_milestone") {
        if (!isClient && !isAdmin) throw new Error("CLIENT_OR_ADMIN_ONLY");
        if (!milestoneId) throw new Error("MILESTONE_REQUIRED");
        const ms = order.milestones.find((m) => m.id === milestoneId);
        if (!ms) throw new Error("MILESTONE_NOT_FOUND");
        if (!isAdmin && ms.releaseReviewStatus === "PENDING_REVIEW") throw new Error("MILESTONE_REVIEW_PENDING");
        await tx.paymentMilestone.update({ where: { id: milestoneId }, data: { status: "RELEASED", releasedAt: now } });
        const amountReleased = Number(order.amountReleased) + Number(ms.amount);
        const amountHeld = Math.max(0, Number(order.amountHeld) - Number(ms.amount));
        updates.amountReleased = amountReleased.toFixed(2);
        updates.amountHeld = amountHeld.toFixed(2);
        updates.status = amountHeld > 0 ? "PARTIALLY_RELEASED" : "RELEASED";
        eventType = "MILESTONE_RELEASED";
        eventAmount = Number(ms.amount).toFixed(2);
      } else if (action === "approve_milestone_release") {
        if (!isAdmin) throw new Error("ADMIN_ONLY");
        if (!milestoneId) throw new Error("MILESTONE_REQUIRED");
        await tx.paymentMilestone.update({
          where: { id: milestoneId },
          data: {
            releaseReviewStatus: "APPROVED",
            releaseReviewedAt: now,
            releaseReviewedByUserId: auth.authUserId,
            releaseReviewNote: note ?? null,
          },
        });
        eventType = "ADMIN_RELEASE";
      } else if (action === "reject_milestone_release") {
        if (!isAdmin) throw new Error("ADMIN_ONLY");
        if (!milestoneId) throw new Error("MILESTONE_REQUIRED");
        await tx.paymentMilestone.update({
          where: { id: milestoneId },
          data: {
            releaseReviewStatus: "REJECTED",
            releaseReviewedAt: now,
            releaseReviewedByUserId: auth.authUserId,
            releaseReviewNote: note ?? null,
          },
        });
        eventType = "ADMIN_HOLD";
      } else if (action === "admin_hold") {
        if (!isAdmin) throw new Error("ADMIN_ONLY");
        updates.holdBlockedByDispute = true;
        updates.holdBlockedReason = note || "Admin hold";
        updates.holdReasonCode = "MANUAL_HOLD";
        eventType = "ADMIN_HOLD";
      } else if (action === "admin_release_hold") {
        if (!isAdmin) throw new Error("ADMIN_ONLY");
        updates.holdBlockedByDispute = false;
        updates.holdBlockedReason = null;
        eventType = "ADMIN_RELEASE";
      } else if (action === "set_hold_reason") {
        if (!isAdmin) throw new Error("ADMIN_ONLY");
        updates.holdReasonCode = parsed.data.holdReasonCode ?? "OTHER";
        updates.holdBlockedReason = note ?? order.holdBlockedReason;
        eventType = "ADMIN_HOLD";
      } else if (action === "set_reconciliation_status") {
        if (!isAdmin) throw new Error("ADMIN_ONLY");
        if (!parsed.data.reconciliationStatus) throw new Error("RECONCILIATION_STATUS_REQUIRED");
        updates.reconciliationStatus = parsed.data.reconciliationStatus;
        updates.reconciliationNote = note ?? null;
        updates.reconciledByUserId = auth.authUserId;
        updates.reconciledAt = now;
        eventType = "ADMIN_RELEASE";
      } else if (action === "refund_request") {
        if (!isClient && !isAdmin) throw new Error("CLIENT_OR_ADMIN_ONLY");
        updates.status = "REFUND_PENDING";
        updates.refundReviewStatus = "PENDING_REVIEW";
        updates.refundRequestedAt = now;
        updates.refundReviewNote = note ?? null;
        updates.refundReason = parsed.data.refundReason || null;
        updates.refundDescription = parsed.data.refundDescription || null;
        eventType = "REFUND_REQUESTED";
      } else if (action === "refund_approve") {
        if (!isAdmin) throw new Error("ADMIN_ONLY");
        updates.refundReviewStatus = "APPROVED";
        updates.refundReviewedAt = now;
        updates.refundReviewedByUserId = auth.authUserId;
        updates.refundReviewNote = note ?? null;
        eventType = "REFUND_APPROVED";
      } else if (action === "refund_reject") {
        if (!isAdmin) throw new Error("ADMIN_ONLY");
        updates.refundReviewStatus = "REJECTED";
        updates.refundReviewedAt = now;
        updates.refundReviewedByUserId = auth.authUserId;
        updates.refundReviewNote = note ?? null;
        updates.status = order.amountReleased && Number(order.amountReleased) > 0 ? "PARTIALLY_RELEASED" : (Number(order.amountHeld) > 0 ? "PAID_HELD" : order.status);
        eventType = "ADMIN_HOLD";
      } else if (action === "refund_complete") {
        if (!isAdmin) throw new Error("ADMIN_ONLY");
        if (order.refundReviewStatus === "PENDING_REVIEW") throw new Error("REFUND_REVIEW_PENDING");
        updates.status = "REFUNDED";
        updates.amountRefunded = order.amountTotal;
        updates.amountHeld = "0.00";
        eventType = "REFUND_COMPLETED";
        eventAmount = order.amountTotal.toString();
      }

      const updatedOrder = await tx.paymentOrder.update({
        where: { id: order.id },
        data: updates,
      });
      await tx.paymentEvent.create({
        data: {
          paymentOrderId: order.id,
          milestoneId: milestoneId ?? null,
          actorUserId: auth.authUserId,
          type: eventType,
          amount: eventAmount,
          note: note ?? null,
          metadata: { action },
        },
      });
      return updatedOrder;
    });

    if (isAdmin) {
      const diff = {
        status: order.status === result.status ? undefined : { old: order.status, new: result.status },
        amountHeld: String(order.amountHeld) === String(result.amountHeld) ? undefined : { old: String(order.amountHeld), new: String(result.amountHeld) },
        amountReleased: String(order.amountReleased) === String(result.amountReleased) ? undefined : { old: String(order.amountReleased), new: String(result.amountReleased) },
        amountRefunded: String(order.amountRefunded) === String(result.amountRefunded) ? undefined : { old: String(order.amountRefunded), new: String(result.amountRefunded) },
        holdBlockedByDispute: order.holdBlockedByDispute === result.holdBlockedByDispute ? undefined : { old: order.holdBlockedByDispute, new: result.holdBlockedByDispute },
        holdBlockedReason: order.holdBlockedReason === result.holdBlockedReason ? undefined : { old: order.holdBlockedReason, new: result.holdBlockedReason },
        holdReasonCode: order.holdReasonCode === result.holdReasonCode ? undefined : { old: order.holdReasonCode, new: result.holdReasonCode },
        reconciliationStatus: order.reconciliationStatus === result.reconciliationStatus ? undefined : { old: order.reconciliationStatus, new: result.reconciliationStatus },
        refundReviewStatus: order.refundReviewStatus === result.refundReviewStatus ? undefined : { old: order.refundReviewStatus, new: result.refundReviewStatus },
      };
      await logAdminAction({
        adminUserId: auth.authUserId,
        entityType: "CASE",
        entityId: result.caseId ?? result.id,
        action: `PAYMENT_${action.toUpperCase()}`,
        reason: note ?? null,
        metadata: JSON.parse(JSON.stringify({ paymentOrderId: result.id, milestoneId: milestoneId ?? null, status: result.status, diff })),
      }).catch(() => null);
    }

    const notifyTargets = [order.payerUserId, order.payeeUserId]
      .filter((id): id is string => Boolean(id) && id !== auth.authUserId);
    await createManyUserNotifications(
      notifyTargets.map((userId) => ({
        userId,
        type: "PAYMENT_UPDATE",
        title: "支付/托管状态更新",
        body: `${result.title} · ${action}`,
        linkUrl: `/marketplace/payments/${result.id}`,
        metadata: { paymentOrderId: result.id, action, status: result.status, milestoneId: milestoneId ?? null },
      })),
    ).catch(() => null);

    return NextResponse.json({ ok: true, paymentOrder: result });
  } catch (error) {
    const m = error instanceof Error ? error.message : "UNKNOWN";
    if (m === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    if (m === "CLIENT_OR_ADMIN_ONLY") return NextResponse.json({ error: "Client or admin required." }, { status: 403 });
    if (m === "ATTORNEY_OR_ADMIN_ONLY") return NextResponse.json({ error: "Attorney or admin required." }, { status: 403 });
    if (m === "MILESTONE_REQUIRED") return NextResponse.json({ error: "milestoneId is required." }, { status: 400 });
    if (m === "MILESTONE_NOT_FOUND") return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    if (m === "MILESTONE_REVIEW_PENDING") return NextResponse.json({ error: "Milestone release is pending admin review." }, { status: 409 });
    if (m === "RECONCILIATION_STATUS_REQUIRED") return NextResponse.json({ error: "reconciliationStatus is required." }, { status: 400 });
    if (m === "REFUND_REVIEW_PENDING") return NextResponse.json({ error: "Refund is pending review approval." }, { status: 409 });
    console.error("POST /api/marketplace/payments/[paymentOrderId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
