"use client";

/**
 * /marketplace/uscis-cases — 用户 USCIS 案件追踪中心
 *
 * 需要登录，展示用户追踪的所有 USCIS 案件
 * 支持：添加新案件、手动刷新状态、查看时间轴、删除案件
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { STATUS_CATEGORY_UI, getAttorneyRecommendation, validateReceiptNumber } from "@/lib/uscis-tracker";
import type { USCISStatusCategory } from "@/lib/uscis-tracker";

// ─── 类型 ──────────────────────────────────────────────────────────────────────

interface TrackedCase {
  id: string;
  receiptNumber: string;
  formType: string | null;
  nickname: string | null;
  lastStatus: string | null;
  lastStatusBody: string | null;
  statusCategory: USCISStatusCategory;
  lastCheckedAt: string | null;
  statusHistory: HistoryEntry[];
  notifyOnChange: boolean;
  createdAt: string;
}

interface HistoryEntry {
  status: string;
  statusBody: string;
  category: USCISStatusCategory;
  checkedAt: string;
}

// ─── 子组件：单个案件卡片 ────────────────────────────────────────────────────

function CaseCard({
  item,
  onRefresh,
  onDelete,
}: {
  item: TrackedCase;
  onRefresh: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  const ui = STATUS_CATEGORY_UI[item.statusCategory];
  const rec = getAttorneyRecommendation(item.statusCategory);

  const history: HistoryEntry[] = Array.isArray(item.statusHistory) ? item.statusHistory : [];

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg("");
    try {
      const res = await fetch(`/api/marketplace/uscis/cases/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRefreshMsg(json.error ?? "刷新失败");
      } else {
        setRefreshMsg(json.statusChanged ? "✅ 状态已更新" : "状态无变化");
        onRefresh(item.id);
      }
    } catch {
      setRefreshMsg("网络错误");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`确认移除对收据号 ${item.receiptNumber} 的追踪？`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/marketplace/uscis/cases/${item.id}`, { method: "DELETE" });
      onDelete(item.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${ui.border} ${ui.bg}`}>
      {/* 卡片头部 */}
      <div
        className="px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ui.dot}`} />
              <p className={`font-semibold text-sm ${ui.color}`}>
                {item.lastStatus ?? "未知状态"}
              </p>
              {item.statusCategory === "ALERT" && (
                <span className="text-xs bg-red-600/20 text-red-400 border border-red-600/30 px-2 py-0.5 rounded-full">
                  需立即处理
                </span>
              )}
              {item.statusCategory === "ACTION" && (
                <span className="text-xs bg-amber-600/20 text-amber-400 border border-amber-600/30 px-2 py-0.5 rounded-full">
                  需关注
                </span>
              )}
              {item.statusCategory === "APPROVED" && (
                <span className="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-2 py-0.5 rounded-full">
                  ✅ 已批准
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-white font-mono text-xs">{item.receiptNumber}</span>
              {item.formType && (
                <span className="text-slate-400 text-xs bg-slate-700/60 px-2 py-0.5 rounded">{item.formType}</span>
              )}
              {item.nickname && (
                <span className="text-slate-300 text-xs italic">「{item.nickname}」</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
              disabled={refreshing}
              title="刷新状态"
              className="p-1.5 rounded-lg hover:bg-slate-600/40 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <svg className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <span className="text-slate-600 text-lg">{expanded ? "▲" : "▼"}</span>
          </div>
        </div>

        {refreshMsg && (
          <p className={`text-xs mt-2 ${refreshMsg.includes("✅") ? "text-green-400" : "text-amber-400"}`}>
            {refreshMsg}
          </p>
        )}

        <p className="text-slate-600 text-xs mt-1.5">
          上次查询：{item.lastCheckedAt
            ? new Date(item.lastCheckedAt).toLocaleString("zh-CN")
            : "从未查询"
          }
        </p>
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div className="border-t border-white/10 px-5 py-4 space-y-4">
          {/* 律师推荐 */}
          {rec.show && (
            <div className="bg-red-900/20 border border-red-600/20 rounded-lg p-3 flex gap-3">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div>
                <p className="text-red-300 font-medium text-xs mb-2">{rec.message}</p>
                <div className="flex gap-2 flex-wrap">
                  <Link href="/qa" className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs transition-colors">
                    免费提问
                  </Link>
                  <Link
                    href={`/case/new?category=IMMIGRATION&title=${encodeURIComponent("USCIS " + (item.lastStatus ?? "案件咨询"))}`}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors"
                  >
                    🚨 紧急咨询律师 →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 状态说明 */}
          {item.lastStatusBody && (
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-slate-400 text-xs font-medium mb-1">USCIS 状态说明</p>
              <p className="text-slate-300 text-xs leading-relaxed">{item.lastStatusBody}</p>
            </div>
          )}

          {/* 状态时间轴 */}
          {history.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs font-medium mb-3">状态历史</p>
              <div className="space-y-2">
                {history.slice(0, 8).map((h, i) => {
                  const hUi = STATUS_CATEGORY_UI[h.category];
                  return (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex flex-col items-center flex-shrink-0 mt-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${hUi.dot}`} />
                        {i < history.length - 1 && <div className="w-px h-full bg-slate-700 mt-1 min-h-4" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-slate-300 text-xs font-medium">{h.status}</p>
                        <p className="text-slate-600 text-xs mt-0.5">
                          {new Date(h.checkedAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <a
              href={`https://egov.uscis.gov/casestatus/mycasestatus.do`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs underline"
            >
              在 USCIS 官网查看 ↗
            </a>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-slate-500 hover:text-red-400 text-xs transition-colors disabled:opacity-50"
            >
              {deleting ? "移除中…" : "✕ 移除追踪"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function USCISCasesPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [cases, setCases] = useState<TrackedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // 新增表单状态
  const [addReceipt, setAddReceipt] = useState("");
  const [addFormType, setAddFormType] = useState("");
  const [addNickname, setAddNickname] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const isLoggedIn = !authLoading && !!viewer.user?.id;

  const load = async () => {
    try {
      const res = await fetch("/api/marketplace/uscis/cases", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setCases(json.cases ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      void load();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isLoggedIn]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    const trimmed = addReceipt.trim().toUpperCase().replace(/[\s-]/g, "");
    const v = validateReceiptNumber(trimmed);
    if (!v.valid) { setAddError(v.error ?? "格式错误"); return; }

    setAdding(true);
    try {
      const res = await fetch("/api/marketplace/uscis/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptNumber: trimmed,
          formType: addFormType.trim() || undefined,
          nickname: addNickname.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setAddError(json.error ?? "添加失败");
      } else {
        setAddReceipt(""); setAddFormType(""); setAddNickname("");
        setShowAddForm(false);
        await load();
      }
    } catch {
      setAddError("网络错误，请重试");
    } finally {
      setAdding(false);
    }
  };

  const handleRefresh = (_id: string) => { void load(); };
  const handleDelete = (id: string) => { setCases((prev) => prev.filter((c) => c.id !== id)); };

  // 未登录
  if (!authLoading && !isLoggedIn) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4">🔒</p>
            <p className="text-white font-semibold mb-2">请先登录</p>
            <p className="text-slate-400 text-sm mb-6">USCIS 案件追踪中心需要登录后使用</p>
            <div className="flex flex-col gap-2">
              <Link href="/uscis" className="px-6 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors">
                无需登录，单次查询 →
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // ATTORNEY/ADMIN 角色不需要此功能
  if (!authLoading && viewer.user?.role !== "CLIENT") {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-400 text-sm">此功能仅供客户使用</p>
            <Link href="/uscis" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block underline">
              使用公开查询工具 →
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // 各状态统计
  const alertCount = cases.filter((c) => c.statusCategory === "ALERT").length;
  const actionCount = cases.filter((c) => c.statusCategory === "ACTION").length;

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-900">
        {/* 顶部 */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700 py-10">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Link href="/marketplace/client-center" className="hover:text-amber-400">客户后台</Link>
                  <span>/</span>
                  <span>USCIS 案件追踪</span>
                </div>
                <h1 className="text-2xl font-bold text-white">🛂 USCIS 案件追踪中心</h1>
                <p className="text-slate-400 text-sm mt-1">
                  追踪 {cases.length} 个案件
                  {alertCount > 0 && <span className="ml-2 text-red-400 font-medium">⚠️ {alertCount} 个需立即处理</span>}
                  {actionCount > 0 && <span className="ml-2 text-amber-400 font-medium">🔔 {actionCount} 个需关注</span>}
                </p>
              </div>
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <span>＋</span> 添加收据号
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

          {/* 添加表单 */}
          {showAddForm && (
            <form
              onSubmit={handleAdd}
              className="bg-slate-800 border border-slate-600 rounded-xl p-5 space-y-4"
            >
              <h3 className="text-white font-semibold text-sm">添加新的 USCIS 案件</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-slate-400 text-xs mb-1 block">收据号 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={addReceipt}
                    onChange={(e) => setAddReceipt(e.target.value.toUpperCase())}
                    placeholder="如 LIN2401234567"
                    maxLength={15}
                    required
                    className="w-full bg-slate-700 border border-slate-600 focus:border-blue-500 focus:outline-none rounded-lg px-3 py-2 text-white text-sm font-mono placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">申请表格（选填）</label>
                  <input
                    type="text"
                    value={addFormType}
                    onChange={(e) => setAddFormType(e.target.value)}
                    placeholder="如 I-485, N-400"
                    maxLength={20}
                    className="w-full bg-slate-700 border border-slate-600 focus:border-blue-500 focus:outline-none rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">备注名称（选填）</label>
                  <input
                    type="text"
                    value={addNickname}
                    onChange={(e) => setAddNickname(e.target.value)}
                    placeholder="如 我的绿卡、老婆工卡"
                    maxLength={40}
                    className="w-full bg-slate-700 border border-slate-600 focus:border-blue-500 focus:outline-none rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500"
                  />
                </div>
              </div>
              {addError && <p className="text-red-400 text-xs">{addError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {adding ? "查询并添加中…" : "📌 添加追踪"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setAddError(""); }}
                  className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          )}

          {/* 案件列表 */}
          {loading || authLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-16 bg-slate-800/30 border border-slate-700/40 rounded-xl">
              <p className="text-4xl mb-4">🛂</p>
              <p className="text-slate-300 font-medium mb-2">尚未追踪任何 USCIS 案件</p>
              <p className="text-slate-500 text-sm mb-6">
                点击「添加收据号」即可开始追踪您的移民申请状态
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
                >
                  ＋ 添加收据号
                </button>
                <Link
                  href="/uscis"
                  className="px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
                >
                  单次查询 →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 告警案件优先展示 */}
              {cases
                .sort((a, b) => {
                  const order: Record<USCISStatusCategory, number> = {
                    ALERT: 0, ACTION: 1, APPROVED: 2, COMPLETE: 3, PENDING: 4,
                  };
                  return (order[a.statusCategory] ?? 4) - (order[b.statusCategory] ?? 4);
                })
                .map((item) => (
                  <CaseCard
                    key={item.id}
                    item={item}
                    onRefresh={handleRefresh}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          )}

          {/* 底部说明 */}
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
            <p className="text-slate-500 text-xs leading-relaxed">
              💡 系统不会自动后台刷新状态，请手动点击刷新按钮或定期访问此页面。
              如需实时关注，建议每周查看一次，或在收到 USCIS 邮件后手动刷新。
              状态变化将在下次刷新时触发站内通知。
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
