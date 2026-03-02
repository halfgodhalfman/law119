"use client";

import { useEffect, useState, useCallback } from "react";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { NavBar } from "@/components/ui/nav-bar";
import Link from "next/link";

type TabType = "questions" | "answers";
type QaStatus = "PUBLISHED" | "HIDDEN" | "DELETED";

interface QaQuestion {
  id: string;
  slug: string;
  title: string;
  category: string;
  stateCode: string | null;
  status: QaStatus;
  answerCount: number;
  viewCount: number;
  authorName: string;
  authorEmail: string | null;
  adminNote: string | null;
  createdAt: string;
}

interface QaAnswer {
  id: string;
  body: string;
  status: QaStatus;
  voteCount: number;
  isAccepted: boolean;
  adminNote: string | null;
  createdAt: string;
  question: { id: string; title: string };
  attorney: { firstName: string | null; lastName: string | null } | null;
}

const STATUS_LABELS: Record<QaStatus, { label: string; color: string }> = {
  PUBLISHED: { label: "已发布", color: "text-green-400" },
  HIDDEN:    { label: "已隐藏", color: "text-yellow-400" },
  DELETED:   { label: "已删除", color: "text-red-400" },
};

export default function AdminQaPage() {
  const { viewer, loading } = useMarketplaceAuth();
  const [tab, setTab] = useState<TabType>("questions");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<(QaQuestion | QaAnswer)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(false);

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams({
        type: tab,
        page: String(page),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { q: search } : {}),
      });
      const res = await fetch(`/api/marketplace/admin/qa?${params}`);
      const data = await res.json();
      if (data.ok) {
        setItems(data.items);
        setTotal(data.total);
      }
    } finally {
      setFetching(false);
    }
  }, [tab, page, statusFilter, search]);

  useEffect(() => {
    if (viewer.authenticated && viewer.user?.role === "ADMIN") {
      fetchData();
    }
  }, [viewer, fetchData]);

  const handleAction = async (
    id: string,
    type: "question" | "answer",
    status: QaStatus
  ) => {
    await fetch("/api/marketplace/admin/qa", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type, status }),
    });
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!viewer.authenticated || viewer.user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        无权限访问
      </div>
    );
  }

  const isQuestion = (item: QaQuestion | QaAnswer): item is QaQuestion =>
    "title" in item && "answerCount" in item;

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-white">Q&A 管理</h1>
              <p className="text-slate-400 text-sm mt-1">管理问答社区内容</p>
            </div>
            <Link
              href="/qa"
              target="_blank"
              className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              查看前台 →
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(["questions", "answers"] as TabType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  tab === t
                    ? "bg-amber-600 text-white"
                    : "bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600"
                }`}
              >
                {t === "questions" ? "问题" : "回答"}
              </button>
            ))}
          </div>

          {/* 过滤器 */}
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="搜索内容..."
              className="flex-1 max-w-xs bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">全部状态</option>
              <option value="PUBLISHED">已发布</option>
              <option value="HIDDEN">已隐藏</option>
              <option value="DELETED">已删除</option>
            </select>
            <button
              onClick={fetchData}
              className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm transition-colors"
            >
              刷新
            </button>
          </div>

          {/* 列表 */}
          {fetching ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-800 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const st = STATUS_LABELS[item.status];
                const itemIsQuestion = isQuestion(item);

                return (
                  <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {itemIsQuestion ? (
                          <Link
                            href={`/qa/${item.id}`}
                            target="_blank"
                            className="text-white text-sm font-medium hover:text-amber-400 transition-colors"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <>
                            <Link
                              href={`/qa/${(item as QaAnswer).question.id}`}
                              target="_blank"
                              className="text-slate-400 text-xs hover:text-amber-400 block truncate mb-1"
                            >
                              ↳ {(item as QaAnswer).question.title}
                            </Link>
                            <p className="text-white text-sm line-clamp-2">
                              {(item as QaAnswer).body}
                            </p>
                          </>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                          <span className={st.color}>{st.label}</span>
                          {itemIsQuestion && (
                            <>
                              <span>{item.answerCount} 回答</span>
                              <span>{item.viewCount} 浏览</span>
                              <span>提问：{item.authorName}</span>
                            </>
                          )}
                          {!itemIsQuestion && (
                            <>
                              <span>👍 {(item as QaAnswer).voteCount}</span>
                              {(item as QaAnswer).isAccepted && (
                                <span className="text-green-400">✓ 最佳</span>
                              )}
                              <span>
                                律师：
                                {(item as QaAnswer).attorney
                                  ? `${(item as QaAnswer).attorney?.firstName ?? ""} ${(item as QaAnswer).attorney?.lastName ?? ""}`
                                  : "—"}
                              </span>
                            </>
                          )}
                          <span>{new Date(item.createdAt).toLocaleDateString("zh-CN")}</span>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex gap-2 flex-shrink-0">
                        {item.status !== "PUBLISHED" && (
                          <button
                            onClick={() =>
                              handleAction(
                                item.id,
                                itemIsQuestion ? "question" : "answer",
                                "PUBLISHED"
                              )
                            }
                            className="text-xs px-2.5 py-1 rounded bg-green-900/40 text-green-400 hover:bg-green-800/40 border border-green-600/30 transition-colors"
                          >
                            发布
                          </button>
                        )}
                        {item.status !== "HIDDEN" && (
                          <button
                            onClick={() =>
                              handleAction(
                                item.id,
                                itemIsQuestion ? "question" : "answer",
                                "HIDDEN"
                              )
                            }
                            className="text-xs px-2.5 py-1 rounded bg-yellow-900/40 text-yellow-400 hover:bg-yellow-800/40 border border-yellow-600/30 transition-colors"
                          >
                            隐藏
                          </button>
                        )}
                        {item.status !== "DELETED" && (
                          <button
                            onClick={() =>
                              handleAction(
                                item.id,
                                itemIsQuestion ? "question" : "answer",
                                "DELETED"
                              )
                            }
                            className="text-xs px-2.5 py-1 rounded bg-red-900/40 text-red-400 hover:bg-red-800/40 border border-red-600/30 transition-colors"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div className="text-center py-12 text-slate-500">暂无数据</div>
              )}
            </div>
          )}

          {/* 分页 */}
          {Math.ceil(total / 20) > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: Math.min(Math.ceil(total / 20), 7) }, (_, i) => (
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
        </div>
      </main>
    </>
  );
}
