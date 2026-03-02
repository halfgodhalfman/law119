export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import { QaQuestionCard } from "@/components/qa/qa-question-card";
import { QaCategoryFilter } from "@/components/qa/qa-category-filter";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "免费法律问答社区 | Law119 华人律师平台",
  description:
    "华人法律问答社区。移民绿卡、刑事辩护、家庭离婚、房产租赁、劳工权益……真实法律问题，专业认证律师免费解答。",
  alternates: { canonical: "https://www.law119.com/qa" },
};

interface Props {
  searchParams: Promise<{
    q?: string;
    category?: string;
    state?: string;
    sort?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

async function QaList({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const category = (sp.category ?? "").toUpperCase();
  const state = (sp.state ?? "").toUpperCase();
  const sort = sp.sort ?? "hot";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const LEGAL_CATS = [
    "IMMIGRATION","CRIMINAL","CIVIL","REAL_ESTATE","FAMILY",
    "BUSINESS","ESTATE_PLAN","LABOR","TAX","OTHER",
  ];

  const where = {
    status: "PUBLISHED" as const,
    ...(LEGAL_CATS.includes(category) ? { category: category as never } : {}),
    ...(state.length === 2 ? { stateCode: state } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { body: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
    ...(sort === "unanswered" ? { answerCount: 0 } : {}),
  };

  const orderBy =
    sort === "new"
      ? [{ createdAt: "desc" as const }]
      : [{ answerCount: "desc" as const }, { viewCount: "desc" as const }, { createdAt: "desc" as const }];

  const [questions, total] = await prisma.$transaction([
    prisma.qaQuestion.findMany({
      where,
      orderBy,
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

  if (questions.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-lg mb-2">暂无相关问题</p>
        <p className="text-slate-500 text-sm mb-6">成为第一个提问的人吧</p>
        <Link
          href="/qa/ask"
          className="inline-block px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition-colors"
        >
          发布问题
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {questions.map((q) => (
          <QaQuestionCard key={q.id} question={q} />
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1;
            const params = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
            params.set("page", String(p));
            return (
              <Link
                key={p}
                href={`/qa?${params.toString()}`}
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

      <p className="text-center text-slate-600 text-xs mt-4">
        共 {total} 个问题
      </p>
    </>
  );
}

export default async function QaIndexPage({ searchParams }: Props) {
  const sp = await searchParams;

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-900">
        {/* Hero */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700 py-10">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">
              免费法律问答
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              华人法律问答社区
            </h1>
            <p className="text-slate-400 text-sm max-w-xl mx-auto mb-6">
              发布您的法律问题，平台上的认证律师将免费解答。
              移民、刑事、家庭、房产、劳工等各类法律问题均可提问。
            </p>
            <Link
              href="/qa/ask"
              className="inline-block px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-amber-900/30"
            >
              免费发布问题 →
            </Link>
          </div>
        </div>

        {/* 内容区 */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-white font-semibold">法律问题</h2>
            {/* 搜索 */}
            <form method="GET" action="/qa" className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="搜索问题关键词..."
                className="flex-1 sm:w-64 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm transition-colors"
              >
                搜索
              </button>
            </form>
          </div>

          {/* 筛选器 */}
          <div className="mb-6">
            <Suspense>
              <QaCategoryFilter />
            </Suspense>
          </div>

          {/* 问题列表 */}
          <Suspense
            fallback={
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-5 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 rounded-lg bg-slate-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-700 rounded w-3/4" />
                        <div className="h-3 bg-slate-700 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          >
            <QaList searchParams={Promise.resolve(sp)} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
