export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { headers } from "next/headers";
import { createHash } from "crypto";

const voteSchema = z.object({
  answerId: z.string().min(1),
  visitorKey: z.string().max(64).optional(),
});

// POST /api/marketplace/qa/votes — 投票（匿名+登录均可）
export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    const parsed = voteSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "参数校验失败" }, { status: 400 });
    }

    const { answerId, visitorKey: clientVisitorKey } = parsed.data;

    const answer = await prisma.qaAnswer.findFirst({
      where: { id: answerId, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!answer) {
      return NextResponse.json({ ok: false, error: "回答不存在" }, { status: 404 });
    }

    let visitorKey: string | null = null;
    if (!auth) {
      const headerStore = await headers();
      const ip = headerStore.get("x-forwarded-for") ?? "unknown";
      const ua = headerStore.get("user-agent") ?? "unknown";
      visitorKey =
        clientVisitorKey ??
        createHash("sha256")
          .update(`${ip}${ua}${answerId}`)
          .digest("hex")
          .slice(0, 64);
    }

    try {
      await prisma.$transaction([
        prisma.qaVote.create({
          data: {
            answerId,
            userId: auth?.authUserId ?? null,
            visitorKey: auth ? null : visitorKey,
            voteType: "HELPFUL",
          },
        }),
        prisma.qaAnswer.update({
          where: { id: answerId },
          data: { voteCount: { increment: 1 } },
        }),
      ]);
    } catch (e: unknown) {
      const prismaError = e as { code?: string };
      if (prismaError?.code === "P2002") {
        return NextResponse.json({ ok: false, error: "您已经投过票了。" }, { status: 409 });
      }
      throw e;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/marketplace/qa/votes failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
