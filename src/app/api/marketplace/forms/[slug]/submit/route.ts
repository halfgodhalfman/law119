export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";

const submitSchema = z.object({
  formData: z.record(z.string()),
  sessionKey: z.string().max(64).optional(),
});

// POST /api/marketplace/forms/[slug]/submit — 提交表单数据，保存生成记录
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const template = await prisma.legalFormTemplate.findUnique({
      where: { slug, isActive: true },
      select: { id: true, isPremium: true },
    });

    if (!template) {
      return NextResponse.json({ ok: false, error: "模板未找到" }, { status: 404 });
    }

    const json = await request.json().catch(() => ({}));
    const parsed = submitSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "参数错误", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const auth = await requireAuthContext().catch(() => null);

    // 30天后过期
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const submission = await prisma.legalFormSubmission.create({
      data: {
        templateId: template.id,
        userId: auth?.authUserId ?? null,
        sessionKey: auth ? null : (parsed.data.sessionKey ?? null),
        formData: parsed.data.formData,
        status: "COMPLETED",
        expiresAt,
      },
      select: { id: true, createdAt: true },
    });

    // 异步增加使用计数
    void prisma.legalFormTemplate
      .update({ where: { id: template.id }, data: { useCount: { increment: 1 } } })
      .catch(() => null);

    return NextResponse.json({ ok: true, submissionId: submission.id });
  } catch (error) {
    console.error("POST /api/marketplace/forms/[slug]/submit failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
