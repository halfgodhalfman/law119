"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type MyCaseItem = {
  id: string;
  title: string;
  category: string;
  status: string;
  stateCode: string;
  city: string | null;
  quoteCount: number;
  descriptionMasked: string;
  createdAt: string;
  selectedBidId: string | null;
  lifecyclePhase?: "pending_quote" | "in_progress" | "completed" | "cancelled";
};

type MyCasesResponse = {
  items?: MyCaseItem[];
  filters?: {
    status: string | null;
    sort: string;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export default function MyCasesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [items, setItems] = useState<MyCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | "pending_quote" | "in_progress" | "completed">(
    () => {
      const v = searchParams.get("status");
      return v === "pending_quote" || v === "in_progress" || v === "completed" ? v : "";
    },
  );
  const [sort, setSort] = useState<"created_desc" | "updated_desc" | "quotes_desc" | "created_asc">(() => {
    const v = searchParams.get("sort");
    return v === "updated_desc" || v === "quotes_desc" || v === "created_asc" ? v : "created_desc";
  });
  const [page, setPage] = useState(() => Math.max(Number(searchParams.get("page") ?? "1") || 1, 1));
  const [pageSize, setPageSize] = useState(() => {
    const n = Number(searchParams.get("pageSize") ?? "10") || 10;
    return [10, 20, 50].includes(n) ? n : 10;
  });
  const [meta, setMeta] = useState<{ page: number; totalPages: number; total: number }>({ page: 1, totalPages: 1, total: 0 });
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [rowCopyMsg, setRowCopyMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    const next = new URLSearchParams();
    if (statusFilter) next.set("status", statusFilter);
    if (sort !== "created_desc") next.set("sort", sort);
    if (page > 1) next.set("page", String(page));
    if (pageSize !== 10) next.set("pageSize", String(pageSize));
    const nextQs = next.toString();
    const currentQs = searchParams.toString();
    if (nextQs !== currentQs) {
      router.replace(nextQs ? `${pathname}?${nextQs}` : pathname, { scroll: false });
    }
  }, [pathname, router, searchParams, statusFilter, sort, page, pageSize]);

  useEffect(() => {
    if (authLoading) return;
    if (viewer.user?.role !== "CLIENT" && viewer.user?.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    let canceled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    fetch(`/api/marketplace/my/cases?${params.toString()}`)
      .then(async (r) => {
        const data = (await r.json()) as MyCasesResponse & { error?: string };
        if (!r.ok) throw new Error(data.error || "Failed to load");
        return data;
      })
      .then((data) => {
        if (!canceled) {
          setItems(data.items ?? []);
          setMeta({
            page: data.filters?.page ?? 1,
            totalPages: data.filters?.totalPages ?? 1,
            total: data.filters?.total ?? 0,
          });
        }
      })
      .catch((e: unknown) => {
        if (!canceled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [authLoading, viewer.user?.role, statusFilter, sort, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sort, pageSize]);

  function resetFilters() {
    setStatusFilter("");
    setSort("created_desc");
    setPageSize(10);
    setPage(1);
  }

  async function copyFilterLink() {
    const url = `${window.location.origin}${pathname}${window.location.search}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyMsg("筛选链接已复制");
    } catch {
      setCopyMsg("复制失败，请手动复制地址栏链接");
    }
    setTimeout(() => setCopyMsg(null), 1500);
  }

  async function copyCaseShareLink(caseId: string) {
    const url = `${window.location.origin}/marketplace/cases/${caseId}`;
    try {
      await navigator.clipboard.writeText(url);
      setRowCopyMsg((m) => ({ ...m, [caseId]: "已复制链接" }));
    } catch {
      setRowCopyMsg((m) => ({ ...m, [caseId]: "复制失败" }));
    }
    setTimeout(() => {
      setRowCopyMsg((m) => {
        const next = { ...m };
        delete next[caseId];
        return next;
      });
    }, 1500);
  }

  async function copyCaseId(caseId: string) {
    try {
      await navigator.clipboard.writeText(caseId);
      setRowCopyMsg((m) => ({ ...m, [caseId]: "已复制案件ID" }));
    } catch {
      setRowCopyMsg((m) => ({ ...m, [caseId]: "复制失败" }));
    }
    setTimeout(() => {
      setRowCopyMsg((m) => {
        const next = { ...m };
        delete next[caseId];
        return next;
      });
    }, 1500);
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Marketplace MVP</p>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">My Cases / 我的案件</h1>
              <p className="text-sm text-slate-500 mt-2">发布方查看自己发布的案件、报价数量和进入选择页。</p>
            </div>
            <div className="flex gap-2">
              <Link href="/marketplace/post-case" className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-700">发布案件</Link>
              <Link href="/marketplace/case-hall" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">案件大厅</Link>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-600">状态筛选</label>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="">全部</option>
              <option value="pending_quote">待报价</option>
              <option value="in_progress">进行中</option>
              <option value="completed">已完成</option>
            </select>
            <label className="text-sm text-slate-600 ml-2">排序</label>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="created_desc">最新创建</option>
              <option value="updated_desc">最近更新</option>
              <option value="quotes_desc">报价数最多</option>
              <option value="created_asc">最早创建</option>
            </select>
            <label className="text-sm text-slate-600 ml-2">每页</label>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button
              type="button"
              onClick={copyFilterLink}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
            >
              复制筛选链接
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
            >
              重置筛选
            </button>
            {copyMsg && <span className="text-xs text-emerald-700">{copyMsg}</span>}
            <span className="text-sm text-slate-500">共 {meta.total} 条</span>
          </div>

          {!authLoading && viewer.user?.role !== "CLIENT" && viewer.user?.role !== "ADMIN" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              该页面仅发布方（CLIENT）可用。当前角色：{viewer.user?.role ?? "ANONYMOUS"}。
            </div>
          )}

          {loading && <p className="text-sm text-slate-500">加载我的案件中...</p>}
          {error && <p className="text-sm text-rose-700">加载失败：{error}</p>}

          <div className="grid gap-4 mt-4">
            {items.map((item) => (
              <article key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-xs rounded-full bg-slate-100 px-2 py-1">{item.category}</span>
                      <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-1">{item.status}</span>
                      {item.lifecyclePhase && (
                        <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">
                          {item.lifecyclePhase === "pending_quote"
                            ? "待报价"
                            : item.lifecyclePhase === "in_progress"
                              ? "进行中"
                              : item.lifecyclePhase === "completed"
                                ? "已完成"
                                : "已取消"}
                        </span>
                      )}
                      <span className="text-xs rounded-full bg-amber-100 text-amber-700 px-2 py-1">{item.quoteCount} 报价</span>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">{item.stateCode} {item.city ?? ""}</p>
                    <p className="text-sm text-slate-700 mt-3">{item.descriptionMasked}</p>
                    {item.selectedBidId && <p className="text-xs text-emerald-700 mt-2">已选报价：{item.selectedBidId}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href={`/marketplace/cases/${item.id}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 text-center">
                      案件详情
                    </Link>
                    <Link href={`/marketplace/cases/${item.id}/select`} className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-500 text-center">
                      选择报价
                    </Link>
                    <button
                      type="button"
                      onClick={() => copyCaseShareLink(item.id)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      复制案件链接
                    </button>
                    <button
                      type="button"
                      onClick={() => copyCaseId(item.id)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      复制案件ID
                    </button>
                    {rowCopyMsg[item.id] && (
                      <span className="text-xs text-emerald-700 text-center">{rowCopyMsg[item.id]}</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {!loading && !error && items.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
                {statusFilter || sort !== "created_desc" || page > 1 || pageSize !== 10 ? (
                  <>
                    当前筛选条件下没有结果。你可以
                    <button type="button" onClick={resetFilters} className="underline mx-1">
                      重置筛选
                    </button>
                    或
                    <Link href="/marketplace/post-case" className="underline ml-1">发布新案件</Link>。
                  </>
                ) : (
                  <>
                    你还没有发布案件。<Link href="/marketplace/post-case" className="underline">去发布一个测试案件</Link>。
                  </>
                )}
              </div>
            )}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              上一页
            </button>
            <p className="text-sm text-slate-500">第 {meta.page} / {meta.totalPages} 页</p>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
