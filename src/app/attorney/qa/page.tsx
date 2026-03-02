"use client";

import { useEffect, useState, useCallback } from "react";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import Link from "next/link";
import { CATEGORY_MAP } from "@/lib/legal-categories";

interface MyAnswer {
  id: string;
  body: string;
  voteCount: number;
  isAccepted: boolean;
  createdAt: string;
  question: { id: string; title: string; category: string; answerCount: number; viewCount: number };
}

export default function AttorneyQaPage() {
  const { viewer, loading } = useMarketplaceAuth();
  const [answers, setAnswers] = useState<MyAnswer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(false);

  const fetchAnswers = useCallback(async (p: number) => {
    setFetching(true);
    try {
      const res = await fetch(`/api/marketplace/qa/my-answers?page=${p}`);
      const data = await res.json();
      if (data.ok) {
        setAnswers(data.answers);
        setTotal(data.total);
      }
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!viewer.authenticated || viewer.user?.role !== "ATTORNEY") return;
    void fetchAnswers(page);
  }, [viewer, page, fetchAnswers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!viewer.authenticated || viewer.user?.role !== "ATTORNEY") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">请以律师账号登录</p>
          <Link
            href="/for-attorneys"
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-500 transition-colors"
          >
            律师入驻 / 登录
          </Link>
        </div>
      </div>
    );
  }

  const totalVotes = answers.reduce((sum, a) => sum + a.voteCount, 0);
  const totalAccepted = answers.filter((a) => a.isAccepted).length;
  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-white">我的问答回答</h1>
              <p className="text-slate-400 text-sm mt-1">
                您在 Q&amp;A 社区发布的专业回答，帮助华人用户解决法律问题
              </p>
            </div>
            <Link
              href="/qa"
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
            >
              浏览问题 → 去回答
            </Link>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "已回答", value: total },
              { label: "获得投票", value: totalVotes },
              { label: "最佳回答", value: totalAccepted },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{stat.value}</p>
                <p className="text-slate-500 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* 去回答问题的引导 */}
          <div className="bg-amber-950/30 border border-amber-600/30 rounded-xl p-5 mb-6">
            <h2 className="text-amber-400 font-medium mb-2">💡 为什么要在 Q&amp;A 回答问题？</h2>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• 展示专业能力，建立行业声誉</li>
              <li>• 免费获取潜在客户，问答页面 SEO 效果好</li>
              <li>• 获得「快速响应」和「专业口碑」徽章</li>
              <li>• 高质量回答可获推荐位展示</li>
            </ul>
            <Link
              href="/qa?sort=unanswered"
              className="inline-block mt-3 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
            >
              浏览待解答问题 →
            </Link>
          </div>

          {/* 回答列表 */}
          {fetching ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-5 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-slate-700 rounded w-full" />
                </div>
              ))}
            </div>
          ) : answers.length > 0 ? (
            <>
              <div className="space-y-3">
                {answers.map((answer) => {
                  const cat = CATEGORY_MAP[answer.question.category as keyof typeof CATEGORY_MAP];
                  return (
                    <div key={answer.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/qa/${answer.question.id}`}
                            className="text-white text-sm font-medium hover:text-amber-400 transition-colors line-clamp-1"
                          >
                            {answer.question.title}
                          </Link>
                          <p className="text-slate-500 text-xs line-clamp-2 mt-1">
                            {answer.body}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                            {cat && (
                              <span className="text-amber-400/70">
                                {cat.emoji} {cat.nameZh}
                              </span>
                            )}
                            <span>👍 {answer.voteCount} 有帮助</span>
                            <span>💬 {answer.question.answerCount} 回答</span>
                            <span>👁 {answer.question.viewCount} 浏览</span>
                            {answer.isAccepted && (
                              <span className="text-green-400 font-medium">✓ 最佳回答</span>
                            )}
                            <span>{new Date(answer.createdAt).toLocaleDateString("zh-CN")}</span>
                          </div>
                        </div>
                        <Link
                          href={`/qa/${answer.question.id}`}
                          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                          查看 →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`w-9 h-9 rounded-lg text-sm ${
                        page === i + 1
                          ? "bg-amber-600 text-white"
                          : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
              <p className="text-slate-400 mb-2">您还没有回答过问题</p>
              <p className="text-slate-500 text-sm mb-4">
                浏览法律问题，用您的专业知识帮助华人用户
              </p>
              <Link
                href="/qa"
                className="inline-block px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
              >
                去回答问题 →
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
