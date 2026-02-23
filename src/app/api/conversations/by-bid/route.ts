import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { requireAuthContext } from "../../../../lib/auth-context";

const schema = z.object({
  bidId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const json = await request.json();
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const bid = await prisma.bid.findUnique({
      where: { id: parsed.data.bidId },
      include: { case: { select: { id: true, clientProfileId: true } } },
    });

    if (!bid) {
      return NextResponse.json({ error: "Bid not found." }, { status: 404 });
    }

    const isAllowed =
      (auth.role === "ATTORNEY" && auth.attorneyProfileId === bid.attorneyProfileId) ||
      (auth.role === "CLIENT" && auth.clientProfileId === bid.case.clientProfileId);
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const existing = await prisma.conversation.findUnique({
      where: { bidId: parsed.data.bidId },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ ok: true, conversationId: existing.id });
    }

    const conversation = await prisma.conversation.create({
      data: {
        bidId: bid.id,
        caseId: bid.case.id,
        clientProfileId: bid.case.clientProfileId,
        attorneyProfileId: bid.attorneyProfileId,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, conversationId: conversation.id });
  } catch (error) {
    console.error("POST /api/conversations/by-bid failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
