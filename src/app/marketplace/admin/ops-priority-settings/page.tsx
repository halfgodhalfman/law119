"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type Settings = {
  highValueBaseWeight: number;
  highValueReasonWeight: number;
  firstBidOverduePublishedWeight: number;
  firstMessageOverdueWeight: number;
  quotedNotSelectedWeight: number;
  selectedNoConversationWeight: number;
  urgentWeight: number;
};

const DEFAULTS: Settings = {
  highValueBaseWeight: 30,
  highValueReasonWeight: 5,
  firstBidOverduePublishedWeight: 35,
  firstMessageOverdueWeight: 25,
  quotedNotSelectedWeight: 15,
  selectedNoConversationWeight: 20,
  urgentWeight: 10,
};

export default function OpsPrioritySettingsPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const isAdmin = viewer.user?.role === "ADMIN";
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetch("/api/marketplace/admin/ops-priority-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.settings) {
          setForm({
            highValueBaseWeight: data.settings.highValueBaseWeight ?? DEFAULTS.highValueBaseWeight,
            highValueReasonWeight: data.settings.highValueReasonWeight ?? DEFAULTS.highValueReasonWeight,
            firstBidOverduePublishedWeight: data.settings.firstBidOverduePublishedWeight ?? DEFAULTS.firstBidOverduePublishedWeight,
            firstMessageOverdueWeight: data.settings.firstMessageOverdueWeight ?? DEFAULTS.firstMessageOverdueWeight,
            quotedNotSelectedWeight: data.settings.quotedNotSelectedWeight ?? DEFAULTS.quotedNotSelectedWeight,
            selectedNoConversationWeight: data.settings.selectedNoConversationWeight ?? DEFAULTS.selectedNoConversationWeight,
            urgentWeight: data.settings.urgentWeight ?? DEFAULTS.urgentWeight,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin]);

  const rows: Array<[keyof Settings, string, string]> = [
    ["highValueBaseWeight", "高价值基础权重", "命中任一高价值信号时的基础分"],
    ["highValueReasonWeight", "高价值信号增量", "每个高价值原因额外增加分值"],
    ["firstBidOverduePublishedWeight", "首报超时权重", "已发布但首报超时（24h）"],
    ["firstMessageOverdueWeight", "首消息超时权重", "已选/已沟通后律师首条消息超时（24h）"],
    ["quotedNotSelectedWeight", "报价未选中卡点权重", "有报价但未完成选择"],
    ["selectedNoConversationWeight", "已选未沟通卡点权重", "已选报价但未创建会话"],
    ["urgentWeight", "紧急案件权重", "案件紧急度为 URGENT"],
  ];

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">运营优先级权重设置</h1>
            <p className="mt-2 text-sm text-slate-500">案件运营台的“运营优先级评分”使用这些权重进行计算。</p>
          </div>
          <AdminTabs />
          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}
          {loading && isAdmin && <p className="text-sm text-slate-500">加载中...</p>}
          {isAdmin && !loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-4">
                {rows.map(([key, label, hint]) => (
                  <div key={key} className="grid gap-2 md:grid-cols-[220px_120px_1fr] md:items-center">
                    <label className="text-sm font-medium text-slate-800">{label}</label>
                    <input
                      type="number"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={form[key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500">{hint}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    setMsg(null);
                    try {
                      const r = await fetch("/api/marketplace/admin/ops-priority-settings", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(form),
                      });
                      const data = await r.json();
                      if (!r.ok) throw new Error(data.error || "保存失败");
                      setMsg("已保存");
                    } catch (e) {
                      setMsg(e instanceof Error ? e.message : "保存失败");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm text-indigo-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存权重"}
                </button>
                <button type="button" onClick={() => setForm(DEFAULTS)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">恢复默认</button>
                {msg && <span className="text-sm text-slate-600">{msg}</span>}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

