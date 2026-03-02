export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import { QaQuestionCard } from "@/components/qa/qa-question-card";
import { CATEGORY_MAP, LEGAL_CATEGORIES, CategoryKey } from "@/lib/legal-categories";

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = CATEGORY_MAP[category.toUpperCase() as CategoryKey];
  if (!cat) return { title: "分类未找到" };
  return {
    title: `${cat.nameZh}法律问答 | Law119`,
    description: `专业律师解答${cat.nameZh}相关法律问题。${cat.description}`,
    alternates: {
      canonical: `https://www.law119.com/qa/category/${category.toLowerCase()}`,
    },
  };
}

const PAGE_SIZE = 20;

export default async function QaCategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const sp = await searchParams;
  const catKey = category.toUpperCase() as CategoryKey;
  const cat = CATEGORY_MAP[catKey];
  if (!cat) notFound();

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const where = {
    status: "PUBLISHED" as const,
    category: catKey as never,
  };

  const [questions, total] = await prisma.$transaction([
    prisma.qaQuestion.findMany({
      where,
      orderBy: [{ answerCount: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, slug: true, title: true, category: true, stateCode: true,
        authorName: true, viewCount: true, answerCount: true, acceptedAnswerId: true,
        preferredLanguage: true, createdAt: true,
      },
    }),
    prisma.qaQuestion.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-900">
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700 py-10">
          <div className="max-w-4xl mx-auto px-4">
            <nav className="text-xs text-slate-500 mb-4">
              <Link href="/qa" className="hover:text-amber-400 transition-colors">
                法律问答
              </Link>
              {" / "}
              <span>{cat.nameZh}</span>
            </nav>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{cat.emoji}</span>
              <div>
                <h1 className="text-2xl font-bold text-white">{cat.nameZh}法律问答</h1>
                <p className="text-slate-400 text-sm mt-1">{cat.description}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* 其他分类快速跳转 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {LEGAL_CATEGORIES.filter((c) => c.key !== catKey).map((c) => (
              <Link
                key={c.key}
                href={`/qa/category/${c.key.toLowerCase()}`}
                className="text-xs px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1"
              >
                {c.emoji} {c.nameZh}
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-medium">
              {total > 0 ? `共 ${total} 个问题` : "暂无问题"}
            </h2>
            <Link
              href={`/qa/ask`}
              className="text-sm px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
            >
              + 发布问题
            </Link>
          </div>

          {questions.length > 0 ? (
            <>
              <div className="space-y-3">
                {questions.map((q) => (
                  <QaQuestionCard key={q.id} question={q} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <Link
                        key={p}
                        href={`/qa/category/${category.toLowerCase()}?page=${p}`}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors ${
                          p === page
                            ? "bg-amber-600 text-white"
                            : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
                        }`}
                      >
                        {p}
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-400 mb-4">
                暂无 {cat.nameZh} 相关问题
              </p>
              <Link
                href="/qa/ask"
                className="inline-block px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
              >
                成为第一个提问者
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
