export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { requireAuthContext } from "../../../../../lib/auth-context";
import {
  canRevealClientIdentity,
  displayClientName,
  displayClientPhone,
  PROFESSIONAL_DISCLAIMER,
} from "../../../../../lib/chat-privacy";
import { getConversationSafetyState } from "../../../../../lib/conversation-safety";
import { evaluateContentRulesConfigured, persistContentRuleHits, summarizeRuleHits } from "../../../../../lib/content-rules";
import { createUserNotification } from "../../../../../lib/user-notifications";

const messageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  attachmentIds: z.array(z.string()).max(5).optional(),
});

type RouteParams = {
  params: Promise<{ conversationId: string }>;
};

function canViewConversation(
  viewerUserId: string,
  viewerRole: "CLIENT" | "ATTORNEY",
  conversation: {
    client: { userId: string; firstName: string | null; lastName: string | null; phone: string | null } | null;
    attorney: { userId: string; firstName: string | null; lastName: string | null };
  },
) {
  if (viewerRole === "CLIENT") return conversation.client?.userId === viewerUserId;
  return conversation.attorney.userId === viewerUserId;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    void request;
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { conversationId } = await Promise.resolve(params);
    if (auth.role !== "CLIENT" && auth.role !== "ATTORNEY") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        client: { select: { userId: true, firstName: true, lastName: true, phone: true } },
        attorney: { select: { userId: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            senderRole: true,
            createdAt: true,
            attachments: {
              select: { id: true, fileName: true, url: true, mimeType: true, sizeBytes: true },
            },
          },
        },
        disclaimerAcceptances: {
          select: { userId: true, role: true, acceptedAt: true },
        },
        readStates: {
          select: { userId: true, role: true, lastReadAt: true, lastReadMessageId: true, lastSeenAt: true, updatedAt: true },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    if (!canViewConversation(auth.authUserId, auth.role, conversation)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const revealClient = canRevealClientIdentity(conversation.consultationAcceptedAt);
    const clientName = displayClientName(conversation.client ?? { firstName: null, lastName: null, phone: null }, revealClient);
    const clientPhone = displayClientPhone(conversation.client?.phone ?? null, revealClient);
    const attorneyName =
      `${conversation.attorney.firstName ?? ""} ${conversation.attorney.lastName ?? ""}`.trim() || "Attorney";

    const safety = await getConversationSafetyState({
      conversationId,
      viewerUserId: auth.authUserId,
    });

    const lastMessage = conversation.messages[conversation.messages.length - 1] ?? null;
    await prisma.conversationReadState.upsert({
      where: { conversationId_userId: { conversationId, userId: auth.authUserId } },
      update: {
        role: auth.role,
        lastSeenAt: new Date(),
        ...(lastMessage ? { lastReadAt: new Date(), lastReadMessageId: lastMessage.id } : {}),
      },
      create: {
        conversationId,
        userId: auth.authUserId,
        role: auth.role,
        lastSeenAt: new Date(),
        ...(lastMessage ? { lastReadAt: new Date(), lastReadMessageId: lastMessage.id } : {}),
      },
    }).catch(() => null);

    const viewerReadState = conversation.readStates.find((r) => r.userId === auth.authUserId) ?? null;
    const peerReadState = conversation.readStates.find((r) => r.userId !== auth.authUserId) ?? null;

    return NextResponse.json({
      ok: true,
      privacy: {
        revealClientIdentity: revealClient,
        clientName,
        clientPhone,
        attorneyName,
      },
      disclaimer: {
        text: PROFESSIONAL_DISCLAIMER,
        viewerAccepted: conversation.disclaimerAcceptances.some(
          (ack) => ack.userId === auth.authUserId && ack.role === auth.role,
        ),
      },
      safety: safety
        ? {
            conversationStatus: safety.conversationStatus,
            blockedByMe: safety.blockedByMe,
            blockedByPeer: safety.blockedByPeer,
            canSendMessages: safety.canSendMessages,
            myPendingReports: safety.myPendingReports,
            myBlacklistScope: safety.myBlacklistScope,
            peerBlacklistScope: safety.peerBlacklistScope,
            myBlacklistExpiresAt: safety.myBlacklistExpiresAt,
            peerBlacklistExpiresAt: safety.peerBlacklistExpiresAt,
          }
        : null,
      messages: conversation.messages,
      readReceipts: {
        viewer: viewerReadState,
        peer: peerReadState,
      },
    });
  } catch (error) {
    console.error("GET /api/conversations/[conversationId]/messages failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { conversationId } = await Promise.resolve(params);
    const json = await request.json();
    const parsed = messageSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        client: { select: { userId: true } },
        attorney: { select: { userId: true } },
        disclaimerAcceptances: { select: { userId: true, role: true } },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    if (auth.role !== "CLIENT" && auth.role !== "ATTORNEY") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (!canViewConversation(auth.authUserId, auth.role, {
      client: conversation.client ? { userId: conversation.client.userId, firstName: null, lastName: null, phone: null } : null,
      attorney: { userId: conversation.attorney.userId, firstName: null, lastName: null },
    })) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const accepted = conversation.disclaimerAcceptances.some(
      (ack) => ack.userId === auth.authUserId && ack.role === auth.role,
    );
    if (!accepted) {
      return NextResponse.json(
        { error: "Professional disclaimer must be accepted before messaging." },
        { status: 412 },
      );
    }

    const safety = await getConversationSafetyState({
      conversationId,
      viewerUserId: auth.authUserId,
    });
    if (!safety?.canSendMessages) {
      return NextResponse.json(
        {
          error: safety?.conversationStatus !== "OPEN"
            ? "Conversation is closed."
            : safety?.blockedByMe
              ? "You have blocked this user. Unblock before sending messages."
              : "You cannot send messages because the other party has blocked communication.",
        },
        { status: 423 },
      );
    }

    const senderRole = auth.role === "CLIENT" ? "CLIENT" : "ATTORNEY";
    const ruleHits = await evaluateContentRulesConfigured({
      scope: "CHAT_MESSAGE",
      text: parsed.data.body,
      actorUserId: auth.authUserId,
      conversationId,
      caseId: conversation.caseId,
      bidId: conversation.bidId,
    });
    const ruleSummary = summarizeRuleHits(ruleHits);
    if (ruleSummary.hasBlock) {
      await persistContentRuleHits({
        scope: "CHAT_MESSAGE",
        text: parsed.data.body,
        actorUserId: auth.authUserId,
        conversationId,
        caseId: conversation.caseId,
        bidId: conversation.bidId,
      }, ruleHits).catch(() => null);
      return NextResponse.json({ error: "消息内容触发平台规则，发送已拦截。", ruleWarnings: ruleSummary.warnings }, { status: 409 });
    }
    const message = await prisma.chatMessage.create({
      data: {
        conversationId,
        senderUserId: auth.authUserId,
        senderRole,
        body: parsed.data.body,
      },
      select: { id: true, createdAt: true },
    });

    // Link chat attachments to the newly created message
    if (parsed.data.attachmentIds && parsed.data.attachmentIds.length > 0) {
      await prisma.chatAttachment.updateMany({
        where: {
          id: { in: parsed.data.attachmentIds },
          conversationId,
          uploaderUserId: auth.authUserId,
          chatMessageId: null,
        },
        data: { chatMessageId: message.id },
      });
    }

    await prisma.conversationReadState.upsert({
      where: { conversationId_userId: { conversationId, userId: auth.authUserId } },
      update: {
        role: auth.role,
        lastSeenAt: new Date(),
        lastReadAt: new Date(),
        lastReadMessageId: message.id,
      },
      create: {
        conversationId,
        userId: auth.authUserId,
        role: auth.role,
        lastSeenAt: new Date(),
        lastReadAt: new Date(),
        lastReadMessageId: message.id,
      },
    }).catch(() => null);

    const recipientUserId = senderRole === "CLIENT" ? conversation.attorney.userId : (conversation.client?.userId ?? null);
    if (recipientUserId) {
      await createUserNotification({
        userId: recipientUserId,
        type: "SYSTEM_NOTICE",
        title: "你有新的会话消息",
        body: parsed.data.body.slice(0, 120),
        linkUrl: `/chat/${conversationId}`,
        metadata: { conversationId, caseId: conversation.caseId, bidId: conversation.bidId, senderRole },
      }).catch(() => null);
    }
    if (ruleHits.length) {
      await persistContentRuleHits({
        scope: "CHAT_MESSAGE",
        text: parsed.data.body,
        actorUserId: auth.authUserId,
        conversationId,
        caseId: conversation.caseId,
        bidId: conversation.bidId,
      }, ruleHits).catch(() => null);
    }

    return NextResponse.json({ ok: true, messageId: message.id, createdAt: message.createdAt, ruleWarnings: ruleSummary.warnings });
  } catch (error) {
    console.error("POST /api/conversations/[conversationId]/messages failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
