export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuthContext } from "../../../../../lib/auth-context";

type RouteParams = {
  params: Promise<{ conversationId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    void request;
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (auth.role !== "CLIENT") {
      return NextResponse.json({ error: "Only clients can accept consultation." }, { status: 403 });
    }

    const { conversationId } = await Promise.resolve(params);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { client: { select: { userId: true } } },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    if (!conversation.client || conversation.client.userId !== auth.authUserId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.conversation.update({
        where: { id: conversationId },
        data: { consultationAcceptedAt: now },
      }),
      prisma.bid.update({
        where: { id: conversation.bidId },
        data: { status: "ACCEPTED" },
      }),
    ]);

    return NextResponse.json({ ok: true, consultationAcceptedAt: now.toISOString() });
  } catch (error) {
    console.error("POST /api/conversations/[conversationId]/accept-consultation failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
