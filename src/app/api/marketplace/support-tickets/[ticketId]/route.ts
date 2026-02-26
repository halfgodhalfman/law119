export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { createUserNotification } from "@/lib/user-notifications";
import { logAdminAction } from "@/lib/admin-action-log";

const patchSchema = z.object({
  status: z.enum(["OPEN", "PENDING_PLATFORM", "PENDING_CLIENT", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedAdminUserId: z.string().nullable().optional(),
});

const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  isInternalNote: z.boolean().optional(),
  isTemplate: z.boolean().optional(),
  attachmentIds: z.array(z.string()).max(8).optional(),
});

async function getTicket(ticketId: string) {
  return prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      client: { select: { firstName: true, lastName: true } },
      createdBy: { select: { id: true, email: true } },
      assignedAdmin: { select: { id: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 300,
        include: {
          sender: { select: { id: true, email: true, role: true } },
          attachments: {
            select: { id: true, fileName: true, url: true, mimeType: true, sizeBytes: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      attachments: {
        where: { messageId: null },
        select: { id: true, fileName: true, url: true, mimeType: true, sizeBytes: true, createdAt: true, uploaderUserId: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

function canView(auth: Awaited<ReturnType<typeof requireAuthContext>>, ticket: Awaited<ReturnType<typeof getTicket>>) {
  if (!ticket) return false;
  if (auth.role === "ADMIN") return true;
  return ticket.createdByUserId === auth.authUserId;
}

export async function GET(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { ticketId } = await params;
    const ticket = await getTicket(ticketId);
    if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    if (!canView(auth, ticket)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    const messages = auth.role === "ADMIN" ? ticket.messages : ticket.messages.filter((m) => !m.isInternalNote);
    return NextResponse.json({ ok: true, ticket: { ...ticket, messages } });
  } catch (error) {
    console.error("GET /api/marketplace/support-tickets/[ticketId] failed", error);
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
    const before = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!before) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    const d = parsed.data;
    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        ...(d.status ? { status: d.status } : {}),
        ...(d.priority ? { priority: d.priority } : {}),
        ...("assignedAdminUserId" in d ? { assignedAdminUserId: d.assignedAdminUserId ?? null } : {}),
        ...(d.status === "RESOLVED" ? { resolvedAt: new Date() } : {}),
        ...(d.status === "CLOSED" ? { closedAt: new Date() } : {}),
        ...(d.status && ["PENDING_PLATFORM", "PENDING_CLIENT", "RESOLVED"].includes(d.status)
          ? { firstResponseAt: before.firstResponseAt ?? new Date() }
          : {}),
      },
    });

    await logAdminAction({
      adminUserId: auth.authUserId,
      entityType: "SUPPORT_TICKET",
      entityId: ticketId,
      action: "support_ticket_update",
      metadata: { beforeStatus: before.status, afterStatus: updated.status, priority: updated.priority },
    }).catch(() => null);

    await createUserNotification({
      userId: before.createdByUserId,
      type: "SUPPORT_TICKET_UPDATE",
      title: "客服消息单状态更新",
      body: `${before.subject} · ${updated.status}`,
      linkUrl: `/marketplace/support-tickets/${ticketId}`,
      metadata: { ticketId, status: updated.status },
    }).catch(() => null);

    return NextResponse.json({ ok: true, ticket: updated });
  } catch (error) {
    console.error("PATCH /api/marketplace/support-tickets/[ticketId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { ticketId } = await params;
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    const isAdmin = auth.role === "ADMIN";
    if (!isAdmin && ticket.createdByUserId !== auth.authUserId) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const parsed = messageSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    if (parsed.data.isInternalNote && !isAdmin) return NextResponse.json({ error: "Internal note is admin only." }, { status: 403 });

    const msg = await prisma.$transaction(async (tx) => {
      const created = await tx.supportTicketMessage.create({
        data: {
          ticketId,
          senderUserId: auth.authUserId,
          senderRole: auth.role,
          body: parsed.data.body,
          isTemplate: parsed.data.isTemplate ?? false,
          isInternalNote: isAdmin ? (parsed.data.isInternalNote ?? false) : false,
        },
        select: { id: true, createdAt: true },
      });
      if (parsed.data.attachmentIds?.length) {
        await tx.supportTicketAttachment.updateMany({
          where: {
            id: { in: parsed.data.attachmentIds },
            ticketId,
            uploaderUserId: auth.authUserId,
            messageId: null,
          },
          data: { messageId: created.id },
        });
      }
      return created;
    });

    const nextStatus = isAdmin ? "PENDING_CLIENT" : "PENDING_PLATFORM";
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        latestMessageAt: new Date(),
        updatedAt: new Date(),
        status: nextStatus,
        ...(isAdmin ? { firstResponseAt: ticket.firstResponseAt ?? new Date() } : {}),
      },
    }).catch(() => null);

    const recipientUserId = isAdmin ? ticket.createdByUserId : (ticket.assignedAdminUserId ?? null);
    if (recipientUserId) {
      await createUserNotification({
        userId: recipientUserId,
        type: "SUPPORT_TICKET_UPDATE",
        title: isAdmin ? "平台已回复你的客服消息单" : "客服消息单有新回复",
        body: parsed.data.body.slice(0, 120),
        linkUrl: isAdmin ? `/marketplace/support-tickets/${ticketId}` : `/marketplace/admin/support-tickets/${ticketId}`,
        metadata: { ticketId, senderRole: auth.role },
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true, message: msg });
  } catch (error) {
    console.error("POST /api/marketplace/support-tickets/[ticketId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
