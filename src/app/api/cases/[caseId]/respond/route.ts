import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { requireAuthContext } from "../../../../../lib/auth-context";

const respondSchema = z.object({
  message: z.string().trim().min(10).max(1200),
});

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (!auth.attorneyProfileId || auth.role !== "ATTORNEY") {
      return NextResponse.json({ error: "Only attorneys can respond to cases." }, { status: 403 });
    }

    const { caseId } = await Promise.resolve(params);
    const json = await request.json();
    const parsed = respondSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const caseExists = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, status: true },
    });

    if (!caseExists) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    if (caseExists.status === "CLOSED" || caseExists.status === "CANCELLED") {
      return NextResponse.json({ error: "Case is not accepting responses." }, { status: 409 });
    }

    const bid = await prisma.bid.upsert({
      where: {
        caseId_attorneyProfileId: {
          caseId,
          attorneyProfileId: auth.attorneyProfileId,
        },
      },
      update: {
        message: parsed.data.message,
        status: "PENDING",
        contactedAt: new Date(),
      },
      create: {
        caseId,
        attorneyProfileId: auth.attorneyProfileId,
        message: parsed.data.message,
        status: "PENDING",
        contactedAt: new Date(),
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, bidId: bid.id });
  } catch (error) {
    console.error("POST /api/cases/[caseId]/respond failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
