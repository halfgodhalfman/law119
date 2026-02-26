export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-action-log";

const actionSchema = z.object({
  sourceType: z.enum(["REPORT", "DISPUTE", "SUPPORT_TICKET"]),
  sourceId: z.string().trim().min(1),
  action: z.enum([
    "assign_to_me",
    "escalate_to_risk",
    "escalate_to_admin",
    "deescalate_to_cs",
    "mark_reviewing",
    "apply_template_note",
  ]),
  note: z.string().trim().max(4000).optional(),
  templateId: z.string().trim().optional(),
});

function computeFallbackSla(sourceType: "REPORT" | "DISPUTE" | "SUPPORT_TICKET", createdAt: Date) {
  const hours = sourceType === "REPORT" ? 12 : sourceType === "DISPUTE" ? 24 : 24;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const queue = (url.searchParams.get("queue") ?? "").trim();
    const sourceType = (url.searchParams.get("sourceType") ?? "").trim();
    const slaBreachOnly = url.searchParams.get("slaBreachOnly") === "1";
    const assigned = (url.searchParams.get("assigned") ?? "").trim();
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);
    const now = new Date();

    const [reports, disputes, supportTickets, routings, templates] = await Promise.all([
      prisma.conversationReport.findMany({
        where: q
          ? {
              OR: [
                { id: { contains: q, mode: "insensitive" } },
                { conversationId: { contains: q, mode: "insensitive" } },
                { details: { contains: q, mode: "insensitive" } },
              ],
            }
          : undefined,
        take: 300,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true, category: true, status: true, createdAt: true, updatedAt: true, handledByUserId: true, handledAt: true,
          conversationId: true, adminNote: true, details: true,
          conversation: { select: { caseId: true, case: { select: { title: true } } } },
        },
      }),
      prisma.disputeTicket.findMany({
        where: q
          ? {
              OR: [
                { id: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : undefined,
        take: 300,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true, title: true, category: true, status: true, priority: true, createdAt: true, updatedAt: true, slaDueAt: true,
          assignedAdminUserId: true, conversationId: true, caseId: true, firstResponseAt: true,
        },
      }),
      prisma.supportTicket.findMany({
        where: q
          ? {
              OR: [
                { id: { contains: q, mode: "insensitive" } },
                { subject: { contains: q, mode: "insensitive" } },
              ],
            }
          : undefined,
        take: 300,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true, subject: true, category: true, status: true, priority: true, createdAt: true, updatedAt: true, slaDueAt: true,
          assignedAdminUserId: true, firstResponseAt: true,
        },
      }),
      prisma.supportInboxRouting.findMany({
        take: 1000,
        include: { assignedAdmin: { select: { email: true } } },
      }),
      prisma.replyTemplate.findMany({
        where: { active: true },
        orderBy: [{ scene: "asc" }, { sortOrder: "asc" }],
        select: { id: true, scene: true, title: true, body: true },
      }),
    ]);

    const routingMap = new Map(routings.map((r) => [`${r.sourceType}:${r.sourceId}`, r]));

    const unified = [
      ...reports.map((r) => {
        const route = routingMap.get(`REPORT:${r.id}`);
        const queueLevel = route?.queueLevel ?? "RISK";
        const slaDueAt = route?.slaDueAtOverride ?? computeFallbackSla("REPORT", r.createdAt);
        const isBreach = ["RESOLVED", "DISMISSED"].includes(String(r.status)) ? false : slaDueAt < now;
        return {
          sourceType: "REPORT" as const,
          sourceId: r.id,
          title: `举报：${r.category}`,
          subtitle: r.conversation?.case?.title ?? r.details?.slice(0, 80) ?? "无摘要",
          status: r.status,
          priority: "HIGH",
          queueLevel,
          assignedAdminUserId: route?.assignedAdminUserId ?? r.handledByUserId ?? null,
          assignedAdminEmail: route?.assignedAdmin?.email ?? null,
          slaDueAt,
          isSlaBreached: isBreach,
          ownerType: queueLevel,
          updatedAt: r.updatedAt,
          createdAt: r.createdAt,
          links: { reportId: r.id, conversationId: r.conversationId, caseId: r.conversation?.caseId ?? null },
          routingNote: route?.internalNote ?? null,
          scene: "report_review",
        };
      }),
      ...disputes.map((d) => {
        const route = routingMap.get(`DISPUTE:${d.id}`);
        const queueLevel = route?.queueLevel ?? "ADMIN";
        const slaDueAt = route?.slaDueAtOverride ?? d.slaDueAt ?? computeFallbackSla("DISPUTE", d.createdAt);
        const isBreach = ["RESOLVED", "CLOSED"].includes(String(d.status)) ? false : slaDueAt < now;
        return {
          sourceType: "DISPUTE" as const,
          sourceId: d.id,
          title: `争议：${d.title}`,
          subtitle: d.category,
          status: d.status,
          priority: route?.priorityOverride ?? d.priority,
          queueLevel,
          assignedAdminUserId: route?.assignedAdminUserId ?? d.assignedAdminUserId ?? null,
          assignedAdminEmail: route?.assignedAdmin?.email ?? null,
          slaDueAt,
          isSlaBreached: isBreach,
          ownerType: queueLevel,
          updatedAt: d.updatedAt,
          createdAt: d.createdAt,
          links: { disputeId: d.id, conversationId: d.conversationId, caseId: d.caseId ?? null },
          routingNote: route?.internalNote ?? null,
          scene: "dispute_handling",
        };
      }),
      ...supportTickets.map((t) => {
        const route = routingMap.get(`SUPPORT_TICKET:${t.id}`);
        const queueLevel = route?.queueLevel ?? "CUSTOMER_SERVICE";
        const slaDueAt = route?.slaDueAtOverride ?? t.slaDueAt ?? computeFallbackSla("SUPPORT_TICKET", t.createdAt);
        const isBreach = ["RESOLVED", "CLOSED"].includes(String(t.status)) ? false : slaDueAt < now;
        return {
          sourceType: "SUPPORT_TICKET" as const,
          sourceId: t.id,
          title: `客服：${t.subject}`,
          subtitle: t.category,
          status: t.status,
          priority: route?.priorityOverride ?? t.priority,
          queueLevel,
          assignedAdminUserId: route?.assignedAdminUserId ?? t.assignedAdminUserId ?? null,
          assignedAdminEmail: route?.assignedAdmin?.email ?? null,
          slaDueAt,
          isSlaBreached: isBreach,
          ownerType: queueLevel,
          updatedAt: t.updatedAt,
          createdAt: t.createdAt,
          links: { supportTicketId: t.id },
          routingNote: route?.internalNote ?? null,
          scene: "support_ticket_reply",
        };
      }),
    ];

    let filtered = unified;
    if (sourceType) filtered = filtered.filter((i) => i.sourceType === sourceType);
    if (queue) filtered = filtered.filter((i) => i.queueLevel === queue);
    if (assigned === "unassigned") filtered = filtered.filter((i) => !i.assignedAdminUserId);
    if (assigned === "assigned") filtered = filtered.filter((i) => !!i.assignedAdminUserId);
    if (slaBreachOnly) filtered = filtered.filter((i) => i.isSlaBreached);

    filtered.sort((a, b) => {
      if (a.isSlaBreached !== b.isSlaBreached) return a.isSlaBreached ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const total = filtered.length;
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      ok: true,
      items,
      filters: { q, queue, sourceType, assigned, slaBreachOnly, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      templates,
      queues: ["CUSTOMER_SERVICE", "RISK", "ADMIN"],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/support-inbox failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const parsed = actionSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    let templateBody: string | null = null;
    if (d.templateId) {
      const t = await prisma.replyTemplate.findUnique({ where: { id: d.templateId }, select: { id: true, body: true, title: true } });
      if (!t) return NextResponse.json({ error: "Template not found." }, { status: 404 });
      templateBody = t.body;
    }

    const queueLevel =
      d.action === "escalate_to_risk"
        ? "RISK"
        : d.action === "escalate_to_admin"
          ? "ADMIN"
          : d.action === "deescalate_to_cs"
            ? "CUSTOMER_SERVICE"
            : undefined;

    await prisma.$transaction(async (tx) => {
      if (queueLevel || d.action === "assign_to_me" || d.note) {
        await tx.supportInboxRouting.upsert({
          where: { sourceType_sourceId: { sourceType: d.sourceType, sourceId: d.sourceId } },
          create: {
            sourceType: d.sourceType,
            sourceId: d.sourceId,
            queueLevel: (queueLevel ?? "CUSTOMER_SERVICE") as any,
            assignedAdminUserId: d.action === "assign_to_me" ? admin.authUserId : undefined,
            internalNote: d.note?.trim() || undefined,
          },
          update: {
            ...(queueLevel ? { queueLevel: queueLevel as any } : {}),
            ...(d.action === "assign_to_me" ? { assignedAdminUserId: admin.authUserId } : {}),
            ...(d.note ? { internalNote: d.note.trim() } : {}),
          },
        });
      }

      if (d.sourceType === "REPORT") {
        if (["mark_reviewing", "assign_to_me", "escalate_to_risk", "escalate_to_admin"].includes(d.action)) {
          await tx.conversationReport.update({
            where: { id: d.sourceId },
            data: {
              status: "REVIEWING",
              handledByUserId: admin.authUserId,
              handledAt: new Date(),
              ...(d.note ? { adminNote: d.note } : {}),
            },
          });
        }
      } else if (d.sourceType === "DISPUTE") {
        const updates: Record<string, unknown> = {};
        if (["mark_reviewing", "assign_to_me", "escalate_to_risk", "escalate_to_admin"].includes(d.action)) {
          updates.status = "UNDER_REVIEW";
          updates.assignedAdminUserId = admin.authUserId;
        }
        if (d.action === "escalate_to_risk") updates.priority = "HIGH";
        if (d.action === "escalate_to_admin") updates.priority = "URGENT";
        if (Object.keys(updates).length) {
          await tx.disputeTicket.update({ where: { id: d.sourceId }, data: updates as any });
        }
      } else if (d.sourceType === "SUPPORT_TICKET") {
        const updates: Record<string, unknown> = {};
        if (["mark_reviewing", "assign_to_me", "escalate_to_risk", "escalate_to_admin"].includes(d.action)) {
          updates.status = "PENDING_PLATFORM";
          updates.assignedAdminUserId = admin.authUserId;
        }
        if (d.action === "escalate_to_risk") updates.priority = "HIGH";
        if (d.action === "escalate_to_admin") updates.priority = "URGENT";
        if (Object.keys(updates).length) {
          await tx.supportTicket.update({ where: { id: d.sourceId }, data: updates as any });
        }
        if (d.action === "apply_template_note" && templateBody) {
          await tx.supportTicketMessage.create({
            data: {
              ticketId: d.sourceId,
              senderUserId: admin.authUserId,
              senderRole: "ADMIN",
              body: templateBody,
              isTemplate: true,
            },
          });
          await tx.supportTicket.update({
            where: { id: d.sourceId },
            data: { latestMessageAt: new Date(), status: "PENDING_CLIENT" },
          });
        }
      }
    });

    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType:
        d.sourceType === "REPORT" ? "REPORT" : d.sourceType === "DISPUTE" ? "CONVERSATION" : "SUPPORT_TICKET",
      entityId: d.sourceId,
      action: `SUPPORT_INBOX_${d.action.toUpperCase()}`,
      reason: d.note ?? null,
      metadata: { sourceType: d.sourceType, templateId: d.templateId ?? null, queueLevel: queueLevel ?? null },
    }).catch(() => null);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("POST /api/marketplace/admin/support-inbox failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

