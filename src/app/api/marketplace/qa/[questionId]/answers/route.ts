export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";

// GET /api/marketplace/qa/[questionId]/answers — 获取回答列表
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;

    const answers = await prisma.qaAnswer.findMany({
      where: { questionId, status: "PUBLISHED" },
      orderBy: [{ isAccepted: "desc" }, { voteCount: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        body: true,
        voteCount: true,
        isAccepted: true,
        createdAt: true,
        authorUserId: true,
        attorney: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isVerified: true,
            firmName: true,
            specialties: { select: { category: true } },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, items: answers });
  } catch (error) {
    console.error("GET /api/marketplace/qa/[questionId]/answers failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

const createAnswerSchema = z.object({
  body: z.string().trim().min(20, "回答至少20个字").max(10000, "回答最多10000个字"),
});

// POST /api/marketplace/qa/[questionId]/answers — 律师发布回答
export async function POST(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const auth = await requireAuthContext();

    // 仅律师或管理员可回答
    if (auth.role !== "ATTORNEY" && auth.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "仅律师账号可回答问题，请先完成律师认证。" },
        { status: 403 }
      );
    }

    // 律师须通过审核
    if (auth.role === "ATTORNEY" && auth.attorneyProfileId) {
      const profile = await prisma.attorneyProfile.findUnique({
        where: { id: auth.attorneyProfileId },
        select: { reviewStatus: true },
      });
      if (!profile || !["APPROVED", "RE_REVIEW_REQUIRED"].includes(profile.reviewStatus)) {
        return NextResponse.json(
          { ok: false, error: "律师资质尚未审核通过，暂不可回答问题。" },
          { status: 403 }
        );
      }
    }

    const question = await prisma.qaQuestion.findFirst({
      where: { id: questionId, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!question) {
      return NextResponse.json({ ok: false, error: "问题不存在" }, { status: 404 });
    }

    const parsed = createAnswerSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "参数校验失败", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 事务：创建回答 + 更新 answerCount
    const [answer] = await prisma.$transaction([
      prisma.qaAnswer.create({
        data: {
          questionId,
          authorUserId: auth.authUserId,
          attorneyProfileId: auth.attorneyProfileId ?? null,
          body: parsed.data.body,
          status: "PUBLISHED",
        },
        select: {
          id: true,
          questionId: true,
          body: true,
          voteCount: true,
          isAccepted: true,
          createdAt: true,
        },
      }),
      prisma.qaQuestion.update({
        where: { id: questionId },
        data: { answerCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ ok: true, answer });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "请先登录律师账号。" }, { status: 401 });
    }
    console.error("POST /api/marketplace/qa/[questionId]/answers failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
