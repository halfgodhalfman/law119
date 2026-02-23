"use client";

import { useEffect, useMemo, useState } from "react";
import { NavBar } from "../../../components/ui/nav-bar";
import { AttorneyTabs } from "../../../components/attorney/attorney-tabs";

type Template = {
  id: string;
  name: string;
  category: string;
  feeMode: string;
  estimatedDays: number | "";
  includesConsultation: boolean;
  serviceScope: string;
  message: string;
  updatedAt: string;
};

const STORAGE_KEY = "law119_attorney_bid_templates_v1";
const CATEGORIES = ["IMMIGRATION", "FAMILY", "BUSINESS", "CIVIL", "CRIMINAL", "LABOR", "REAL_ESTATE", "TAX", "OTHER"];
const FEE_MODES = ["CONSULTATION", "AGENCY", "STAGED", "HOURLY", "CUSTOM"];

const DEFAULT_TEMPLATE: Template = {
  id: "",
  name: "",
  category: "IMMIGRATION",
  feeMode: "CONSULTATION",
  estimatedDays: "",
  includesConsultation: true,
  serviceScope: "",
  message: "",
  updatedAt: "",
};

function loadTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AttorneyBidTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Template>(DEFAULT_TEMPLATE);
  const [msg, setMsg] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("ALL");

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  useEffect(() => {
    if (selectedId) {
      const t = templates.find((x) => x.id === selectedId);
      if (t) setForm(t);
    } else {
      setForm(DEFAULT_TEMPLATE);
    }
  }, [selectedId, templates]);

  const filtered = useMemo(
    () => templates.filter((t) => (filterCategory === "ALL" ? true : t.category === filterCategory)),
    [templates, filterCategory],
  );

  const persist = (next: Template[]) => {
    setTemplates(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveTemplate = () => {
    if (!form.name.trim()) {
      setMsg("模板名称不能为空");
      return;
    }
    if (!form.message.trim()) {
      setMsg("报价说明（message）不能为空");
      return;
    }
    const now = new Date().toISOString();
    if (selectedId) {
      const next = templates.map((t) => (t.id === selectedId ? { ...form, updatedAt: now, id: selectedId } : t));
      persist(next);
      setMsg("模板已更新");
      return;
    }
    const id = `tpl_${Date.now()}`;
    persist([{ ...form, id, updatedAt: now }, ...templates]);
    setSelectedId(id);
    setMsg("模板已创建");
  };

  const deleteTemplate = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    persist(next);
    if (selectedId === id) setSelectedId(null);
    setMsg("模板已删除");
  };

  const duplicateTemplate = (t: Template) => {
    const id = `tpl_${Date.now()}`;
    persist([{ ...t, id, name: `${t.name} (Copy)`, updatedAt: new Date().toISOString() }, ...templates]);
    setMsg("模板已复制");
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <AttorneyTabs />
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Bid Templates</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">报价模板系统（MVP）</h1>
              <p className="mt-2 text-sm text-slate-500">按类目维护预报价模板，提高响应速度与报价一致性。当前为本地模板（浏览器存储）。</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white"
            >
              新建模板
            </button>
          </div>

          {msg && <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{msg}</div>}

          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">模板列表</h2>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                >
                  <option value="ALL">全部类目</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                {filtered.map((t) => (
                  <div
                    key={t.id}
                    className={`rounded-xl border p-3 ${selectedId === t.id ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}
                  >
                    <button type="button" onClick={() => setSelectedId(t.id)} className="w-full text-left">
                      <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{t.category} · {t.feeMode} · {t.includesConsultation ? "含首次咨询" : "不含首次咨询"}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{t.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400">更新于 {new Date(t.updatedAt).toLocaleString()}</p>
                    </button>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => duplicateTemplate(t)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">复制</button>
                      <button type="button" onClick={() => deleteTemplate(t.id)} className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">删除</button>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <p className="text-sm text-slate-500">暂无模板。</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">{selectedId ? "编辑模板" : "新建模板"}</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-slate-700">模板名称</span>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-700">类目</span>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-700">收费模式</span>
                  <select value={form.feeMode} onChange={(e) => setForm((f) => ({ ...f, feeMode: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                    {FEE_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-700">预计天数</span>
                  <input
                    type="number"
                    min={0}
                    value={form.estimatedDays}
                    onChange={(e) => setForm((f) => ({ ...f, estimatedDays: e.target.value ? Number(e.target.value) : "" }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.includesConsultation}
                    onChange={(e) => setForm((f) => ({ ...f, includesConsultation: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  包含首次咨询
                </label>
                <label className="text-sm md:col-span-2">
                  <span className="mb-1 block text-slate-700">服务范围（serviceScope）</span>
                  <textarea rows={4} value={form.serviceScope} onChange={(e) => setForm((f) => ({ ...f, serviceScope: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="text-sm md:col-span-2">
                  <span className="mb-1 block text-slate-700">报价说明模板（message）</span>
                  <textarea rows={8} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={saveTemplate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  {selectedId ? "保存修改" : "创建模板"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(form.message);
                      setMsg("已复制报价说明模板");
                    } catch {
                      setMsg("复制失败");
                    }
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  复制 message
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
