"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type InboxItem = {
  sourceType: "REPORT" | "DISPUTE" | "SUPPORT_TICKET";
  sourceId: string;
  title: string;
  subtitle: string;
  status: string;
  priority: string;
  queueLevel: "CUSTOMER_SERVICE" | "RISK" | "ADMIN";
  assignedAdminUserId: string | null;
  assignedAdminEmail: string | null;
  slaDueAt: string;
  isSlaBreached: boolean;
  ownerType: string;
  updatedAt: string;
  createdAt: string;
  routingNote: string | null;
  scene: string;
  links: Record<string, string | null | undefined>;
};
type Template = { id: string; scene: string; title: string; body: string };

export default function AdminSupportInboxPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const isAdmin = viewer.user?.role === "ADMIN";
  const [items, setItems] = useState<InboxItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [queue, setQueue] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [assigned, setAssigned] = useState("");
  const [slaBreachOnly, setSlaBreachOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<InboxItem["sourceType"] | null>(null);
  const [note, setNote] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [working, setWorking] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (queue) params.set("queue", queue);
    if (sourceType) params.set("sourceType", sourceType);
    if (assigned) params.set("assigned", assigned);
    if (slaBreachOnly) params.set("slaBreachOnly", "1");
    const r = await fetch(`/api/marketplace/admin/support-inbox?${params.toString()}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || "加载失败");
    } else {
      setItems(j.items ?? []);
      setTemplates(j.templates ?? []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    void load();
  }, [authLoading, isAdmin, q, queue, sourceType, assigned, slaBreachOnly]);

  const selectedItem = useMemo(
    () => items.find((i) => i.sourceId === selectedId && i.sourceType === selectedType) ?? null,
    [items, selectedId, selectedType],
  );
  const sceneTemplates = templates.filter((t) => (selectedItem ? t.scene === selectedItem.scene : true));

  async function runAction(action: "assign_to_me" | "escalate_to_risk" | "escalate_to_admin" | "deescalate_to_cs" | "mark_reviewing" | "apply_template_note") {
    if (!selectedItem) return;
    setWorking(true);
    const r = await fetch("/api/marketplace/admin/support-inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: selectedItem.sourceType,
        sourceId: selectedItem.sourceId,
        action,
        note: note || undefined,
        templateId: action === "apply_template_note" ? templateId || undefined : undefined,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setWorking(false);
    if (!r.ok) {
      alert(j.error || "操作失败");
      return;
    }
    await load();
  }

  const breachCount = items.filter((i) => i.isSlaBreached).length;

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin Support Inbox（统一工单台）</h1>
            <p className="mt-2 text-sm text-slate-500">一个入口聚合举报、争议、客服消息单；统一优先级/SLA/负责人视图，支持升级规则与模板回复。</p>
          </div>
          <AdminTabs />
          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}

          {isAdmin && (
            <>
              <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-6">
                  <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索工单ID/标题/摘要" />
                  <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                    <option value="">全部来源</option>
                    <option value="REPORT">举报</option>
                    <option value="DISPUTE">争议</option>
                    <option value="SUPPORT_TICKET">客服消息单</option>
                  </select>
                  <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={queue} onChange={(e) => setQueue(e.target.value)}>
                    <option value="">全部队列</option>
                    <option value="CUSTOMER_SERVICE">客服</option>
                    <option value="RISK">风控</option>
                    <option value="ADMIN">管理员</option>
                  </select>
                  <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={assigned} onChange={(e) => setAssigned(e.target.value)}>
                    <option value="">负责人（全部）</option>
                    <option value="unassigned">未分配</option>
                    <option value="assigned">已分配</option>
                  </select>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <input type="checkbox" checked={slaBreachOnly} onChange={(e) => setSlaBreachOnly(e.target.checked)} />
                    SLA breach（超时未处理）
                  </label>
                </div>
                <div className="mt-3 text-xs text-slate-500">当前列表：{items.length} 条 · SLA 超时 {breachCount} 条</div>
              </div>

              {loading && <p className="text-sm text-slate-500">加载统一工单台中...</p>}
              {error && <p className="text-sm text-rose-700">{error}</p>}

              {!loading && !error && (
                <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                  <section className="space-y-3">
                    {items.map((it) => (
                      <article
                        key={`${it.sourceType}:${it.sourceId}`}
                        className={`cursor-pointer rounded-2xl border p-4 shadow-sm ${selectedId === it.sourceId && selectedType === it.sourceType ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}
                        onClick={() => {
                          setSelectedId(it.sourceId);
                          setSelectedType(it.sourceType);
                          setTemplateId("");
                          setNote(it.routingNote ?? "");
                        }}
                      >
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{it.sourceType}</span>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{it.status}</span>
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">{it.queueLevel}</span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{it.priority}</span>
                          {it.isSlaBreached && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">SLA超时</span>}
                        </div>
                        <h2 className="text-sm font-semibold text-slate-900">{it.title}</h2>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600">{it.subtitle}</p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          负责人：{it.assignedAdminEmail ?? "未分配"} · SLA：{new Date(it.slaDueAt).toLocaleString()} · 更新：{new Date(it.updatedAt).toLocaleString()}
                        </p>
                      </article>
                    ))}
                    {items.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">当前筛选下暂无工单。</div>}
                  </section>

                  <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900">处理面板 / 升级规则 / 模板回复</h2>
                    {!selectedItem && <p className="mt-3 text-xs text-slate-500">从左侧选择一条工单。</p>}
                    {selectedItem && (
                      <div className="mt-3 space-y-3">
                        <div className="rounded-lg border border-slate-200 p-3">
                          <p className="text-xs text-slate-500">当前工单</p>
                          <p className="text-sm font-medium text-slate-900">{selectedItem.title}</p>
                          <p className="mt-1 text-xs text-slate-600">场景：{selectedItem.scene}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {selectedItem.links.reportId && <Link className="underline" href={`/marketplace/admin/reports`}>举报中心</Link>}
                            {selectedItem.links.disputeId && <Link className="underline" href={`/marketplace/admin/disputes`}>争议工单中心</Link>}
                            {selectedItem.links.supportTicketId && <Link className="underline" href={`/marketplace/admin/support-tickets/${selectedItem.links.supportTicketId}`}>客服消息详情</Link>}
                          </div>
                        </div>

                        <textarea
                          rows={4}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          placeholder="内部备注 / 升级原因（可选）"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <button disabled={working} onClick={() => void runAction("assign_to_me")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs">分配给我</button>
                          <button disabled={working} onClick={() => void runAction("mark_reviewing")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs">标记处理中</button>
                          <button disabled={working} onClick={() => void runAction("deescalate_to_cs")} className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-700">回到客服队列</button>
                          <button disabled={working} onClick={() => void runAction("escalate_to_risk")} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">升级到风控</button>
                          <button disabled={working} onClick={() => void runAction("escalate_to_admin")} className="col-span-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">升级到管理员</button>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-3">
                          <p className="text-xs font-semibold text-slate-700">模板回复中心（按场景）</p>
                          <select className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                            <option value="">选择模板</option>
                            {sceneTemplates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                          </select>
                          <div className="mt-2 max-h-28 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                            {templateId ? (sceneTemplates.find((t) => t.id === templateId)?.body ?? "模板不存在") : "选择模板后可预览；客服消息单来源可直接发送模板回复。"}
                          </div>
                          <button
                            disabled={working || !templateId}
                            onClick={() => void runAction("apply_template_note")}
                            className="mt-2 w-full rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 disabled:opacity-50"
                          >
                            应用模板回复（客服消息单可直接发送）
                          </button>
                          <div className="mt-2 text-[11px] text-slate-500">
                            升级规则：客服 {"->"} 风控 {"->"} 管理员（通过上方队列升级按钮执行）
                          </div>
                        </div>
                      </div>
                    )}
                  </aside>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
