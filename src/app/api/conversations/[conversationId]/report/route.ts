export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "../../../../../lib/auth-context";
import { prisma } from "../../../../../lib/prisma";
import { getConversationParticipants } from "../../../../../lib/conversation-safety";

const reportSchema = z.object({
  category: z.enum(["HARASSMENT", "SPAM", "FRAUD", "THREAT", "INAPPROPRIATE", "PRIVACY", "OTHER"]),
  messageId: z.string().trim().min(1).max(128).optional(),
  attachmentIds: z.array(z.string().trim().min(1).max(128)).max(5).optional(),
  details: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || (auth.role !== "CLIENT" && auth.role !== "ATTORNEY")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { conversationId } = await params;
    const payload = reportSchema.safeParse(await request.json().catch(() => ({})));
    if (!payload.success) {
      return NextResponse.json({ error: "Validation failed", details: payload.error.flatten() }, { status: 400 });
    }

    const conversation = await getConversationParticipants(conversationId);
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    const isClient = auth.role === "CLIENT" && conversation.client?.userId === auth.authUserId;
    const isAttorney = auth.role === "ATTORNEY" && conversation.attorney.userId === auth.authUserId;
    if (!isClient && !isAttorney) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    const reporterRole = isClient ? "CLIENT" : "ATTORNEY";

    const targetUserId = isClient ? conversation.attorney.userId : conversation.client?.userId ?? null;
    const targetRole = isClient ? "ATTORNEY" : conversation.client ? "CLIENT" : null;
    let reportedMessageId: string | null = null;
    let reportedMessageExcerpt: string | null = null;
    if (payload.data.messageId) {
      const targetMessage = await prisma.chatMessage.findFirst({
        where: { id: payload.data.messageId, conversationId },
        select: { id: true, body: true },
      });
      if (!targetMessage) {
        return NextResponse.json({ error: "Reported message not found." }, { status: 404 });
      }
      reportedMessageId = targetMessage.id;
      reportedMessageExcerpt = targetMessage.body.slice(0, 200);
    }

    const evidenceMessages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, senderRole: true, senderUserId: true, body: true, createdAt: true },
    });
    const evidenceSnapshot = evidenceMessages
      .reverse()
      .map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        senderUserId: m.senderUserId,
        body: m.body.slice(0, 300),
        createdAt: m.createdAt.toISOString(),
      }));

    const attachmentIds = Array.from(new Set(payload.data.attachmentIds ?? []));
    if (attachmentIds.length > 0) {
      const attachments = await prisma.conversationReportAttachment.findMany({
        where: {
          id: { in: attachmentIds },
          conversationId,
          uploaderUserId: auth.authUserId,
          reportId: null,
        },
        select: { id: true },
      });
      if (attachments.length !== attachmentIds.length) {
        return NextResponse.json({ error: "Some evidence attachments are invalid or already used." }, { status: 400 });
      }
    }

    const report = await prisma.$transaction(async (tx) => {
      const created = await tx.conversationReport.create({
        data: {
          conversationId,
          reporterUserId: auth.authUserId,
          reporterRole,
          targetUserId,
          targetRole,
          reportedMessageId,
          reportedMessageExcerpt,
          category: payload.data.category,
          details: payload.data.details || null,
          evidenceSnapshot,
          evidenceCount: evidenceSnapshot.length,
        },
        select: { id: true, status: true, createdAt: true },
      });
      if (attachmentIds.length > 0) {
        await tx.conversationReportAttachment.updateMany({
          where: { id: { in: attachmentIds }, uploaderUserId: auth.authUserId, conversationId, reportId: null },
          data: { reportId: created.id },
        });
      }
      return created;
    });

    await prisma.chatMessage.create({
      data: {
        conversationId,
        senderRole: "SYSTEM",
        senderUserId: auth.authUserId,
        body: `[REPORT_SUBMITTED] 用户已向平台提交举报（${payload.data.category}）。平台将审核处理。`,
      },
    }).catch(() => null);

    return NextResponse.json({ ok: true, report, attachmentCount: attachmentIds.length });
  } catch (error) {
    console.error("POST /api/conversations/[conversationId]/report failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
