export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/marketplace/forms/[slug] — 获取单个表单模板（含 config）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const template = await prisma.legalFormTemplate.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        slug: true,
        title: true,
        titleZh: true,
        description: true,
        descriptionZh: true,
        category: true,
        config: true,
        isPremium: true,
        isFeatured: true,
        estimatedMinutes: true,
        useCount: true,
      },
    });

    if (!template) {
      return NextResponse.json({ ok: false, error: "模板未找到" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, template });
  } catch (error) {
    console.error("GET /api/marketplace/forms/[slug] failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
