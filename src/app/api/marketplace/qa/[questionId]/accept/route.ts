export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";

const acceptSchema = z.object({
  answerId: z.string().min(1),
});

// POST /api/marketplace/qa/[questionId]/accept — 标记最佳回答
export async function POST(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const auth = await requireAuthContext();

    const question = await prisma.qaQuestion.findFirst({
      where: { id: questionId, status: "PUBLISHED" },
      select: { id: true, authorUserId: true },
    });
    if (!question) {
      return NextResponse.json({ ok: false, error: "问题不存在" }, { status: 404 });
    }

    // 仅问题作者或管理员可标记最佳回答
    if (auth.role !== "ADMIN" && question.authorUserId !== auth.authUserId) {
      return NextResponse.json({ ok: false, error: "无权限操作。" }, { status: 403 });
    }

    const parsed = acceptSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "参数校验失败" }, { status: 400 });
    }

    const { answerId } = parsed.data;

    await prisma.$transaction([
      prisma.qaAnswer.updateMany({
        where: { questionId, isAccepted: true },
        data: { isAccepted: false },
      }),
      prisma.qaAnswer.update({
        where: { id: answerId },
        data: { isAccepted: true },
      }),
      prisma.qaQuestion.update({
        where: { id: questionId },
        data: { acceptedAnswerId: answerId },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "请先登录。" }, { status: 401 });
    }
    console.error("POST /api/marketplace/qa/[questionId]/accept failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
