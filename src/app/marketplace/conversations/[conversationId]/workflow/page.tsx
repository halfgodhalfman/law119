"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NavBar } from "@/components/ui/nav-bar";

type WorkflowPayload = {
  workflow: {
    conversationId: string;
    caseId: string;
    tags: Array<{ id: string; tag: string; note: string | null }>;
    reminders: Array<{ id: string; title: string; note: string | null; dueAt: string; status: string }>;
    checklist: Array<{ id: string; title: string; note: string | null; required: boolean; completed: boolean }>;
    summary: { overdueReminders: number; pendingChecklistRequired: number };
    suggestions: string[];
  };
  viewer: { role: string; canEditAttorneyTools: boolean };
};

const TAGS = [
  ["HIGH_INTENT", "高意向"],
  ["HIGH_RISK", "高风险"],
  ["MISSING_MATERIALS", "资料不全"],
  ["NEEDS_FOLLOWUP", "需跟进"],
  ["DISPUTE_RISK", "争议风险"],
] as const;

export default function ConversationWorkflowPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [data, setData] = useState<WorkflowPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDueAt, setReminderDueAt] = useState("");
  const [checklistTitle, setChecklistTitle] = useState("");

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/conversations/${conversationId}/workflow`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || "加载失败");
      setLoading(false);
      return;
    }
    setError(null);
    setData(j);
    setLoading(false);
  };

  useEffect(() => {
    if (conversationId) void load();
  }, [conversationId]);

  const postAction = async (body: unknown) => {
    const r = await fetch(`/api/conversations/${conversationId}/workflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "操作失败");
    await load();
  };

  const patchAction = async (body: unknown) => {
    const r = await fetch(`/api/conversations/${conversationId}/workflow`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "操作失败");
    await load();
  };

  const toggleTag = async (tag: string, enabled: boolean) => {
    try {
      setMsg(null);
      await postAction({ type: "tag", tag, enabled });
      setMsg("标签已更新");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "操作失败");
    }
  };

  const addReminder = async () => {
    if (!reminderTitle.trim() || !reminderDueAt) return;
    try {
      setMsg(null);
      await postAction({ type: "reminder", title: reminderTitle, dueAt: new Date(reminderDueAt).toISOString() });
      setReminderTitle("");
      setReminderDueAt("");
      setMsg("跟进提醒已创建");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "操作失败");
    }
  };

  const addChecklist = async () => {
    if (!checklistTitle.trim()) return;
    try {
      setMsg(null);
      await postAction({ type: "checklist", title: checklistTitle, required: true });
      setChecklistTitle("");
      setMsg("补件项已创建");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "操作失败");
    }
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Attorney Workflow</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">律师工作流工具（会话维度）</h1>
              <p className="mt-2 text-sm text-slate-500">跟进提醒、补件清单、会话标签（高意向/高风险/资料不全）</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/chat/${conversationId}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">打开会话</Link>
              {data?.workflow.caseId && <Link href={`/marketplace/cases/${data.workflow.caseId}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">案件详情</Link>}
            </div>
          </div>

          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          {msg && <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{msg}</div>}

          {data && (
            <div className="grid gap-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">工作台摘要</h2>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-slate-100 px-3 py-1">当前角色：{data.viewer.role}</span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">逾期跟进 {data.workflow.summary.overdueReminders}</span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">待补件（必需） {data.workflow.summary.pendingChecklistRequired}</span>
                </div>
                {data.workflow.suggestions.length > 0 && (
                  <ul className="mt-3 list-disc pl-5 text-sm text-slate-600 space-y-1">
                    {data.workflow.suggestions.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">会话标签</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TAGS.map(([key, label]) => {
                    const active = data.workflow.tags.some((t) => t.tag === key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => void toggleTag(key, !active)}
                        className={`rounded-full px-3 py-1.5 text-sm border ${active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">跟进提醒</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px_auto]">
                  <input value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} placeholder="例如：24小时内跟进报价范围" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input type="datetime-local" value={reminderDueAt} onChange={(e) => setReminderDueAt(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <button type="button" onClick={() => void addReminder()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">新增提醒</button>
                </div>
                <div className="mt-4 space-y-2">
                  {data.workflow.reminders.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{r.title}</p>
                        <p className="text-xs text-slate-500">到期：{new Date(r.dueAt).toLocaleString()} · 状态：{r.status}</p>
                      </div>
                      <div className="flex gap-2">
                        {r.status !== "DONE" && <button type="button" onClick={() => void patchAction({ type: "reminder", id: r.id, status: "DONE" })} className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">完成</button>}
                        {r.status !== "DISMISSED" && <button type="button" onClick={() => void patchAction({ type: "reminder", id: r.id, status: "DISMISSED" })} className="rounded border border-slate-300 px-3 py-1 text-xs">忽略</button>}
                      </div>
                    </div>
                  ))}
                  {data.workflow.reminders.length === 0 && <p className="text-sm text-slate-500">暂无提醒。</p>}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">待补充材料清单</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                  <input value={checklistTitle} onChange={(e) => setChecklistTitle(e.target.value)} placeholder="例如：护照首页扫描件 / I-94 / 结婚证" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <button type="button" onClick={() => void addChecklist()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">新增补件项</button>
                </div>
                <div className="mt-4 space-y-2">
                  {data.workflow.checklist.map((c) => (
                    <label key={c.id} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${c.completed ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}>
                      <div className="min-w-0">
                        <p className={`text-sm ${c.completed ? "text-emerald-800 line-through" : "text-slate-900"}`}>{c.title}</p>
                        <p className="text-xs text-slate-500">{c.required ? "必需材料" : "可选材料"}</p>
                      </div>
                      <input type="checkbox" checked={c.completed} onChange={(e) => void patchAction({ type: "checklist", id: c.id, completed: e.target.checked })} />
                    </label>
                  ))}
                  {data.workflow.checklist.length === 0 && <p className="text-sm text-slate-500">暂无补件清单。</p>}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

