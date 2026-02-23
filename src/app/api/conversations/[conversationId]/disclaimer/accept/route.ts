import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuthContext } from "../../../../../../lib/auth-context";

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
    const { conversationId } = await Promise.resolve(params);
    if (auth.role !== "CLIENT" && auth.role !== "ATTORNEY") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        client: { select: { userId: true } },
        attorney: { select: { userId: true } },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const isAllowed =
      (auth.role === "CLIENT" && conversation.client?.userId === auth.authUserId) ||
      (auth.role === "ATTORNEY" && conversation.attorney.userId === auth.authUserId);
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await prisma.disclaimerAcceptance.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: auth.authUserId,
        },
      },
      update: {
        role: auth.role,
        acceptedAt: new Date(),
      },
      create: {
        conversationId,
        userId: auth.authUserId,
        role: auth.role,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/conversations/[conversationId]/disclaimer/accept failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
