"use client";

import { useEffect, useState } from "react";

type Prefs = {
  emailInstantHighPriority: boolean;
  emailInstantNewMessages: boolean;
  emailInstantCaseMatches: boolean;
  emailDailyDigest: boolean;
  emailWeeklyDigest: boolean;
  inAppP0: boolean;
  inAppP1: boolean;
  inAppP2: boolean;
  inAppP3: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  preferredCaseCategories: string[];
  preferredBudgetMin: string;
  preferredBudgetMax: string;
  preferredFeeModes: string[];
};

const DEFAULT: Prefs = {
  emailInstantHighPriority: true,
  emailInstantNewMessages: true,
  emailInstantCaseMatches: true,
  emailDailyDigest: true,
  emailWeeklyDigest: true,
  inAppP0: true,
  inAppP1: true,
  inAppP2: true,
  inAppP3: false,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  preferredCaseCategories: [],
  preferredBudgetMin: "",
  preferredBudgetMax: "",
  preferredFeeModes: [],
};

const CATEGORY_OPTIONS = ["IMMIGRATION", "FAMILY", "BUSINESS", "CIVIL", "CRIMINAL", "LABOR", "OTHER"];
const FEE_MODE_OPTIONS = ["CONSULTATION", "AGENCY", "STAGED", "HOURLY", "CUSTOM"];

export function AttorneyNotificationPreferencesPanel() {
  const [form, setForm] = useState<Prefs>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      const r = await fetch("/api/attorney/notification-preferences", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!canceled && r.ok && j.preferences) setForm({ ...DEFAULT, ...j.preferences });
      if (!canceled) setLoading(false);
    })();
    return () => {
      canceled = true;
    };
  }, []);

  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleArr = (key: "preferredCaseCategories" | "preferredFeeModes", val: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val],
    }));

  async function save() {
    setSaving(true);
    setMsg(null);
    const r = await fetch("/api/attorney/notification-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    setMsg(r.ok ? "通知偏好已保存" : `保存失败：${j.error || "Unknown error"}`);
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">加载通知偏好中...</div>;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">通知偏好设置（Email / 站内 / Quiet Hours）</h2>
          <p className="mt-1 text-sm text-slate-500">按优先级配置通知，避免打扰，同时保留高价值案件与高风险事件的即时提醒。</p>
        </div>
        <button onClick={() => void save()} disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
          {saving ? "保存中..." : "保存偏好"}
        </button>
      </div>
      {msg && <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">{msg}</div>}

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Email 通知策略</h3>
          {[
            ["emailInstantHighPriority", "即时通知：高价值案件/被选中/争议/风控动作"],
            ["emailInstantNewMessages", "即时通知：客户新消息"],
            ["emailInstantCaseMatches", "即时通知：新匹配案件"],
            ["emailDailyDigest", "每日汇总（Digest）"],
            ["emailWeeklyDigest", "每周汇总（周报）"],
          ].map(([k, label]) => (
            <label key={k} className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={Boolean(form[k as keyof Prefs])} onChange={(e) => set(k as keyof Prefs, e.target.checked as never)} />
              <span>{label}</span>
            </label>
          ))}

          <div className="rounded-xl border border-slate-200 p-4">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.quietHoursEnabled} onChange={(e) => set("quietHoursEnabled", e.target.checked)} />
              <span>
                启用 Quiet Hours（免打扰）
                <span className="mt-1 block text-xs text-slate-500">P0 紧急事件可突破免打扰（如争议、风控处罚、退款/处罚结果）。</span>
              </span>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-slate-500">开始时间</span>
                <input type="time" disabled={!form.quietHoursEnabled} value={form.quietHoursStart} onChange={(e) => set("quietHoursStart", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-slate-500">结束时间</span>
                <input type="time" disabled={!form.quietHoursEnabled} value={form.quietHoursEnd} onChange={(e) => set("quietHoursEnd", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100" />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">站内 Push / 通知优先级</h3>
          {[
            ["inAppP0", "P0：被选中 / 争议 / 退款 / 风控处罚"],
            ["inAppP1", "P1：客户新消息 / 委托确认 / 里程碑审核"],
            ["inAppP2", "P2：推荐案件 / 截止提醒"],
            ["inAppP3", "P3：统计周报 / 运营活动"],
          ].map(([k, label]) => (
            <label key={k} className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={Boolean(form[k as keyof Prefs])} onChange={(e) => set(k as keyof Prefs, e.target.checked as never)} />
              <span>{label}</span>
            </label>
          ))}

          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="text-sm font-semibold text-slate-900">接单偏好（影响推荐提醒）</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((c) => (
                <button key={c} type="button" onClick={() => toggleArr("preferredCaseCategories", c)} className={`rounded-full border px-2.5 py-1 text-xs ${form.preferredCaseCategories.includes(c) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input value={form.preferredBudgetMin} onChange={(e) => set("preferredBudgetMin", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="预算最低值（USD）" />
              <input value={form.preferredBudgetMax} onChange={(e) => set("preferredBudgetMax", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="预算最高值（USD）" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {FEE_MODE_OPTIONS.map((m) => (
                <button key={m} type="button" onClick={() => toggleArr("preferredFeeModes", m)} className={`rounded-full border px-2.5 py-1 text-xs ${form.preferredFeeModes.includes(m) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

