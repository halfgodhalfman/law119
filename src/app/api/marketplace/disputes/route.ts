import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { createManyUserNotifications } from "@/lib/user-notifications";

const createSchema = z.object({
  conversationId: z.string().trim().min(1).optional(),
  caseId: z.string().trim().min(1).optional(),
  bidId: z.string().trim().min(1).optional(),
  category: z.string().trim().min(2).max(80),
  title: z.string().trim().min(4).max(200),
  description: z.string().trim().min(10).max(4000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
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

    const items = await prisma.disputeTicket.findMany({
      where,
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        status: true,
        priority: true,
        category: true,
        title: true,
        conversationId: true,
        caseId: true,
        bidId: true,
        assignedAdminUserId: true,
        slaDueAt: true,
        firstResponseAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("GET /api/marketplace/disputes failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || (auth.role !== "CLIENT" && auth.role !== "ATTORNEY" && auth.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;

    let caseId = data.caseId ?? null;
    let bidId = data.bidId ?? null;
    let conversationId = data.conversationId ?? null;
    let clientProfileId = auth.clientProfileId ?? null;
    let attorneyProfileId = auth.attorneyProfileId ?? null;

    if (conversationId) {
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true, caseId: true, bidId: true, clientProfileId: true, attorneyProfileId: true },
      });
      if (!conv) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      if (auth.role !== "ADMIN") {
        const ok =
          (auth.role === "CLIENT" && auth.clientProfileId && conv.clientProfileId === auth.clientProfileId) ||
          (auth.role === "ATTORNEY" && auth.attorneyProfileId && conv.attorneyProfileId === auth.attorneyProfileId);
        if (!ok) return NextResponse.json({ error: "Forbidden conversation." }, { status: 403 });
      }
      caseId = conv.caseId;
      bidId = conv.bidId;
      clientProfileId = conv.clientProfileId ?? clientProfileId;
      attorneyProfileId = conv.attorneyProfileId ?? attorneyProfileId;
    }

    const slaDueAt = new Date(Date.now() + (data.priority === "URGENT" ? 4 : data.priority === "HIGH" ? 12 : 24) * 60 * 60 * 1000);
    const ticket = await prisma.disputeTicket.create({
      data: {
        caseId,
        bidId,
        conversationId,
        clientProfileId,
        attorneyProfileId,
        createdByUserId: auth.authUserId,
        priority: data.priority ?? "MEDIUM",
        category: data.category,
        title: data.title,
        description: data.description,
        slaDueAt,
      },
      select: { id: true, status: true, priority: true, slaDueAt: true, createdAt: true },
    });

    await prisma.disputeTicketMessage.create({
      data: {
        ticketId: ticket.id,
        senderUserId: auth.authUserId,
        senderRole: auth.role,
        body: data.description,
      },
    }).catch(() => null);

    const notifyTargets = new Set<string>();
    if (auth.role === "CLIENT" && attorneyProfileId) {
      const attorney = await prisma.attorneyProfile.findUnique({ where: { id: attorneyProfileId }, select: { userId: true } }).catch(() => null);
      if (attorney?.userId) notifyTargets.add(attorney.userId);
    }
    if (auth.role === "ATTORNEY" && clientProfileId) {
      const client = await prisma.clientProfile.findUnique({ where: { id: clientProfileId }, select: { userId: true } }).catch(() => null);
      if (client?.userId) notifyTargets.add(client.userId);
    }
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true }, take: 10 }).catch(() => []);
    admins.forEach((a) => notifyTargets.add(a.id));
    notifyTargets.delete(auth.authUserId);
    await createManyUserNotifications(
      Array.from(notifyTargets).map((userId) => ({
        userId,
        type: "DISPUTE_UPDATE",
        title: "新的争议工单",
        body: data.title,
        linkUrl: userId === auth.authUserId ? `/marketplace/disputes/${ticket.id}` : `/marketplace/disputes/${ticket.id}`,
        metadata: { ticketId: ticket.id, priority: ticket.priority, category: data.category },
      })),
    ).catch(() => null);

    return NextResponse.json({ ok: true, ticket });
  } catch (error) {
    console.error("POST /api/marketplace/disputes failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
