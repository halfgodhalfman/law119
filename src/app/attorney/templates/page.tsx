// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const SERVICE_BOUNDARIES = [
  { value: "CONSULTATION", label: "法律咨询" },
  { value: "DOCUMENT_PREP", label: "文书准备" },
  { value: "COURT_APPEARANCE", label: "出庭代理" },
  { value: "FULL_REPRESENTATION", label: "全权代理" },
  { value: "CUSTOM", label: "自定义" },
];
const FEE_MODES = [
  { value: "CONSULTATION", label: "咨询费" },
  { value: "AGENCY", label: "代理费" },
  { value: "STAGED", label: "分期" },
  { value: "HOURLY", label: "按小时" },
  { value: "CUSTOM", label: "自定义" },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: "", serviceBoundary: "CUSTOM", serviceScopeSummary: "", feeMode: "CUSTOM", feeAmountMin: "", feeAmountMax: "", isDefault: false });
  const [saving, setSaving] = useState(false);

  async function loadTemplates() {
    setLoading(true);
    const res = await fetch("/api/attorney/templates");
    const data = await res.json();
    setTemplates(data.templates || []);
    setLoading(false);
  }
  useEffect(() => { loadTemplates(); }, []);

  async function handleSave() {
    setSaving(true);
    const url = editingId ? `/api/attorney/templates/${editingId}` : "/api/attorney/templates";
    const method = editingId ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm({ title: "", serviceBoundary: "CUSTOM", serviceScopeSummary: "", feeMode: "CUSTOM", feeAmountMin: "", feeAmountMax: "", isDefault: false });
    loadTemplates();
  }

  async function handleDelete(id) {
    if (!confirm("确认删除此模板？")) return;
    await fetch(`/api/attorney/templates/${id}`, { method: "DELETE" });
    loadTemplates();
  }

  function startEdit(t) {
    setForm({ title: t.title, serviceBoundary: t.serviceBoundary, serviceScopeSummary: t.serviceScopeSummary, feeMode: t.feeMode, feeAmountMin: t.feeAmountMin || "", feeAmountMax: t.feeAmountMax || "", isDefault: t.isDefault });
    setEditingId(t.id);
    setShowForm(true);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">合同模板库</h1>
          <p className="text-sm text-gray-500">保存常用的服务范围模板，快速创建委托确认</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: "", serviceBoundary: "CUSTOM", serviceScopeSummary: "", feeMode: "CUSTOM", feeAmountMin: "", feeAmountMax: "", isDefault: false }); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">新建模板</button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mt-6 rounded-lg border p-4">
          <h3 className="mb-4 font-medium">{editingId ? "编辑模板" : "新建模板"}</h3>
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="模板名称 *" className="w-full rounded border px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.serviceBoundary} onChange={e => setForm(f => ({ ...f, serviceBoundary: e.target.value }))} className="rounded border px-3 py-2 text-sm">
                {SERVICE_BOUNDARIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={form.feeMode} onChange={e => setForm(f => ({ ...f, feeMode: e.target.value }))} className="rounded border px-3 py-2 text-sm">
                {FEE_MODES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <textarea value={form.serviceScopeSummary} onChange={e => setForm(f => ({ ...f, serviceScopeSummary: e.target.value }))} placeholder="服务范围描述 *" rows={4} className="w-full rounded border px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={form.feeAmountMin} onChange={e => setForm(f => ({ ...f, feeAmountMin: e.target.value }))} placeholder="最低费用 ($)" className="rounded border px-3 py-2 text-sm" />
              <input type="number" value={form.feeAmountMax} onChange={e => setForm(f => ({ ...f, feeAmountMax: e.target.value }))} placeholder="最高费用 ($)" className="rounded border px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} /> 设为默认模板</label>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || !form.title || !form.serviceScopeSummary} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "保存中..." : "保存"}</button>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">加载中...</div>
      ) : templates.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed p-8 text-center text-gray-400">
          <p>暂无模板，点击"新建模板"开始</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {templates.map((t: any) => (
            <div key={t.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-medium">{t.title}</span>
                  {t.isDefault && <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">默认</span>}
                  <div className="mt-1 flex gap-2 text-xs text-gray-500">
                    <span className="rounded bg-gray-100 px-2 py-0.5">{SERVICE_BOUNDARIES.find(s => s.value === t.serviceBoundary)?.label || t.serviceBoundary}</span>
                    <span>{FEE_MODES.find(f => f.value === t.feeMode)?.label || t.feeMode}</span>
                    {t.feeAmountMin && t.feeAmountMax && <span>${Number(t.feeAmountMin).toFixed(0)} - ${Number(t.feeAmountMax).toFixed(0)}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(t)} className="text-xs text-blue-600 hover:underline">编辑</button>
                  <button onClick={() => handleDelete(t.id)} className="text-xs text-red-600 hover:underline">删除</button>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">{t.serviceScopeSummary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
