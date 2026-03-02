export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { generateQaSlug } from "@/lib/qa-slug";

const LEGAL_CATEGORIES = [
  "IMMIGRATION", "CRIMINAL", "CIVIL", "REAL_ESTATE", "FAMILY",
  "BUSINESS", "ESTATE_PLAN", "LABOR", "TAX", "OTHER",
] as const;

// GET /api/marketplace/qa — 公开问题列表（分页/筛选/搜索）
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(50, parseInt(url.searchParams.get("pageSize") ?? "20", 10));
    const q = (url.searchParams.get("q") ?? "").trim();
    const category = (url.searchParams.get("category") ?? "").toUpperCase();
    const state = (url.searchParams.get("state") ?? "").toUpperCase();
    const sort = url.searchParams.get("sort") ?? "hot"; // hot | new | unanswered

    const where: Record<string, unknown> = {
      status: "PUBLISHED",
      ...(LEGAL_CATEGORIES.includes(category as (typeof LEGAL_CATEGORIES)[number])
        ? { category: category as (typeof LEGAL_CATEGORIES)[number] }
        : {}),
      ...(state.length === 2 ? { stateCode: state } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(sort === "unanswered" ? { answerCount: 0 } : {}),
    };

    const orderBy =
      sort === "new"
        ? [{ createdAt: "desc" as const }]
        : [{ answerCount: "desc" as const }, { viewCount: "desc" as const }, { createdAt: "desc" as const }];

    const [items, total] = await prisma.$transaction([
      prisma.qaQuestion.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          stateCode: true,
          preferredLanguage: true,
          authorName: true,
          viewCount: true,
          answerCount: true,
          acceptedAnswerId: true,
          createdAt: true,
        },
      }),
      prisma.qaQuestion.count({ where }),
    ]);

    return NextResponse.json({ ok: true, items, total, page, pageSize });
  } catch (error) {
    console.error("GET /api/marketplace/qa failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

const createQuestionSchema = z.object({
  title: z.string().trim().min(5, "标题至少5个字").max(200, "标题最多200个字"),
  body: z.string().trim().min(20, "问题描述至少20个字").max(5000, "问题描述最多5000个字"),
  category: z.enum(LEGAL_CATEGORIES, { errorMap: () => ({ message: "请选择法律类别" }) }),
  stateCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "请输入2位州代码")
    .transform((v) => v.toUpperCase())
    .optional(),
  preferredLanguage: z.enum(["MANDARIN", "CANTONESE", "ENGLISH"]).default("MANDARIN"),
  authorName: z.string().trim().max(80).default("匿名用户"),
  authorEmail: z.string().trim().email("邮箱格式不正确").optional().or(z.literal("")),
});

// POST /api/marketplace/qa — 发布问题（匿名可用）
export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);

    // 律师不可发布问题
    if (auth?.role === "ATTORNEY") {
      return NextResponse.json(
        { ok: false, error: "律师账号请直接回答问题，不可发布问题。" },
        { status: 403 }
      );
    }

    const json = await request.json().catch(() => ({}));
    const parsed = createQuestionSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "参数校验失败", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const slug = await generateQaSlug(d.title, d.category, d.stateCode);

    const question = await prisma.qaQuestion.create({
      data: {
        slug,
        title: d.title,
        body: d.body,
        category: d.category,
        stateCode: d.stateCode ?? null,
        preferredLanguage: d.preferredLanguage,
        authorName: auth ? undefined : d.authorName,
        authorUserId: auth?.authUserId ?? null,
        authorEmail: d.authorEmail || null,
        status: "PUBLISHED",
      },
      select: { id: true, slug: true, title: true, category: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, question });
  } catch (error) {
    console.error("POST /api/marketplace/qa failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
