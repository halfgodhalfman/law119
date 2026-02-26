"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type MyBidItem = {
  id: string;
  status: string;
  priceMin: string | number | null;
  priceMax: string | number | null;
  proposalText: string;
  version?: number;
  versionCount?: number;
  latestVersionAt?: string | null;
  updatedAt: string;
  case: {
    id: string;
    title: string;
    category: string;
    stateCode: string;
    city: string | null;
    caseStatus: string;
    descriptionMasked: string;
  };
};

type MyBidsResponse = {
  items?: MyBidItem[];
  filters?: {
    status: string | null;
    sort: string;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary?: {
    todo: number;
    withdrawn: number;
    selected: number;
    ended: number;
    recentTodo7d?: number;
    previousTodo7d?: number;
    recentTodoTouched7d?: number;
    previousTodoTouched7d?: number;
    recentTodo30d?: number;
    previousTodo30d?: number;
    recentTodoTouched30d?: number;
    previousTodoTouched30d?: number;
    todoCreatedSeries30d?: Array<{ day: string; count: number }>;
    todoTouchedSeries30d?: Array<{ day: string; count: number }>;
  };
};

function formatPrice(min: string | number | null, max: string | number | null) {
  if (min == null && max == null) return "未填写";
  if (`${min}` === `${max}`) return `$${min}`;
  return `$${min ?? "?"} - $${max ?? "?"}`;
}

function formatDateTime(input?: string | null) {
  if (!input) return "未记录";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "无效时间";
  return d.toLocaleString();
}

function Sparkline({
  points,
  labels,
  strokeClassName = "stroke-amber-600",
}: {
  points: number[];
  labels?: string[];
  strokeClassName?: string;
}) {
  const width = 160;
  const height = 36;
  const pad = 2;
  const max = Math.max(...points, 1);
  const min = 0;
  const x = (idx: number) => (points.length <= 1 ? width / 2 : (idx / (points.length - 1)) * (width - pad * 2) + pad);
  const y = (val: number) => height - pad - ((val - min) / (max - min || 1)) * (height - pad * 2);
  const d = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${x(idx)} ${y(p)}`).join(" ");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  return (
    <div className="relative inline-block">
      {hoverIdx != null && (
        <div className="pointer-events-none absolute -top-8 left-0 z-10 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700 shadow-sm">
          <div>{labels?.[hoverIdx] ?? `第 ${hoverIdx + 1} 点`}</div>
          <div>数量：{points[hoverIdx]}</div>
        </div>
      )}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <path d={`M ${pad} ${height - pad} L ${width - pad} ${height - pad}`} className="stroke-slate-200" strokeWidth="1" fill="none" />
        <path d={d} className={strokeClassName} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, idx) => (
          <circle
            key={`${idx}-${p}`}
            cx={x(idx)}
            cy={y(p)}
            r={2.5}
            className="fill-white stroke-slate-500"
            strokeWidth="1"
            onMouseEnter={() => setHoverIdx(idx)}
          >
            <title>{`${labels?.[idx] ?? `第 ${idx + 1} 点`}: ${p}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

export default function MyBidsPage() {
  return (<Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">加载中...</div>}><MyBidsInner /></Suspense>);
}

function MyBidsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [items, setItems] = useState<MyBidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | "todo" | "selected" | "ended" | "withdrawn" | "pending_quote" | "in_progress" | "completed">(
    () => {
      const v = searchParams.get("status");
      return v === "todo" || v === "selected" || v === "ended" || v === "withdrawn" || v === "pending_quote" || v === "in_progress" || v === "completed" ? v : "";
    },
  );
  const [sort, setSort] = useState<"todo_first" | "created_desc" | "updated_desc" | "price_desc" | "price_asc" | "created_asc">(() => {
    const v = searchParams.get("sort");
    return v === "todo_first" || v === "updated_desc" || v === "price_desc" || v === "price_asc" || v === "created_asc"
      ? v
      : "todo_first";
  });
  const [page, setPage] = useState(() => Math.max(Number(searchParams.get("page") ?? "1") || 1, 1));
  const [pageSize, setPageSize] = useState(() => {
    const n = Number(searchParams.get("pageSize") ?? "10") || 10;
    return [10, 20, 50].includes(n) ? n : 10;
  });
  const [meta, setMeta] = useState<{ page: number; totalPages: number; total: number }>({ page: 1, totalPages: 1, total: 0 });
  const [summary, setSummary] = useState<{
    todo: number;
    withdrawn: number;
    selected: number;
    ended: number;
    recentTodo7d: number;
    previousTodo7d: number;
    recentTodoTouched7d: number;
    previousTodoTouched7d: number;
    recentTodo30d: number;
    previousTodo30d: number;
    recentTodoTouched30d: number;
    previousTodoTouched30d: number;
  }>({
    todo: 0,
    withdrawn: 0,
    selected: 0,
    ended: 0,
    recentTodo7d: 0,
    previousTodo7d: 0,
    recentTodoTouched7d: 0,
    previousTodoTouched7d: 0,
    recentTodo30d: 0,
    previousTodo30d: 0,
    recentTodoTouched30d: 0,
    previousTodoTouched30d: 0,
  });
  const [todoTrendMode, setTodoTrendMode] = useState<"created" | "touched">("created");
  const [todoTrendWindow, setTodoTrendWindow] = useState<7 | 30>(7);
  const [todoTrendSeries, setTodoTrendSeries] = useState<{
    created30d: Array<{ day: string; count: number }>;
    touched30d: Array<{ day: string; count: number }>;
  }>({ created30d: [], touched30d: [] });
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [rowCopyMsg, setRowCopyMsg] = useState<Record<string, string>>({});
  const [withdrawingBidId, setWithdrawingBidId] = useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState<null | { bidId: string; caseTitle: string }>(null);
  const [rowActionMsg, setRowActionMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    const next = new URLSearchParams();
    if (statusFilter) next.set("status", statusFilter);
    if (sort !== "todo_first") next.set("sort", sort);
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
    if (viewer.user?.role !== "ATTORNEY" && viewer.user?.role !== "ADMIN") {
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
    fetch(`/api/marketplace/my/bids?${params.toString()}`)
      .then(async (r) => {
        const data = (await r.json()) as MyBidsResponse & { error?: string };
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
          setSummary({
            todo: data.summary?.todo ?? 0,
            withdrawn: data.summary?.withdrawn ?? 0,
            selected: data.summary?.selected ?? 0,
            ended: data.summary?.ended ?? 0,
            recentTodo7d: data.summary?.recentTodo7d ?? 0,
            previousTodo7d: data.summary?.previousTodo7d ?? 0,
            recentTodoTouched7d: data.summary?.recentTodoTouched7d ?? 0,
            previousTodoTouched7d: data.summary?.previousTodoTouched7d ?? 0,
            recentTodo30d: data.summary?.recentTodo30d ?? 0,
            previousTodo30d: data.summary?.previousTodo30d ?? 0,
            recentTodoTouched30d: data.summary?.recentTodoTouched30d ?? 0,
            previousTodoTouched30d: data.summary?.previousTodoTouched30d ?? 0,
          });
          setTodoTrendSeries({
            created30d: data.summary?.todoCreatedSeries30d ?? [],
            touched30d: data.summary?.todoTouchedSeries30d ?? [],
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
    setSort("todo_first");
    setPageSize(10);
    setPage(1);
  }

  const reminderText =
    summary.todo > 0
      ? `你有 ${summary.todo} 条待处理报价，建议优先跟进案情补充或更新方案。`
      : summary.selected > 0
        ? `你有 ${summary.selected} 条已被选中报价，建议尽快进入沟通并推进签约。`
        : null;
  const staleTodoCount = items.filter((item) => {
    if (!(item.status === "PENDING" && (item.case.caseStatus === "OPEN" || item.case.caseStatus === "MATCHING"))) return false;
    const ts = new Date(item.updatedAt).getTime();
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts > 24 * 60 * 60 * 1000;
  }).length;
  const trendCurrent =
    todoTrendWindow === 7
      ? todoTrendMode === "created"
        ? summary.recentTodo7d
        : summary.recentTodoTouched7d
      : todoTrendMode === "created"
        ? summary.recentTodo30d
        : summary.recentTodoTouched30d;
  const trendPrev =
    todoTrendWindow === 7
      ? todoTrendMode === "created"
        ? summary.previousTodo7d
        : summary.previousTodoTouched7d
      : todoTrendMode === "created"
        ? summary.previousTodo30d
        : summary.previousTodoTouched30d;
  const todoTrendLabel = todoTrendMode === "created" ? "新增待办" : "重新变更待办";
  const todoTrendWindowLabel = `最近${todoTrendWindow}天`;
  const todoTrendText =
    trendCurrent > trendPrev
      ? `${todoTrendWindowLabel}${todoTrendLabel} ${trendCurrent} 条（较前${todoTrendWindow}天增加 ${trendCurrent - trendPrev}）`
      : trendCurrent < trendPrev
        ? `${todoTrendWindowLabel}${todoTrendLabel} ${trendCurrent} 条（较前${todoTrendWindow}天减少 ${trendPrev - trendCurrent}）`
        : `${todoTrendWindowLabel}${todoTrendLabel} ${trendCurrent} 条`;
  const sparkSeries = useMemo(() => {
    const raw = todoTrendMode === "created" ? todoTrendSeries.created30d : todoTrendSeries.touched30d;
    const sliced = todoTrendWindow === 7 ? raw.slice(-7) : raw.slice(-30);
    return sliced.map((p) => p.count);
  }, [todoTrendMode, todoTrendSeries, todoTrendWindow]);
  const sparkLastLabel = useMemo(() => {
    const raw = todoTrendMode === "created" ? todoTrendSeries.created30d : todoTrendSeries.touched30d;
    const sliced = todoTrendWindow === 7 ? raw.slice(-7) : raw.slice(-30);
    const first = sliced[0]?.day;
    const last = sliced[sliced.length - 1]?.day;
    return first && last ? `${first} ~ ${last}` : null;
  }, [todoTrendMode, todoTrendSeries, todoTrendWindow]);
  const sparkLabels = useMemo(() => {
    const raw = todoTrendMode === "created" ? todoTrendSeries.created30d : todoTrendSeries.touched30d;
    const sliced = todoTrendWindow === 7 ? raw.slice(-7) : raw.slice(-30);
    return sliced.map((p) => p.day);
  }, [todoTrendMode, todoTrendSeries, todoTrendWindow]);

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
      setRowCopyMsg((m) => ({ ...m, [caseId]: "已复制案件链接" }));
    } catch {
      setRowCopyMsg((m) => ({ ...m, [caseId]: "复制失败" }));
    }
    setTimeout(() => {
      setRowCopyMsg((m) => {
        const n = { ...m };
        delete n[caseId];
        return n;
      });
    }, 1500);
  }

  async function copyBidId(bidId: string) {
    try {
      await navigator.clipboard.writeText(bidId);
      setRowCopyMsg((m) => ({ ...m, [bidId]: "已复制报价ID" }));
    } catch {
      setRowCopyMsg((m) => ({ ...m, [bidId]: "复制失败" }));
    }
    setTimeout(() => {
      setRowCopyMsg((m) => {
        const n = { ...m };
        delete n[bidId];
        return n;
      });
    }, 1500);
  }

  async function copyBidTemplate(item: MyBidItem) {
    const text = [
      `【预报价模板】${item.case.category}`,
      `收费区间：${formatPrice(item.priceMin, item.priceMax)}`,
      `案件：${item.case.title}`,
      "",
      item.proposalText?.trim() || "（请补充报价方案说明）",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setRowCopyMsg((m) => ({ ...m, [`tpl:${item.id}`]: "已复制预报价模板" }));
    } catch {
      setRowCopyMsg((m) => ({ ...m, [`tpl:${item.id}`]: "复制失败" }));
    }
    setTimeout(() => {
      setRowCopyMsg((m) => {
        const n = { ...m };
        delete n[`tpl:${item.id}`];
        return n;
      });
    }, 1500);
  }

  async function copyVersionSummary(item: MyBidItem) {
    const text = [
      `报价版本摘要`,
      `Bid ID: ${item.id}`,
      `案件: ${item.case.title}`,
      `当前版本: v${item.version ?? 1}`,
      `历史版本数: ${item.versionCount ?? 0}`,
      `最近版本时间: ${formatDateTime(item.latestVersionAt)}`,
      `当前状态: ${item.status}`,
      `报价区间: ${formatPrice(item.priceMin, item.priceMax)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setRowCopyMsg((m) => ({ ...m, [`ver:${item.id}`]: "已复制版本摘要" }));
    } catch {
      setRowCopyMsg((m) => ({ ...m, [`ver:${item.id}`]: "复制失败" }));
    }
    setTimeout(() => {
      setRowCopyMsg((m) => {
        const n = { ...m };
        delete n[`ver:${item.id}`];
        return n;
      });
    }, 1500);
  }

  function setActionFeedback(bidId: string, message: string) {
    setRowActionMsg((m) => ({ ...m, [bidId]: message }));
    setTimeout(() => {
      setRowActionMsg((m) => {
        const n = { ...m };
        delete n[bidId];
        return n;
      });
    }, 1800);
  }

  async function withdrawBid(bidId: string) {
    setWithdrawingBidId(bidId);
    try {
      const r = await fetch(`/api/marketplace/bids/${bidId}/withdraw`, { method: "POST" });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error || "撤回失败");
      setItems((prev) => prev.map((it) => (it.id === bidId ? { ...it, status: "WITHDRAWN" } : it)));
      setActionFeedback(bidId, "报价已撤回");
    } catch (e) {
      setActionFeedback(bidId, e instanceof Error ? `撤回失败：${e.message}` : "撤回失败");
    } finally {
      setWithdrawingBidId(null);
      setConfirmWithdraw(null);
    }
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Marketplace MVP</p>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">My Bids / 我的报价</h1>
              <p className="text-sm text-slate-500 mt-2">律师查看自己提交过的报价，并返回案件详情继续修改。</p>
            </div>
            <div className="flex gap-2">
              <Link href="/marketplace/case-hall" className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-700">案件大厅</Link>
              <Link href="/marketplace/my-cases" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">我的案件</Link>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="w-full flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("todo");
                  setSort("todo_first");
                  setPage(1);
                }}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 hover:bg-amber-100"
              >
                一键跳到待处理 + 待办优先排序
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("selected");
                  setSort("todo_first");
                  setPage(1);
                }}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-100"
              >
                一键查看已被选中
              </button>
            </div>
            <div className="w-full flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">待办趋势统计口径</span>
              <button
                type="button"
                onClick={() => setTodoTrendMode("created")}
                className={`rounded-full px-3 py-1.5 text-xs border ${
                  todoTrendMode === "created"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                仅统计新建待办
              </button>
              <button
                type="button"
                onClick={() => setTodoTrendMode("touched")}
                className={`rounded-full px-3 py-1.5 text-xs border ${
                  todoTrendMode === "touched"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                重新变更待办
              </button>
              <span className="ml-2 text-xs text-slate-500">时间窗口</span>
              <button
                type="button"
                onClick={() => setTodoTrendWindow(7)}
                className={`rounded-full px-3 py-1.5 text-xs border ${
                  todoTrendWindow === 7
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                7天
              </button>
              <button
                type="button"
                onClick={() => setTodoTrendWindow(30)}
                className={`rounded-full px-3 py-1.5 text-xs border ${
                  todoTrendWindow === 30
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                30天
              </button>
            </div>
            <div className="grid w-full gap-3 md:grid-cols-4 mb-1">
                {[
                { key: "todo" as const, label: "待处理", count: summary.todo, tone: "border-amber-200 bg-amber-50 text-amber-800", hint: staleTodoCount > 0 ? `${staleTodoCount} 条超 24h 未跟进` : todoTrendText },
                { key: "selected" as const, label: "已被选中", count: summary.selected, tone: "border-emerald-200 bg-emerald-50 text-emerald-800", hint: "尽快进入沟通" },
                { key: "ended" as const, label: "已结束", count: summary.ended, tone: "border-slate-200 bg-slate-50 text-slate-700", hint: "已关闭或未选中" },
                { key: "withdrawn" as const, label: "已撤回", count: summary.withdrawn, tone: "border-rose-200 bg-rose-50 text-rose-800", hint: "可回看并重提" },
              ].map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setStatusFilter(card.key)}
                  className={`rounded-xl border p-3 text-left ${card.tone} ${statusFilter === card.key ? "ring-2 ring-slate-900/20" : ""}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold">{card.count}</p>
                  <p className="mt-1 text-xs opacity-80">{card.hint}</p>
                  {card.key === "todo" && sparkSeries.length > 1 && (
                    <div className="mt-2">
                      <Sparkline
                        points={sparkSeries}
                        labels={sparkLabels}
                        strokeClassName={todoTrendMode === "created" ? "stroke-amber-600" : "stroke-sky-600"}
                      />
                      {sparkLastLabel && <p className="mt-1 text-[10px] opacity-70">{sparkLastLabel}</p>}
                    </div>
                  )}
                  {card.key === "todo" && staleTodoCount > 0 && (
                    <p className="mt-1 text-[11px] font-semibold">建议优先处理陈旧待办</p>
                  )}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 mr-2">
              {[
                { key: "" as const, label: "全部", count: meta.total },
                { key: "todo" as const, label: "待处理", count: summary.todo },
                { key: "selected" as const, label: "已被选中", count: summary.selected },
                { key: "ended" as const, label: "已结束", count: summary.ended },
                { key: "withdrawn" as const, label: "已撤回", count: summary.withdrawn },
              ].map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`rounded-full px-3 py-1.5 text-xs border ${
                    statusFilter === tab.key
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tab.label} {tab.count}
                </button>
              ))}
            </div>
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
              <option value="todo">待处理（新）</option>
              <option value="selected">已被选中（新）</option>
              <option value="ended">已结束（新）</option>
              <option value="withdrawn">已撤回</option>
            </select>
            <label className="text-sm text-slate-600 ml-2">排序</label>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="created_desc">最新创建</option>
              <option value="todo_first">待办优先（默认）</option>
              <option value="updated_desc">最近更新</option>
              <option value="price_desc">报价高到低</option>
              <option value="price_asc">报价低到高</option>
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

          {reminderText && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {reminderText}
            </div>
          )}

          {!authLoading && viewer.user?.role !== "ATTORNEY" && viewer.user?.role !== "ADMIN" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              该页面仅律师（ATTORNEY）可用。当前角色：{viewer.user?.role ?? "ANONYMOUS"}。
            </div>
          )}

          {loading && <p className="text-sm text-slate-500">加载我的报价中...</p>}
          {error && <p className="text-sm text-rose-700">加载失败：{error}</p>}

          <div className="grid gap-4 mt-4">
            {items.map((item) => (
              <article key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-xs rounded-full bg-slate-100 px-2 py-1">{item.case.category}</span>
                      <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-1">案件 {item.case.caseStatus}</span>
                      <span className="text-xs rounded-full bg-amber-100 text-amber-700 px-2 py-1">报价 {item.status}</span>
                      {item.status === "PENDING" && (item.case.caseStatus === "OPEN" || item.case.caseStatus === "MATCHING") && (
                        <span className="text-xs rounded-full bg-rose-100 text-rose-700 px-2 py-1">待跟进</span>
                      )}
                      {item.status === "ACCEPTED" && item.case.caseStatus === "MATCHING" && (
                        <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">已被选中</span>
                      )}
                      {item.status === "REJECTED" && (
                        <span className="text-xs rounded-full bg-slate-200 text-slate-700 px-2 py-1">本轮未选中</span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">{item.case.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">{item.case.stateCode} {item.case.city ?? ""}</p>
                    <p className="text-sm text-slate-700 mt-2">{formatPrice(item.priceMin, item.priceMax)}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      当前版本 v{item.version ?? 1} · 历史版本 {item.versionCount ?? 0} 条 · 最近版本 {formatDateTime(item.latestVersionAt)}
                    </p>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-3">{item.proposalText || item.case.descriptionMasked}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href={`/marketplace/cases/${item.case.id}`} className="rounded-lg bg-amber-600 text-white px-4 py-2 text-sm font-semibold hover:bg-amber-500 text-center">
                      查看 / 修改报价
                    </Link>
                    <button
                      type="button"
                      onClick={() => copyCaseShareLink(item.case.id)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      复制案件链接
                    </button>
                    <button
                      type="button"
                      onClick={() => copyBidId(item.id)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      复制报价ID
                    </button>
                    <button
                      type="button"
                      onClick={() => copyBidTemplate(item)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      复制模板
                    </button>
                    <button
                      type="button"
                      onClick={() => copyVersionSummary(item)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      复制版本摘要
                    </button>
                    {item.status !== "WITHDRAWN" && item.status !== "ACCEPTED" && (
                      <button
                        type="button"
                        onClick={() => setConfirmWithdraw({ bidId: item.id, caseTitle: item.case.title })}
                        disabled={withdrawingBidId !== null}
                        className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        {withdrawingBidId === item.id ? "撤回中..." : "撤回报价"}
                      </button>
                    )}
                    <span className="text-xs text-slate-500 text-center">Bid #{item.id.slice(-6)}</span>
                    {(rowCopyMsg[item.case.id] || rowCopyMsg[item.id]) && (
                      <span className="text-xs text-emerald-700 text-center">
                        {rowCopyMsg[item.case.id] ?? rowCopyMsg[item.id]}
                      </span>
                    )}
                    {(rowCopyMsg[`tpl:${item.id}`] || rowCopyMsg[`ver:${item.id}`]) && (
                      <span className="text-xs text-emerald-700 text-center">
                        {rowCopyMsg[`tpl:${item.id}`] ?? rowCopyMsg[`ver:${item.id}`]}
                      </span>
                    )}
                    {rowActionMsg[item.id] && (
                      <span className="text-xs text-slate-600 text-center">{rowActionMsg[item.id]}</span>
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
                    <Link href="/marketplace/case-hall" className="underline ml-1">去案件大厅找案子</Link>。
                  </>
                ) : (
                  <>
                    你还没有提交报价。<Link href="/marketplace/case-hall" className="underline">去案件大厅找案子</Link>。
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
        {confirmWithdraw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">确认撤回报价？</h3>
              <p className="mt-2 text-sm text-slate-600 line-clamp-3">{confirmWithdraw.caseTitle}</p>
              <p className="mt-1 text-xs text-slate-400 break-all">Bid ID: {confirmWithdraw.bidId}</p>
              <p className="mt-2 text-sm text-slate-600">
                撤回后发布方将无法选择该报价；你后续仍可进入案件详情重新提交。
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmWithdraw(null)}
                  disabled={withdrawingBidId !== null}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => withdrawBid(confirmWithdraw.bidId)}
                  disabled={withdrawingBidId !== null}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  {withdrawingBidId === confirmWithdraw.bidId ? "撤回中..." : "确认撤回"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
