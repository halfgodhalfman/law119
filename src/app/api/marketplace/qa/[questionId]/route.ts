export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/marketplace/qa/[questionId] — 公开问题详情
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;

    const question = await prisma.qaQuestion.findFirst({
      where: { id: questionId, status: "PUBLISHED" },
      select: {
        id: true,
        slug: true,
        title: true,
        body: true,
        category: true,
        stateCode: true,
        preferredLanguage: true,
        authorName: true,
        viewCount: true,
        answerCount: true,
        acceptedAnswerId: true,
        authorUserId: true,
        createdAt: true,
        updatedAt: true,
        answers: {
          where: { status: "PUBLISHED" },
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
                bio: true,
                specialties: { select: { category: true } },
                serviceAreas: { select: { stateCode: true }, take: 5 },
              },
            },
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ ok: false, error: "问题不存在" }, { status: 404 });
    }

    // 增加浏览计数（非阻塞）
    void prisma.qaQuestion
      .update({
        where: { id: question.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => null);

    return NextResponse.json({ ok: true, question });
  } catch (error) {
    console.error("GET /api/marketplace/qa/[questionId] failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
