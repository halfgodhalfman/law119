export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import { CATEGORY_MAP } from "@/lib/legal-categories";
import { FORM_TEMPLATES } from "@/lib/form-templates";

export const metadata: Metadata = {
  title: "DIY 法律文书模板 | 免费下载 | Law119",
  description: "免费生成车辆买卖协议、借据、催款函、租约终止通知、NDA等常用法律文书。中英双语，填写即可下载打印。",
  alternates: { canonical: "https://www.law119.com/forms" },
};

const CATEGORY_LABELS: Record<string, { emoji: string; label: string }> = {
  CIVIL: { emoji: "⚖️", label: "民事" },
  BUSINESS: { emoji: "🏢", label: "商业" },
  REAL_ESTATE: { emoji: "🏠", label: "房产" },
  IMMIGRATION: { emoji: "✈️", label: "移民" },
  FAMILY: { emoji: "👨‍👩‍👧", label: "家庭" },
  LABOR: { emoji: "💼", label: "劳工" },
};

async function getTemplates() {
  try {
    return await prisma.legalFormTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { useCount: "desc" }],
      select: {
        id: true, slug: true, title: true, titleZh: true,
        description: true, descriptionZh: true, category: true,
        isPremium: true, isFeatured: true, estimatedMinutes: true, useCount: true,
      },
    });
  } catch {
    // DB 可能还没有数据，返回静态数据
    return FORM_TEMPLATES.map((t, i) => ({
      id: String(i),
      slug: t.slug,
      title: t.title,
      titleZh: t.titleZh,
      description: t.description,
      descriptionZh: t.descriptionZh,
      category: t.category,
      isPremium: false,
      isFeatured: t.isFeatured,
      estimatedMinutes: t.estimatedMinutes,
      useCount: 0,
    }));
  }
}

export default async function FormsPage() {
  const templates = await getTemplates();
  const featured = templates.filter((t) => t.isFeatured);
  const all = templates;

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-900">
        {/* Hero */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700 py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/40 border border-amber-600/30 text-amber-400 text-xs font-medium mb-4">
              📄 免费 · 无需注册 · 中英双语
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              DIY 法律文书生成
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-2xl mx-auto">
              填写表单即可生成专业法律文书，打印签名后即具法律效力。<br />
              涵盖车辆买卖、借据、催款函、租约等华人常用场景。
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-10">
          {/* 免责说明 */}
          <div className="bg-slate-800/50 border border-slate-600/50 rounded-xl p-4 mb-8 flex gap-3">
            <span className="text-amber-400 flex-shrink-0 text-lg">⚠️</span>
            <p className="text-slate-400 text-xs leading-relaxed">
              本平台提供的文书模板仅供一般参考，不构成法律建议。各州法律存在差异，
              对于复杂或高价值事务，强烈建议先咨询执牌律师。
              <Link href="/qa" className="text-amber-400 hover:text-amber-300 ml-1 underline">
                有疑问可免费问答律师 →
              </Link>
            </p>
          </div>

          {/* 精选模板 */}
          {featured.length > 0 && (
            <section className="mb-10">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span className="h-4 w-1 bg-amber-500 rounded-full" />
                精选常用文书
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {featured.map((t) => {
                  const cat = CATEGORY_MAP[t.category as keyof typeof CATEGORY_MAP];
                  const catLabel = CATEGORY_LABELS[t.category];
                  return (
                    <Link
                      key={t.slug}
                      href={`/forms/${t.slug}`}
                      className="group bg-slate-800 border border-slate-700 hover:border-amber-600/50 rounded-xl p-5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="text-white font-medium text-sm group-hover:text-amber-400 transition-colors">
                            {t.titleZh}
                          </h3>
                          <p className="text-slate-500 text-xs mt-0.5">{t.title}</p>
                        </div>
                        {cat && (
                          <span className="flex-shrink-0 text-xl">{catLabel?.emoji ?? cat.emoji}</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 mb-3">
                        {t.descriptionZh}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>⏱ 约 {t.estimatedMinutes} 分钟</span>
                        {t.useCount > 0 && <span>📊 {t.useCount.toLocaleString()} 次使用</span>}
                        <span className="ml-auto text-amber-500 font-medium group-hover:translate-x-0.5 transition-transform">
                          开始填写 →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* 全部模板 */}
          <section>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="h-4 w-1 bg-slate-500 rounded-full" />
              全部文书模板（{all.length}）
            </h2>
            <div className="space-y-2">
              {all.map((t) => {
                const catLabel = CATEGORY_LABELS[t.category];
                return (
                  <Link
                    key={t.slug}
                    href={`/forms/${t.slug}`}
                    className="group flex items-center justify-between gap-4 bg-slate-800 border border-slate-700 hover:border-amber-600/40 rounded-xl px-4 py-3.5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl flex-shrink-0">{catLabel?.emoji ?? "📄"}</span>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium group-hover:text-amber-400 transition-colors truncate">
                          {t.titleZh}
                          <span className="text-slate-500 font-normal ml-2 text-xs">{t.title}</span>
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{t.descriptionZh}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-slate-500 hidden sm:block">⏱ {t.estimatedMinutes}分钟</span>
                      {t.isPremium && (
                        <span className="text-xs bg-amber-900/40 text-amber-400 border border-amber-600/30 px-2 py-0.5 rounded-full">
                          付费
                        </span>
                      )}
                      <span className="text-amber-500 text-sm">→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* CTA：复杂情况引导 */}
          <div className="mt-10 bg-gradient-to-br from-amber-950/40 to-slate-800 border border-amber-600/30 rounded-xl p-6 text-center">
            <p className="text-white font-medium mb-1">情况比较复杂？</p>
            <p className="text-slate-400 text-sm mb-4">
              对于纠纷、诉讼或高价值交易，建议寻求律师的专业帮助。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/qa"
                className="px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
              >
                免费法律问答
              </Link>
              <Link
                href="/case/new"
                className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
              >
                发布案件，匹配专业律师 →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
