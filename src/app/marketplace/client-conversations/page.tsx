"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { ClientTabs } from "@/components/client/client-tabs";

type ConversationRow = {
  id: string;
  status: string;
  caseId: string;
  bidId: string;
  updatedAt: string;
  consultationAcceptedAt?: string | null;
  case: { title: string; category: string; status: string };
  attorney: { id: string; firstName: string | null; lastName: string | null; firmName: string | null; user: { email: string | null } };
  latestMessage: { senderRole: string; createdAt: string; body: string } | null;
  unreadCount?: number;
  flags: { isNew: boolean; awaitingClientReply: boolean };
  disputeTickets: Array<{ id: string; status: string; priority: string }>;
  reports: Array<{ id: string; status: string; category: string; createdAt: string }>;
};

type Payload = {
  items: ConversationRow[];
  summary: { total: number; open: number; closed: number; awaitingClient: number; newMessages24h: number };
  filters: { status: string; sort?: string; q: string; page: number; pageSize: number; total: number; totalPages: number };
};

const STATUS_OPTIONS = [
  ["all", "全部"],
  ["awaiting_client", "待我回复"],
  ["new", "24h新消息"],
  ["open", "进行中"],
  ["closed", "已关闭"],
] as const;

export default function ClientConversationsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number][0]>("all");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"updated_desc" | "unread_desc" | "attorney_latest_desc">("updated_desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchActing, setBatchActing] = useState<null | "selected" | "all">(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({ status, sort, page: String(page) });
      if (q.trim()) params.set("q", q.trim());
      const r = await fetch(`/api/marketplace/client/conversations?${params.toString()}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error || "加载会话失败");
        setLoading(false);
        return;
      }
      setData(j);
      setSelectedIds([]);
      setError(null);
      setLoading(false);
    };
    void load();
  }, [status, q, sort, page]);

  const summary = data?.summary;
  const countChips = useMemo(() => ([
    ["待我回复", summary?.awaitingClient ?? 0, "amber"],
    ["24h新消息", summary?.newMessages24h ?? 0, "emerald"],
    ["进行中", summary?.open ?? 0, "slate"],
    ["已关闭", summary?.closed ?? 0, "slate"],
  ] as const), [summary]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <ClientTabs />
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Client Messages</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">客户消息中心</h1>
              <p className="mt-2 text-sm text-slate-500">查看与律师的全部沟通会话，按待回复 / 新消息快速筛选并继续沟通。</p>
            </div>
            <div className="flex gap-2">
              <Link href="/marketplace/client-center" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">返回客户后台</Link>
              <Link href="/marketplace/disputes" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">争议工单</Link>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-[220px_220px_1fr_auto]">
            <select value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {STATUS_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
            <select value={sort} onChange={(e) => { setSort(e.target.value as any); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="updated_desc">按最近更新排序</option>
              <option value="unread_desc">按未读数量排序</option>
              <option value="attorney_latest_desc">按最新律师消息排序</option>
            </select>
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setQ(qInput); setPage(1); } }}
              placeholder="搜索案件标题 / 律师姓名 / 会话ID"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button type="button" onClick={() => { setQ(qInput); setPage(1); }} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              搜索
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {countChips.map(([label, count, tone]) => (
              <span key={label} className={`rounded-full px-3 py-1 text-xs ${tone === "amber" ? "bg-amber-100 text-amber-700" : tone === "emerald" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                {label} {count}
              </span>
            ))}
          </div>

          {msg && <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{msg}</div>}

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                已选择 <span className="font-semibold text-slate-900">{selectedIds.length}</span> 个会话
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds((data?.items ?? []).map((i) => i.id))}
                  disabled={!data?.items?.length}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-50"
                >
                  全选当前页
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds((data?.items ?? []).filter((i) => (i.unreadCount ?? 0) > 0).map((i) => i.id))}
                  disabled={!data?.items?.some((i) => (i.unreadCount ?? 0) > 0)}
                  className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 disabled:opacity-50"
                >
                  仅选择未读
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  disabled={selectedIds.length === 0}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-50"
                >
                  清空选择
                </button>
                <button
                  type="button"
                  disabled={batchActing !== null || selectedIds.length === 0}
                  onClick={async () => {
                    setBatchActing("selected");
                    setMsg(null);
                    const r = await fetch("/api/marketplace/client/conversations", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "mark_selected_read", conversationIds: selectedIds }),
                    });
                    const j = await r.json().catch(() => ({}));
                    setBatchActing(null);
                    if (!r.ok) {
                      setMsg(j.error || "批量标记已读失败");
                      return;
                    }
                    setMsg(`已批量标记 ${j.updatedCount ?? selectedIds.length} 个会话为已读`);
                    await (async () => {
                      const params = new URLSearchParams({ status, sort, page: String(page) });
                      if (q.trim()) params.set("q", q.trim());
                      const rr = await fetch(`/api/marketplace/client/conversations?${params.toString()}`, { cache: "no-store" });
                      const jj = await rr.json().catch(() => ({}));
                      if (rr.ok) setData(jj);
                    })();
                    setSelectedIds([]);
                  }}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 disabled:opacity-50"
                >
                  {batchActing === "selected" ? "处理中..." : "批量标记已读"}
                </button>
                <button
                  type="button"
                  disabled={batchActing !== null}
                  onClick={async () => {
                    setBatchActing("all");
                    setMsg(null);
                    const r = await fetch("/api/marketplace/client/conversations", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "mark_all_read" }),
                    });
                    const j = await r.json().catch(() => ({}));
                    setBatchActing(null);
                    if (!r.ok) {
                      setMsg(j.error || "全部标记已读失败");
                      return;
                    }
                    setMsg(`已将 ${j.updatedCount ?? 0} 个会话标记为已读`);
                    await (async () => {
                      const params = new URLSearchParams({ status, sort, page: String(page) });
                      if (q.trim()) params.set("q", q.trim());
                      const rr = await fetch(`/api/marketplace/client/conversations?${params.toString()}`, { cache: "no-store" });
                      const jj = await rr.json().catch(() => ({}));
                      if (rr.ok) setData(jj);
                    })();
                    setSelectedIds([]);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 disabled:opacity-50"
                >
                  {batchActing === "all" ? "处理中..." : "全部标记已读"}
                </button>
              </div>
            </div>
          </div>

          {loading && <p className="text-sm text-slate-500">加载会话中...</p>}
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          <div className="grid gap-4">
            {(data?.items ?? []).map((c) => (
              <article key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={(e) =>
                          setSelectedIds((prev) =>
                            e.target.checked ? Array.from(new Set([...prev, c.id])) : prev.filter((id) => id !== c.id),
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="text-xs text-slate-500">选择</span>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{c.status}</span>
                      {c.flags.awaitingClientReply && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">待我回复</span>}
                      {c.flags.isNew && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">24h新消息</span>}
                      {(c.unreadCount ?? 0) > 0 && <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700">未读 {c.unreadCount}</span>}
                      {c.disputeTickets.length > 0 && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">有争议工单</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{c.case?.title ?? `Case ${c.caseId}`}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      律师：
                      {[c.attorney?.firstName, c.attorney?.lastName].filter(Boolean).join(" ") || c.attorney?.user?.email || "Attorney"}
                      {c.attorney?.firmName ? ` · ${c.attorney.firmName}` : ""}
                    </p>
                    {c.latestMessage ? (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <p className="text-[11px] text-slate-500">
                          最新消息 · {c.latestMessage.senderRole} · {new Date(c.latestMessage.createdAt).toLocaleString()}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-700">{c.latestMessage.body}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">暂无消息内容</p>
                    )}
                  </div>
                  <div className="w-full space-y-2 sm:w-[210px]">
                    <Link href={`/chat/${c.id}`} className="block rounded-lg bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-white">
                      打开会话
                    </Link>
                    <Link href={`/marketplace/cases/${c.caseId}`} className="block rounded-lg border border-slate-300 px-3 py-2 text-center text-xs hover:bg-slate-50">
                      案件详情
                    </Link>
                    {c.flags.isNew && (
                      <button
                        type="button"
                        disabled={markingReadId === c.id}
                        onClick={async () => {
                          setMarkingReadId(c.id);
                          setMsg(null);
                          const r = await fetch(`/api/marketplace/client/conversations/${c.id}/read`, { method: "POST" });
                          const j = await r.json().catch(() => ({}));
                          setMarkingReadId(null);
                          if (!r.ok) {
                            setMsg(j.error || "标记已读失败");
                            return;
                          }
                          setMsg("已标记该会话为已读");
                          setData((prev) => {
                            if (!prev) return prev;
                            const nextItems = prev.items.map((row) =>
                              row.id === c.id
                                ? { ...row, flags: { ...row.flags, isNew: false, awaitingClientReply: false } }
                                : row,
                            );
                            const nextSummary = {
                              ...prev.summary,
                              newMessages24h: Math.max(
                                0,
                                prev.summary.newMessages24h - (c.flags.isNew ? 1 : 0),
                              ),
                              awaitingClient: Math.max(
                                0,
                                prev.summary.awaitingClient - (c.flags.awaitingClientReply ? 1 : 0),
                              ),
                            };
                            return { ...prev, items: nextItems, summary: nextSummary };
                          });
                        }}
                        className="block rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-700 disabled:opacity-50"
                      >
                        {markingReadId === c.id ? "处理中..." : "标记已读"}
                      </button>
                    )}
                    <Link
                      href={`/marketplace/disputes${c.id ? `?conversationId=${encodeURIComponent(c.id)}` : ""}`}
                      className="block rounded-lg border border-slate-300 px-3 py-2 text-center text-xs hover:bg-slate-50"
                    >
                      提交投诉/争议
                    </Link>
                    {c.disputeTickets[0] && (
                      <Link href={`/marketplace/disputes/${c.disputeTickets[0].id}`} className="block rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-center text-xs text-rose-700">
                        查看相关工单
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {!loading && (data?.items?.length ?? 0) === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-medium text-slate-700">暂无会话记录</p>
                <p className="mt-1 text-xs text-slate-500">选择律师后会自动创建会话，你也可以先查看我的案件状态。</p>
                <div className="mt-3 flex justify-center gap-2">
                  <Link href="/marketplace/my-cases" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">我的案件</Link>
                  <Link href="/marketplace/client-center" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">客户后台</Link>
                </div>
              </div>
            )}
          </div>

          {data && data.filters.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                上一页
              </button>
              <span className="text-sm text-slate-600">第 {page} / {data.filters.totalPages} 页</span>
              <button
                type="button"
                disabled={page >= data.filters.totalPages}
                onClick={() => setPage((p) => Math.min(data.filters.totalPages, p + 1))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
