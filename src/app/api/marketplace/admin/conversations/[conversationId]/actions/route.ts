export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const auth = await requireAdminAuth();
    const { conversationId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: "close" | "reopen" | "mark_complaint" | "clear_flags";
      reason?: string;
    };
    if (!body.action) return NextResponse.json({ error: "Missing action." }, { status: 400 });

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, status: true },
    });
    if (!conv) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    if (body.action === "close" || body.action === "reopen") {
      const updated = await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: body.action === "close" ? "CLOSED" : "OPEN" },
        select: { id: true, status: true, updatedAt: true },
      });
      await prisma.chatMessage.create({
        data: {
          conversationId,
          senderRole: "SYSTEM",
          senderUserId: auth.authUserId,
          body: `[ADMIN_FLAG:${body.action === "close" ? "CLOSED" : "REOPENED"}] ${body.reason?.trim() || ""}`.trim(),
        },
      });
      return NextResponse.json({ ok: true, conversation: updated });
    }

    const marker =
      body.action === "mark_complaint"
        ? "[ADMIN_FLAG:COMPLAINT]"
        : "[ADMIN_FLAG:CLEARED]";
    await prisma.chatMessage.create({
      data: {
        conversationId,
        senderRole: "SYSTEM",
        senderUserId: auth.authUserId,
        body: `${marker} ${body.reason?.trim() || ""}`.trim(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("POST /api/marketplace/admin/conversations/[conversationId]/actions failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

