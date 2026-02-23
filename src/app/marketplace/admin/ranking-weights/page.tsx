"use client";

import { useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type Config = {
  enabled: boolean;
  activeVariant: "A" | "B";
  abEnabled: boolean;
  abRolloutPercent: number;
  weightUnquotedA: number; weightUnquotedB: number;
  weightQuoteableA: number; weightQuoteableB: number;
  weightSoonDeadlineA: number; weightSoonDeadlineB: number;
  weightUrgentA: number; weightUrgentB: number;
  weightHighA: number; weightHighB: number;
  weightCategoryMatchA: number; weightCategoryMatchB: number;
  weightStateMatchA: number; weightStateMatchB: number;
  weightRecencyMaxBoostA: number; weightRecencyMaxBoostB: number;
  weightBidCrowdingPenaltyA: number; weightBidCrowdingPenaltyB: number;
  bidCrowdingPenaltyCapA: number; bidCrowdingPenaltyCapB: number;
  categoryWhitelist: string[];
  categoryBlacklist: string[];
  nonWhitelistPenalty: number;
  blacklistPenalty: number;
  whitelistBoost: number;
  attorneyExposureSoftCap: number;
  attorneyExposurePenaltyPerExtra: number;
  highRiskPenalty: number;
  highRiskRuleHitThreshold: number;
  highRiskReportThreshold: number;
  highRiskDisputeThreshold: number;
  maxPerCategoryInTopN: number;
  categoryExposureWindow: number;
};

const NUMERIC_FIELDS = [
  ["weightUnquoted", "未报价优先"],
  ["weightQuoteable", "可报价"],
  ["weightSoonDeadline", "24h内截止"],
  ["weightUrgent", "紧急度 URGENT"],
  ["weightHigh", "紧急度 HIGH"],
  ["weightCategoryMatch", "类目匹配"],
  ["weightStateMatch", "服务州匹配"],
  ["weightRecencyMaxBoost", "新案加权上限"],
  ["weightBidCrowdingPenalty", "报价拥挤惩罚(每条)"],
  ["bidCrowdingPenaltyCap", "报价拥挤惩罚上限"],
] as const;

export default function AdminRankingWeightsPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const isAdmin = viewer.user?.role === "ADMIN";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<Config | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/marketplace/admin/recommendation-config");
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error || "加载失败");
    } else {
      const c = j.config;
      setForm({
        ...c,
        categoryWhitelist: Array.isArray(c.categoryWhitelist) ? c.categoryWhitelist : [],
        categoryBlacklist: Array.isArray(c.categoryBlacklist) ? c.categoryBlacklist : [],
      });
      setMsg(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { setLoading(false); return; }
    void load();
  }, [authLoading, isAdmin]);

  const whitelistText = useMemo(() => (form?.categoryWhitelist ?? []).join(", "), [form?.categoryWhitelist]);
  const blacklistText = useMemo(() => (form?.categoryBlacklist ?? []).join(", "), [form?.categoryBlacklist]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin Ranking Weights</h1>
            <p className="mt-2 text-sm text-slate-500">配置 CaseHall 推荐排序权重、A/B 开关、类目曝光规则、律师曝光限制与高风险降权。</p>
          </div>
          <AdminTabs />
          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}
          {loading && isAdmin && <p className="text-sm text-slate-500">加载中...</p>}
          {isAdmin && form && !loading && (
            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">A/B 开关与实验配置</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={(e)=>setForm((f)=>f && ({ ...f, enabled: e.target.checked }))} />启用推荐配置</label>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"><input type="checkbox" checked={form.abEnabled} onChange={(e)=>setForm((f)=>f && ({ ...f, abEnabled: e.target.checked }))} />启用 A/B 实验</label>
                  <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.activeVariant} onChange={(e)=>setForm((f)=>f && ({ ...f, activeVariant: e.target.value as 'A' | 'B' }))}>
                    <option value="A">固定 Variant A</option>
                    <option value="B">固定 Variant B</option>
                  </select>
                  <label className="text-sm text-slate-700">A/B 流量占比(B)%
                    <input type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.abRolloutPercent} onChange={(e)=>setForm((f)=>f && ({ ...f, abRolloutPercent: Number(e.target.value)||0 }))} />
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">推荐权重配置（A / B）</h2>
                <div className="mt-3 grid gap-2">
                  {NUMERIC_FIELDS.map(([base, label]) => (
                    <div key={base} className="grid gap-2 md:grid-cols-[220px_120px_120px_1fr] md:items-center">
                      <span className="text-sm text-slate-800">{label}</span>
                      <input type="number" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={(form as any)[`${base}A`]} onChange={(e)=>setForm((f)=>f && ({ ...f, [`${base}A`]: Number(e.target.value)||0 } as any))} />
                      <input type="number" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={(form as any)[`${base}B`]} onChange={(e)=>setForm((f)=>f && ({ ...f, [`${base}B`]: Number(e.target.value)||0 } as any))} />
                      <span className="text-xs text-slate-500">A / B</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <h2 className="text-sm font-semibold text-slate-900">类目曝光规则（白名单 / 黑名单）</h2>
                  <label className="block text-sm text-slate-700">白名单类目（逗号分隔）
                    <textarea className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={whitelistText} onChange={(e)=>setForm((f)=>f && ({ ...f, categoryWhitelist: e.target.value.split(',').map(v=>v.trim()).filter(Boolean) }))} />
                  </label>
                  <label className="block text-sm text-slate-700">黑名单类目（逗号分隔）
                    <textarea className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={blacklistText} onChange={(e)=>setForm((f)=>f && ({ ...f, categoryBlacklist: e.target.value.split(',').map(v=>v.trim()).filter(Boolean) }))} />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="text-xs text-slate-600">白名单加权<input type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.whitelistBoost} onChange={(e)=>setForm((f)=>f && ({ ...f, whitelistBoost: Number(e.target.value)||0 }))} /></label>
                    <label className="text-xs text-slate-600">非白名单惩罚<input type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.nonWhitelistPenalty} onChange={(e)=>setForm((f)=>f && ({ ...f, nonWhitelistPenalty: Number(e.target.value)||0 }))} /></label>
                    <label className="text-xs text-slate-600">黑名单惩罚<input type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.blacklistPenalty} onChange={(e)=>setForm((f)=>f && ({ ...f, blacklistPenalty: Number(e.target.value)||0 }))} /></label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-slate-600">类目曝光上限（Top N 内单类最多）<input type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.maxPerCategoryInTopN} onChange={(e)=>setForm((f)=>f && ({ ...f, maxPerCategoryInTopN: Number(e.target.value)||0 }))} /></label>
                    <label className="text-xs text-slate-600">类目曝光窗口（Top N）<input type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.categoryExposureWindow} onChange={(e)=>setForm((f)=>f && ({ ...f, categoryExposureWindow: Number(e.target.value)||1 }))} /></label>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <h2 className="text-sm font-semibold text-slate-900">律师曝光限制与高风险降权</h2>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-slate-600">律师曝光软上限（活跃负载）<input type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.attorneyExposureSoftCap} onChange={(e)=>setForm((f)=>f && ({ ...f, attorneyExposureSoftCap: Number(e.target.value)||0 }))} /></label>
                    <label className="text-xs text-slate-600">每超 1 个负载惩罚<input type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.attorneyExposurePenaltyPerExtra} onChange={(e)=>setForm((f)=>f && ({ ...f, attorneyExposurePenaltyPerExtra: Number(e.target.value)||0 }))} /></label>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <label className="text-xs text-slate-600">高风险降权<input type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.highRiskPenalty} onChange={(e)=>setForm((f)=>f && ({ ...f, highRiskPenalty: Number(e.target.value)||0 }))} /></label>
                    <label className="text-xs text-slate-600">规则命中阈值<input type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.highRiskRuleHitThreshold} onChange={(e)=>setForm((f)=>f && ({ ...f, highRiskRuleHitThreshold: Number(e.target.value)||0 }))} /></label>
                    <label className="text-xs text-slate-600">举报阈值<input type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.highRiskReportThreshold} onChange={(e)=>setForm((f)=>f && ({ ...f, highRiskReportThreshold: Number(e.target.value)||0 }))} /></label>
                    <label className="text-xs text-slate-600">争议阈值<input type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.highRiskDisputeThreshold} onChange={(e)=>setForm((f)=>f && ({ ...f, highRiskDisputeThreshold: Number(e.target.value)||0 }))} /></label>
                  </div>
                </div>
              </section>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={saving} onClick={async()=>{
                    if (!form) return;
                    setSaving(true); setMsg(null);
                    const r = await fetch('/api/marketplace/admin/recommendation-config', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
                    const j = await r.json().catch(()=>({}));
                    setSaving(false);
                    setMsg(r.ok ? '已保存推荐配置' : (j.error || '保存失败'));
                    if (r.ok) await load();
                  }} className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm text-indigo-700 disabled:opacity-50">{saving ? '保存中...' : '保存 RecommendationConfig'}</button>
                  {msg && <span className="text-sm text-slate-600">{msg}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
