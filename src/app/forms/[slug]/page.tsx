export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import { FormWizard } from "@/components/forms/form-wizard";
import type { FormConfig, FormTemplateDetail } from "@/types/legal-form";
import { FORM_TEMPLATES } from "@/lib/form-templates";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = FORM_TEMPLATES.find((f) => f.slug === slug);
  if (!t) return { title: "模板未找到" };
  return {
    title: `${t.titleZh} 在线生成 | Law119 免费法律文书`,
    description: t.descriptionZh,
    alternates: { canonical: `https://www.law119.com/forms/${slug}` },
  };
}

async function getTemplate(slug: string): Promise<FormTemplateDetail | null> {
  try {
    const t = await prisma.legalFormTemplate.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true, slug: true, title: true, titleZh: true,
        description: true, descriptionZh: true, category: true,
        config: true, isPremium: true, isFeatured: true,
        estimatedMinutes: true, useCount: true,
      },
    });
    if (!t) return null;
    return { ...t, config: t.config as unknown as FormConfig };
  } catch {
    // Fallback to static if DB not seeded
    const static_ = FORM_TEMPLATES.find((f) => f.slug === slug);
    if (!static_) return null;
    return {
      id: slug,
      slug: static_.slug,
      title: static_.title,
      titleZh: static_.titleZh,
      description: static_.description,
      descriptionZh: static_.descriptionZh,
      category: static_.category,
      config: static_.config,
      isPremium: false,
      isFeatured: static_.isFeatured,
      estimatedMinutes: static_.estimatedMinutes,
      useCount: 0,
    };
  }
}

export default async function FormWizardPage({ params }: Props) {
  const { slug } = await params;
  const template = await getTemplate(slug);
  if (!template) notFound();

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* 面包屑 */}
          <nav className="text-xs text-slate-500 mb-6 flex items-center gap-2">
            <Link href="/forms" className="hover:text-amber-400 transition-colors">法律文书</Link>
            <span>/</span>
            <span className="text-slate-400">{template.titleZh}</span>
          </nav>

          {/* 标题区 */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">{template.titleZh}</h1>
            <p className="text-slate-500 text-sm">{template.title}</p>
            <p className="text-slate-400 text-sm mt-2">{template.descriptionZh}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
              <span>⏱ 预计 {template.estimatedMinutes} 分钟完成</span>
              <span>📄 填写后可下载打印</span>
              <span>🌐 中英双语文书</span>
              {template.useCount > 0 && <span>👥 已有 {template.useCount.toLocaleString()} 人使用</span>}
            </div>
          </div>

          {/* 向导 */}
          <FormWizard template={template} />

          {/* 免责说明 */}
          <div className="mt-6 p-4 bg-slate-800/50 border border-slate-600/30 rounded-xl">
            <p className="text-slate-500 text-xs leading-relaxed">
              ⚠️ {template.config.document.disclaimerZh ?? "本文书模板仅供参考，不构成法律建议。"}
              {" "}如有复杂情形，建议
              <Link href="/qa" className="text-amber-400 hover:text-amber-300 mx-1">免费向律师提问</Link>
              或
              <Link href="/case/new" className="text-amber-400 hover:text-amber-300 mx-1">发布案件委托律师</Link>。
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
