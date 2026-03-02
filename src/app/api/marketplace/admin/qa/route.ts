export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

// GET /api/marketplace/admin/qa — 管理员查看问题/回答列表
export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? "questions"; // "questions" | "answers"
    const status = url.searchParams.get("status") ?? "";
    const q = (url.searchParams.get("q") ?? "").trim();
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = 20;

    if (type === "answers") {
      const where = {
        ...(status ? { status: status as "PUBLISHED" | "HIDDEN" | "DELETED" } : {}),
        ...(q ? { body: { contains: q, mode: "insensitive" as const } } : {}),
      };
      const [items, total] = await prisma.$transaction([
        prisma.qaAnswer.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            body: true,
            status: true,
            voteCount: true,
            isAccepted: true,
            adminNote: true,
            createdAt: true,
            question: { select: { id: true, title: true } },
            attorney: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.qaAnswer.count({ where }),
      ]);
      return NextResponse.json({ ok: true, items, total, page, pageSize });
    }

    // 默认返回 questions
    const where = {
      ...(status ? { status: status as "PUBLISHED" | "PENDING" | "HIDDEN" | "DELETED" } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { body: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.qaQuestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          stateCode: true,
          status: true,
          answerCount: true,
          viewCount: true,
          authorName: true,
          authorEmail: true,
          adminNote: true,
          createdAt: true,
        },
      }),
      prisma.qaQuestion.count({ where }),
    ]);
    return NextResponse.json({ ok: true, items, total, page, pageSize });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ ok: false, error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/qa failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["question", "answer"]),
  status: z.enum(["PUBLISHED", "HIDDEN", "DELETED"]).optional(),
  adminNote: z.string().max(500).optional(),
});

// PATCH /api/marketplace/admin/qa — 管理员审核/隐藏
export async function PATCH(request: Request) {
  try {
    await requireAdminAuth();
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "参数校验失败" }, { status: 400 });
    }

    const { id, type, status, adminNote } = parsed.data;
    const updateData = {
      ...(status ? { status } : {}),
      ...(adminNote !== undefined ? { adminNote } : {}),
    };

    if (type === "answer") {
      await prisma.qaAnswer.update({ where: { id }, data: updateData });
    } else {
      await prisma.qaQuestion.update({ where: { id }, data: updateData });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ ok: false, error: "Admin required." }, { status: 403 });
    }
    console.error("PATCH /api/marketplace/admin/qa failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
