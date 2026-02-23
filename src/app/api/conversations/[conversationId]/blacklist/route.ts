import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "../../../../../lib/auth-context";
import { prisma } from "../../../../../lib/prisma";
import { getConversationParticipants, getConversationSafetyState } from "../../../../../lib/conversation-safety";

const schema = z.object({
  action: z.enum(["block", "unblock"]),
  scope: z.enum(["CONVERSATION", "GLOBAL"]).optional(),
  duration: z.enum(["PERMANENT", "24H", "7D"]).optional(),
  reason: z.string().trim().max(500).optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || (auth.role !== "CLIENT" && auth.role !== "ATTORNEY")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { conversationId } = await params;
    const safety = await getConversationSafetyState({ conversationId, viewerUserId: auth.authUserId });
    if (!safety) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    return NextResponse.json({ ok: true, safety });
  } catch (error) {
    console.error("GET /api/conversations/[conversationId]/blacklist failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || (auth.role !== "CLIENT" && auth.role !== "ATTORNEY")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { conversationId } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const conversation = await getConversationParticipants(conversationId);
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    const viewerIsClient = auth.role === "CLIENT" && conversation.client?.userId === auth.authUserId;
    const viewerIsAttorney = auth.role === "ATTORNEY" && conversation.attorney.userId === auth.authUserId;
    if (!viewerIsClient && !viewerIsAttorney) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const peerUserId = viewerIsClient ? conversation.attorney.userId : conversation.client?.userId ?? null;
    if (!peerUserId) {
      return NextResponse.json({ error: "Peer user not available for blacklist." }, { status: 400 });
    }

    if (parsed.data.action === "block") {
      const scope = parsed.data.scope ?? "CONVERSATION";
      const duration = parsed.data.duration ?? "PERMANENT";
      const expiresAt =
        duration === "24H"
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : duration === "7D"
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            : null;
      const entry = await prisma.userBlacklist.upsert({
        where: { blockerUserId_blockedUserId: { blockerUserId: auth.authUserId, blockedUserId: peerUserId } },
        update: {
          active: true,
          scope,
          reason: parsed.data.reason || null,
          expiresAt,
          conversationId: scope === "CONVERSATION" ? conversationId : null,
          deactivatedAt: null,
          deactivatedByUserId: null,
        },
        create: {
          blockerUserId: auth.authUserId,
          blockedUserId: peerUserId,
          conversationId: scope === "CONVERSATION" ? conversationId : null,
          scope,
          active: true,
          expiresAt,
          reason: parsed.data.reason || null,
        },
        select: { id: true, active: true, updatedAt: true, expiresAt: true },
      });
      await prisma.chatMessage.create({
        data: {
          conversationId,
          senderRole: "SYSTEM",
          senderUserId: auth.authUserId,
          body: `[PLATFORM_NOTICE] 你已将对方加入黑名单（${scope === "GLOBAL" ? "全平台" : "仅本会话"}，${duration === "PERMANENT" ? "永久" : duration === "24H" ? "24小时" : "7天"}），双方消息发送将被暂停（仅你可解除）。`,
        },
      }).catch(() => null);
      return NextResponse.json({ ok: true, blacklist: entry, action: "block" });
    }

    const entry = await prisma.userBlacklist.findUnique({
      where: { blockerUserId_blockedUserId: { blockerUserId: auth.authUserId, blockedUserId: peerUserId } },
      select: { id: true },
    });
    if (!entry) return NextResponse.json({ error: "Blacklist entry not found." }, { status: 404 });

    const updated = await prisma.userBlacklist.update({
      where: { id: entry.id },
      data: {
        active: false,
        deactivatedAt: new Date(),
        deactivatedByUserId: auth.authUserId,
      },
      select: { id: true, active: true, updatedAt: true, expiresAt: true },
    });
    await prisma.chatMessage.create({
      data: {
        conversationId,
        senderRole: "SYSTEM",
        senderUserId: auth.authUserId,
        body: "[PLATFORM_NOTICE] 黑名单已解除，可恢复发送消息。",
      },
    }).catch(() => null);
    return NextResponse.json({ ok: true, blacklist: updated, action: "unblock" });
  } catch (error) {
    console.error("POST /api/conversations/[conversationId]/blacklist failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
