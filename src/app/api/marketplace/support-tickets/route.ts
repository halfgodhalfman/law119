export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { createManyUserNotifications } from "@/lib/user-notifications";

const createSchema = z.object({
  subject: z.string().trim().min(4).max(200),
  category: z.enum(["GENERAL", "ACCOUNT", "BILLING", "CASE_PROCESS", "PLATFORM_FEEDBACK", "SAFETY", "OTHER"]).default("GENERAL"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  body: z.string().trim().min(5).max(4000),
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
        : { createdByUserId: auth.authUserId, ...(status ? { status: status as never } : {}) };

    const items = await prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        attachments: {
          where: { messageId: null },
          orderBy: { createdAt: "asc" },
          take: 20,
          select: { id: true, fileName: true, url: true, mimeType: true, sizeBytes: true, uploaderUserId: true, createdAt: true },
        },
        client: { select: { firstName: true, lastName: true } },
        createdBy: { select: { email: true } },
        assignedAdmin: { select: { email: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, senderRole: true, body: true, createdAt: true, isInternalNote: true },
        },
      },
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("GET /api/marketplace/support-tickets failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const ticket = await prisma.$transaction(async (tx) => {
      const slaHours = d.priority === "URGENT" ? 4 : d.priority === "HIGH" ? 12 : d.priority === "MEDIUM" ? 24 : 48;
      const created = await tx.supportTicket.create({
        data: {
          createdByUserId: auth.authUserId,
          clientProfileId: auth.clientProfileId ?? null,
          subject: d.subject,
          category: d.category,
          priority: d.priority,
          status: "OPEN",
          latestMessageAt: new Date(),
          slaDueAt: new Date(Date.now() + slaHours * 60 * 60 * 1000),
        },
      });
      await tx.supportTicketMessage.create({
        data: {
          ticketId: created.id,
          senderUserId: auth.authUserId,
          senderRole: auth.role,
          body: d.body,
        },
      });
      return created;
    });

    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true }, take: 10 });
    await createManyUserNotifications(
      admins.map((a) => ({
        userId: a.id,
        type: "SUPPORT_TICKET_UPDATE",
        title: "新的客服消息单",
        body: d.subject,
        linkUrl: `/marketplace/admin/support-tickets/${ticket.id}`,
        metadata: { ticketId: ticket.id, category: d.category, priority: d.priority },
      })),
    ).catch(() => null);

    return NextResponse.json({ ok: true, ticket });
  } catch (error) {
    console.error("POST /api/marketplace/support-tickets failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
