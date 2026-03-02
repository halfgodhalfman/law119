export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FORM_TEMPLATES } from "@/lib/form-templates";

// POST /api/marketplace/forms/seed — 初始化模板数据（仅管理员，一次性）
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("action") !== "seed") {
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  }

  let upserted = 0;
  for (const t of FORM_TEMPLATES) {
    await prisma.legalFormTemplate.upsert({
      where: { slug: t.slug },
      update: {
        title: t.title,
        titleZh: t.titleZh,
        description: t.description,
        descriptionZh: t.descriptionZh,
        category: t.category as never,
        config: t.config as never,
        isFeatured: t.isFeatured,
        estimatedMinutes: t.estimatedMinutes,
        sortOrder: t.sortOrder,
        isActive: true,
      },
      create: {
        slug: t.slug,
        title: t.title,
        titleZh: t.titleZh,
        description: t.description,
        descriptionZh: t.descriptionZh,
        category: t.category as never,
        config: t.config as never,
        isFeatured: t.isFeatured,
        estimatedMinutes: t.estimatedMinutes,
        sortOrder: t.sortOrder,
        isActive: true,
      },
    });
    upserted++;
  }

  return NextResponse.json({ ok: true, upserted });
}

// GET /api/marketplace/forms — 获取模板列表
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category")?.toUpperCase();
    const featured = url.searchParams.get("featured") === "true";

    const templates = await prisma.legalFormTemplate.findMany({
      where: {
        isActive: true,
        ...(category ? { category: category as never } : {}),
        ...(featured ? { isFeatured: true } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { useCount: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        titleZh: true,
        description: true,
        descriptionZh: true,
        category: true,
        isPremium: true,
        isFeatured: true,
        estimatedMinutes: true,
        useCount: true,
      },
    });

    return NextResponse.json({ ok: true, templates });
  } catch (error) {
    console.error("GET /api/marketplace/forms failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
