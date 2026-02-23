"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";

type RuleConfig = {
  id: string;
  scope: string;
  ruleCode: string;
  enabled: boolean;
  action: string;
  severity: string;
  pattern: string;
  patternType: string;
  description: string | null;
  sortOrder: number;
};

export default function AdminContentRulesPage() {
  const [items, setItems] = useState<RuleConfig[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [scope, setScope] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [previewScope, setPreviewScope] = useState<"CASE_POST" | "BID_SUBMISSION" | "CHAT_MESSAGE">("CHAT_MESSAGE");
  const [previewText, setPreviewText] = useState("请加我微信 wechat123，我们私下谈价格。");
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (scope) params.set("scope", scope);
    const r = await fetch(`/api/marketplace/admin/content-rules?${params.toString()}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || "加载失败");
      setLoading(false);
      return;
    }
    setItems(j.items ?? []);
    setStats(j.stats ?? []);
    setError(null);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [scope]);

  const save = async (item: RuleConfig) => {
    setSavingId(item.id);
    const r = await fetch("/api/marketplace/admin/content-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const j = await r.json().catch(() => ({}));
    setSavingId(null);
    if (!r.ok) {
      setError(j.error || "保存失败");
      return;
    }
    await load();
  };

  const runPreview = async () => {
    setPreviewing(true);
    const r = await fetch("/api/marketplace/admin/content-rules/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: previewScope, text: previewText }),
    });
    const j = await r.json().catch(() => ({}));
    setPreviewing(false);
    if (!r.ok) {
      setError(j.error || "预览失败");
      return;
    }
    setError(null);
    setPreviewResult(j);
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">规则引擎配置台</h1>
            <p className="mt-2 text-sm text-slate-500">可配置敏感词、站外导流、违法需求识别规则，支持启停与动作级别。</p>
          </div>
          <AdminTabs />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部作用域</option>
              <option value="CASE_POST">案件发布</option>
              <option value="BID_SUBMISSION">报价提交</option>
              <option value="CHAT_MESSAGE">会话消息</option>
            </select>
          </div>
          {error && <p className="mb-3 text-sm text-rose-700">{error}</p>}
          {loading ? <p className="text-sm text-slate-500">加载规则中...</p> : (
            <>
              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">命中统计（Top）</h2>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {stats.slice(0, 10).map((s, idx) => (
                    <div key={`${s.scope}-${s.ruleCode}-${idx}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <p className="font-medium text-slate-900">{s.ruleCode}</p>
                      <p className="text-xs text-slate-500">{s.scope} · {s.action}</p>
                      <p className="mt-1 text-xs text-slate-600">命中 {s._count?._all ?? 0} 次</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">命中预览测试器</h2>
                    <p className="mt-1 text-xs text-slate-500">输入测试文本，使用当前“已启用规则配置”进行实时命中预览（不写入命中日志）。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void runPreview()}
                    disabled={previewing}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {previewing ? "测试中..." : "运行预览"}
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
                  <select value={previewScope} onChange={(e) => setPreviewScope(e.target.value as any)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="CASE_POST">CASE_POST</option>
                    <option value="BID_SUBMISSION">BID_SUBMISSION</option>
                    <option value="CHAT_MESSAGE">CHAT_MESSAGE</option>
                  </select>
                  <textarea
                    rows={4}
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="输入一段案件描述、报价文本或聊天消息，检查规则命中..."
                  />
                </div>
                {previewResult && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 p-3 text-sm">
                      <p className="font-medium text-slate-900">预览结果摘要</p>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <p>Scope: {previewResult.scope}</p>
                        <p>命中数: {previewResult.summary?.hits?.length ?? 0}</p>
                        <p>是否拦截: {(previewResult.summary?.hasBlock ?? false) ? "是" : "否"}</p>
                        <p>是否复核: {(previewResult.summary?.hasReview ?? false) ? "是" : "否"}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3 text-sm">
                      <p className="font-medium text-slate-900">警告/复核提示</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
                        {(previewResult.summary?.warnings ?? []).length ? (
                          (previewResult.summary?.warnings ?? []).map((w: string, idx: number) => <li key={`${w}-${idx}`}>{w}</li>)
                        ) : (
                          <li>无</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
                {previewResult?.summary?.hits?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {previewResult.summary.hits.map((h: any, idx: number) => (
                      <div key={`${h.ruleCode}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                        <p className="font-medium text-slate-900">{h.ruleCode} · {h.action} · {h.severity}</p>
                        <p className="mt-1 text-slate-600">{h.note}</p>
                        {h.matchedText && <p className="mt-1 text-slate-500">Matched: <span className="font-mono">{h.matchedText}</span></p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">规则列表</h2>
                <div className="mt-4 space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="grid gap-3 md:grid-cols-6">
                        <input value={item.ruleCode} onChange={(e) => setItems((arr) => arr.map((x) => x.id === item.id ? { ...x, ruleCode: e.target.value } : x))} className="rounded border border-slate-300 px-2 py-1.5 text-xs md:col-span-2" />
                        <select value={item.scope} onChange={(e) => setItems((arr) => arr.map((x) => x.id === item.id ? { ...x, scope: e.target.value } : x))} className="rounded border border-slate-300 px-2 py-1.5 text-xs">
                          <option value="CASE_POST">CASE_POST</option><option value="BID_SUBMISSION">BID_SUBMISSION</option><option value="CHAT_MESSAGE">CHAT_MESSAGE</option>
                        </select>
                        <select value={item.action} onChange={(e) => setItems((arr) => arr.map((x) => x.id === item.id ? { ...x, action: e.target.value } : x))} className="rounded border border-slate-300 px-2 py-1.5 text-xs">
                          <option value="ALLOW">ALLOW</option><option value="WARN">WARN</option><option value="REVIEW">REVIEW</option><option value="BLOCK">BLOCK</option>
                        </select>
                        <input value={item.severity} onChange={(e) => setItems((arr) => arr.map((x) => x.id === item.id ? { ...x, severity: e.target.value } : x))} className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
                        <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={item.enabled} onChange={(e) => setItems((arr) => arr.map((x) => x.id === item.id ? { ...x, enabled: e.target.checked } : x))} />启用</label>
                        <input value={item.pattern} onChange={(e) => setItems((arr) => arr.map((x) => x.id === item.id ? { ...x, pattern: e.target.value } : x))} className="rounded border border-slate-300 px-2 py-1.5 text-xs md:col-span-5" />
                        <input value={item.description ?? ""} onChange={(e) => setItems((arr) => arr.map((x) => x.id === item.id ? { ...x, description: e.target.value } : x))} className="rounded border border-slate-300 px-2 py-1.5 text-xs md:col-span-4" />
                        <select value={item.patternType} onChange={(e) => setItems((arr) => arr.map((x) => x.id === item.id ? { ...x, patternType: e.target.value } : x))} className="rounded border border-slate-300 px-2 py-1.5 text-xs">
                          <option value="regex">regex</option><option value="contains">contains</option>
                        </select>
                        <input type="number" value={item.sortOrder} onChange={(e) => setItems((arr) => arr.map((x) => x.id === item.id ? { ...x, sortOrder: Number(e.target.value || 0) } : x))} className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button type="button" disabled={savingId === item.id} onClick={() => void save(item)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                          {savingId === item.id ? "保存中..." : "保存规则"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
