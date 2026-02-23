import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { createUserNotification } from "@/lib/user-notifications";

const patchSchema = z.object({
  status: z.enum(["OPEN", "UNDER_REVIEW", "WAITING_PARTY", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  isInternalNote: z.boolean().optional(),
  isTemplate: z.boolean().optional(),
});

async function canView(auth: Awaited<ReturnType<typeof requireAuthContext>>, ticketId: string) {
  const ticket = await prisma.disputeTicket.findUnique({
    where: { id: ticketId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 200, include: { sender: { select: { email: true } } } },
      case: { select: { title: true } },
    },
  });
  if (!ticket) return { ticket: null, allowed: false } as const;
  if (auth.role === "ADMIN") return { ticket, allowed: true } as const;
  if (auth.role === "CLIENT" && auth.clientProfileId && ticket.clientProfileId === auth.clientProfileId) return { ticket, allowed: true } as const;
  if (auth.role === "ATTORNEY" && auth.attorneyProfileId && ticket.attorneyProfileId === auth.attorneyProfileId) return { ticket, allowed: true } as const;
  return { ticket, allowed: false } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { ticketId } = await params;
    const access = await canView(auth, ticketId);
    if (!access.ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const messages =
      auth.role === "ADMIN"
        ? access.ticket.messages
        : access.ticket.messages.filter((m) => !m.isInternalNote);
    return NextResponse.json({ ok: true, ticket: { ...access.ticket, messages } });
  } catch (error) {
    console.error("GET /api/marketplace/disputes/[ticketId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ADMIN") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    const { ticketId } = await params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;
    const before = await prisma.disputeTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, createdByUserId: true, title: true },
    });
    if (!before) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    const updated = await prisma.disputeTicket.update({
      where: { id: ticketId },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.priority ? { priority: data.priority } : {}),
        ...(data.status === "RESOLVED" ? { resolvedAt: new Date() } : {}),
        ...(data.status === "CLOSED" ? { closedAt: new Date() } : {}),
        ...(data.status === "UNDER_REVIEW" ? { firstResponseAt: new Date() } : {}),
      },
      select: { id: true, status: true, priority: true, updatedAt: true },
    });
    if (before.createdByUserId !== auth.authUserId) {
      await createUserNotification({
        userId: before.createdByUserId,
        type: "DISPUTE_UPDATE",
        title: "争议工单状态更新",
        body: `${before.title} · ${updated.status}`,
        linkUrl: `/marketplace/disputes/${ticketId}`,
        metadata: { ticketId, status: updated.status, priority: updated.priority },
      }).catch(() => null);
    }
    return NextResponse.json({ ok: true, ticket: updated });
  } catch (error) {
    console.error("PATCH /api/marketplace/disputes/[ticketId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { ticketId } = await params;
    const access = await canView(auth, ticketId);
    if (!access.ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    const parsed = messageSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    if (parsed.data.isInternalNote && auth.role !== "ADMIN") {
      return NextResponse.json({ error: "Internal note is admin only." }, { status: 403 });
    }

    const msg = await prisma.disputeTicketMessage.create({
      data: {
        ticketId,
        senderUserId: auth.authUserId,
        senderRole: auth.role,
        body: parsed.data.body,
        isTemplate: parsed.data.isTemplate ?? false,
        isInternalNote: auth.role === "ADMIN" ? (parsed.data.isInternalNote ?? false) : false,
      },
      select: { id: true, createdAt: true },
    });

    await prisma.disputeTicket.update({
      where: { id: ticketId },
      data: {
        updatedAt: new Date(),
        ...(auth.role === "ADMIN" ? { firstResponseAt: access.ticket.firstResponseAt ?? new Date(), status: access.ticket.status === "OPEN" ? "UNDER_REVIEW" : undefined } : {}),
      },
    }).catch(() => null);

    if (auth.role === "ADMIN") {
      await createUserNotification({
        userId: access.ticket.createdByUserId,
        type: "DISPUTE_UPDATE",
        title: "平台回复了你的争议工单",
        body: parsed.data.body.slice(0, 120),
        linkUrl: `/marketplace/disputes/${ticketId}`,
        metadata: { ticketId, senderRole: auth.role },
      }).catch(() => null);
    } else if (access.ticket.assignedAdminUserId) {
      await createUserNotification({
        userId: access.ticket.assignedAdminUserId,
        type: "DISPUTE_UPDATE",
        title: "争议工单有新回复",
        body: parsed.data.body.slice(0, 120),
        linkUrl: `/marketplace/admin/disputes`,
        metadata: { ticketId, senderRole: auth.role },
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true, message: msg });
  } catch (error) {
    console.error("POST /api/marketplace/disputes/[ticketId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
