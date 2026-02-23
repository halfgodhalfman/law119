import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    await requireAdminAuth();
    const { conversationId } = await params;
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        bidId: true,
        caseId: true,
        clientProfileId: true,
        attorneyProfileId: true,
        status: true,
        consultationAcceptedAt: true,
        createdAt: true,
        updatedAt: true,
        case: { select: { id: true, title: true, status: true, category: true, stateCode: true } },
        bid: {
          select: {
            id: true,
            status: true,
            feeQuoteMin: true,
            feeQuoteMax: true,
            feeMode: true,
            version: true,
          },
        },
        client: { select: { id: true, firstName: true, lastName: true, user: { select: { id: true, email: true } } } },
        attorney: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isVerified: true,
            user: { select: { id: true, email: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            senderUserId: true,
            senderRole: true,
            body: true,
            createdAt: true,
          },
        },
        disclaimerAcceptances: {
          orderBy: { acceptedAt: "desc" },
          select: { id: true, userId: true, role: true, acceptedAt: true },
        },
      },
    });
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    return NextResponse.json({ ok: true, conversation });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/conversations/[conversationId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

