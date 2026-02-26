export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  engagementId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(200),
  currency: z.string().trim().min(3).max(8).default("USD"),
  amountTotal: z.coerce.number().positive(),
  milestones: z.array(z.object({
    title: z.string().trim().min(2).max(200),
    deliverable: z.string().trim().min(2).max(500),
    amount: z.coerce.number().positive(),
    targetDate: z.string().datetime().optional(),
  })).max(10).optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "").trim();
    const where =
      auth.role === "ADMIN"
        ? { ...(status ? { status: status as never } : {}) }
        : auth.role === "CLIENT"
          ? { clientProfileId: auth.clientProfileId ?? "__none__", ...(status ? { status: status as never } : {}) }
          : { attorneyProfileId: auth.attorneyProfileId ?? "__none__", ...(status ? { status: status as never } : {}) };

    const items = await prisma.paymentOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        milestones: { orderBy: { sortOrder: "asc" } },
        events: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("GET /api/marketplace/payments failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || (auth.role !== "CLIENT" && auth.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only client/admin can create payment orders." }, { status: 403 });
    }
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;

    const engagement = await prisma.engagementConfirmation.findUnique({
      where: { id: data.engagementId },
      include: { case: true, bid: { include: { attorney: { include: { user: true } } } }, client: true },
    });
    if (!engagement) return NextResponse.json({ error: "Engagement not found." }, { status: 404 });
    if (engagement.status !== "ACTIVE") return NextResponse.json({ error: "Payment requires active engagement confirmation." }, { status: 409 });
    if (auth.role === "CLIENT" && auth.clientProfileId !== engagement.clientProfileId) return NextResponse.json({ error: "Not your engagement." }, { status: 403 });

    const milestoneTotal = (data.milestones ?? []).reduce((sum, m) => sum + Number(m.amount), 0);
    if (data.milestones && Math.abs(milestoneTotal - Number(data.amountTotal)) > 0.01) {
      return NextResponse.json({ error: "Milestone sum must equal total amount." }, { status: 400 });
    }

    const blockingDispute = await prisma.disputeTicket.findFirst({
      where: {
        OR: [
          { conversationId: engagement.conversationId ?? "__none__" },
          { caseId: engagement.caseId },
          { bidId: engagement.bidId },
        ],
        status: { in: ["OPEN", "UNDER_REVIEW", "WAITING_PARTY"] },
      },
      select: { id: true, status: true },
    });

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentOrder.create({
        data: {
          engagementId: engagement.id,
          caseId: engagement.caseId,
          bidId: engagement.bidId,
          conversationId: engagement.conversationId,
          clientProfileId: engagement.clientProfileId,
          attorneyProfileId: engagement.attorneyProfileId,
          payerUserId: engagement.client ? engagement.client.userId : auth.authUserId,
          payeeUserId: engagement.bid.attorney.userId,
          feeMode: engagement.feeMode,
          status: "PENDING_PAYMENT",
          currency: data.currency.toUpperCase(),
          amountTotal: data.amountTotal.toFixed(2),
          amountHeld: "0.00",
          title: data.title,
          scopeSnapshot: {
            serviceBoundary: engagement.serviceBoundary,
            serviceScopeSummary: engagement.serviceScopeSummary,
            stagePlan: engagement.stagePlan,
            feeMode: engagement.feeMode,
          },
          holdBlockedByDispute: Boolean(blockingDispute),
          holdBlockedReason: blockingDispute ? `Blocked by dispute ${blockingDispute.id}` : null,
        },
      });
      if (data.milestones?.length) {
        await tx.paymentMilestone.createMany({
          data: data.milestones.map((m, idx) => ({
            paymentOrderId: created.id,
            sortOrder: idx,
            title: m.title,
            deliverable: m.deliverable,
            amount: Number(m.amount).toFixed(2),
            targetDate: m.targetDate ? new Date(m.targetDate) : null,
          })),
        });
      }
      await tx.paymentEvent.create({
        data: {
          paymentOrderId: created.id,
          actorUserId: auth.authUserId,
          type: "PAYMENT_INTENT_CREATED",
          amount: data.amountTotal.toFixed(2),
          note: blockingDispute ? `Created with dispute block (${blockingDispute.id})` : "Payment order created",
          metadata: { engagementId: engagement.id, milestoneCount: data.milestones?.length ?? 0 },
        },
      });
      return created;
    });

    return NextResponse.json({ ok: true, paymentOrder: order, blockedByDispute: blockingDispute ? { id: blockingDispute.id, status: blockingDispute.status } : null });
  } catch (error) {
    console.error("POST /api/marketplace/payments failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

