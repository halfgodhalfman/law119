export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { renderSafeTemplate, sanitizeHtml } from "@/lib/html-sanitize";
import type { FormConfig, FormData as LegalFormData } from "@/types/legal-form";

/**
 * 修复 #10: 使用完整 HTML 转义替换原来只转义 < > 的不安全实现
 * 修复 #11: 服务端渲染前先 sanitizeHtml 净化模板，防止模板本身被污染
 */
function renderTemplate(htmlContent: string, formData: LegalFormData): string {
  const now = new Date();
  const currentDate = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 第一步：净化模板本身（防止模板 HTML 被污染）
  const cleanTemplate = sanitizeHtml(htmlContent);

  // 第二步：添加系统变量（不需要转义，系统生成的安全值）
  let rendered = cleanTemplate
    .replace(/\{\{current_date\}\}/g, escapeForTemplate(currentDate))
    .replace(/\{\{generated_date\}\}/g, escapeForTemplate(now.toISOString().split("T")[0]));

  // 第三步：使用完整转义替换用户输入字段（修复 #10）
  rendered = renderSafeTemplate(rendered, formData as Record<string, unknown>);

  // 第四步：移除未匹配的占位符（选填字段留空）
  rendered = rendered.replace(/\{\{[^}]+\}\}/g, "");

  // 第五步：处理条件块 {{#field}}...{{/field}}（内容已提前转义，安全）
  rendered = rendered.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, key, content) => {
      const val = (formData as Record<string, unknown>)[key];
      return val && String(val).trim() ? content : "";
    }
  );

  return rendered;
}

/** 系统生成值的轻量转义（仅防 < >，不需要全量转义） */
function escapeForTemplate(str: string): string {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// GET /api/marketplace/forms/submissions/[id] — 获取提交记录及渲染后的文书 HTML
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const submission = await prisma.legalFormSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        formData: true,
        sessionKey: true,
        userId: true,
        createdAt: true,
        expiresAt: true,
        template: {
          select: {
            slug: true,
            title: true,
            titleZh: true,
            config: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ ok: false, error: "记录未找到" }, { status: 404 });
    }

    // 修复 #16: Session Key 不再从 URL query 参数读取
    // 改为从请求头 X-Session-Key 读取，防止泄露到浏览器历史/日志/Referer
    const auth = await requireAuthContext().catch(() => null);
    const sessionKey = request.headers.get("x-session-key") ?? "";

    const isOwner =
      (auth && submission.userId === auth.authUserId) ||
      (submission.sessionKey && sessionKey === submission.sessionKey) ||
      auth?.role === "ADMIN";

    if (!isOwner) {
      return NextResponse.json({ ok: false, error: "无访问权限" }, { status: 403 });
    }

    // 是否已过期
    if (new Date() > submission.expiresAt) {
      return NextResponse.json({ ok: false, error: "记录已过期（30天）" }, { status: 410 });
    }

    const config = submission.template.config as unknown as FormConfig;
    const formData = submission.formData as LegalFormData;
    const renderedHtml = renderTemplate(config.document.htmlContent, formData);

    return NextResponse.json({
      ok: true,
      submission: {
        id: submission.id,
        createdAt: submission.createdAt,
        expiresAt: submission.expiresAt,
        template: {
          slug: submission.template.slug,
          title: submission.template.title,
          titleZh: submission.template.titleZh,
          disclaimer: config.document.disclaimer,
          disclaimerZh: config.document.disclaimerZh,
        },
        formData,
        renderedHtml,
      },
    });
  } catch (error) {
    console.error("GET /api/marketplace/forms/submissions/[id] failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
