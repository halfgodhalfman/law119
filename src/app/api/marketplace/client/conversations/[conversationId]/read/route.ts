import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "CLIENT" || !auth.clientProfileId) {
      return NextResponse.json({ error: "Client login required." }, { status: 401 });
    }

    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, clientProfileId: auth.clientProfileId },
      select: {
        id: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, createdAt: true },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const latest = conversation.messages[0] ?? null;
    const now = new Date();

    await prisma.conversationReadState.upsert({
      where: { conversationId_userId: { conversationId: conversation.id, userId: auth.authUserId } },
      create: {
        conversationId: conversation.id,
        userId: auth.authUserId,
        role: "CLIENT",
        lastSeenAt: now,
        lastReadAt: latest ? new Date(latest.createdAt) : now,
        lastReadMessageId: latest?.id ?? null,
      },
      update: {
        lastSeenAt: now,
        lastReadAt: latest ? new Date(latest.createdAt) : now,
        lastReadMessageId: latest?.id ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      conversationId,
      readAt: latest ? latest.createdAt : now.toISOString(),
      lastReadMessageId: latest?.id ?? null,
    });
  } catch (error) {
    console.error("POST /api/marketplace/client/conversations/[conversationId]/read failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
