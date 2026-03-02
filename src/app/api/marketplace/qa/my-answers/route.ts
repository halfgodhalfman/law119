export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";

// GET /api/marketplace/qa/my-answers — 律师获取自己发布的所有回答
export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) {
      return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
    }
    if (auth.role !== "ATTORNEY" && auth.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "仅律师可访问" }, { status: 403 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = 20;

    const where = {
      authorUserId: auth.authUserId,
      status: "PUBLISHED" as const,
    };

    const [answers, total] = await prisma.$transaction([
      prisma.qaAnswer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          body: true,
          voteCount: true,
          isAccepted: true,
          createdAt: true,
          question: {
            select: { id: true, title: true, category: true, answerCount: true, viewCount: true },
          },
        },
      }),
      prisma.qaAnswer.count({ where }),
    ]);

    return NextResponse.json({ ok: true, answers, total, page, pageSize });
  } catch (error) {
    console.error("GET /api/marketplace/qa/my-answers failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
