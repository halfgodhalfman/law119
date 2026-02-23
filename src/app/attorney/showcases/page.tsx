"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { AttorneyTabs } from "@/components/attorney/attorney-tabs";

type Showcase = {
  id: string;
  caseType: string;
  summaryMasked: string;
  serviceProvided: string;
  outcomeCategory: string;
  jurisdiction: string | null;
  year: number | null;
  evidenceOptional: string | null;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  sortOrder: number;
};

const blank = {
  id: "",
  caseType: "",
  summaryMasked: "",
  serviceProvided: "",
  outcomeCategory: "",
  jurisdiction: "",
  year: "",
  evidenceOptional: "",
  status: "DRAFT" as const,
  sortOrder: 0,
};

export default function AttorneyShowcasesPage() {
  const [items, setItems] = useState<Showcase[]>([]);
  const [form, setForm] = useState<any>(blank);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/attorney/showcases", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setItems(j.items ?? []);
  }
  useEffect(() => { void load(); }, []);

  async function submit(action: "create" | "update") {
    setMsg(null);
    const r = await fetch("/api/attorney/showcases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        id: form.id || undefined,
        ...form,
        year: form.year ? Number(form.year) : null,
        jurisdiction: form.jurisdiction || null,
        evidenceOptional: form.evidenceOptional || null,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? (action === "create" ? "案例已创建" : "案例已更新") : `失败：${j.error || "Unknown"}`);
    if (r.ok) {
      setForm(blank);
      await load();
    }
  }

  async function remove(id: string) {
    if (!confirm("删除该案例展示？")) return;
    const r = await fetch("/api/attorney/showcases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (r.ok) await load();
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <AttorneyTabs />
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">成功案例管理（匿名化）</h1>
            <p className="mt-2 text-sm text-slate-500">展示服务经验，不展示可识别信息，不做结果保证表述。</p>
            {msg && <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">{msg}</div>}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="案例类型（Practice Area）" value={form.caseType} onChange={(e) => setForm((f: any) => ({ ...f, caseType: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="处理结果类型（批准/和解/撤诉等）" value={form.outcomeCategory} onChange={(e) => setForm((f: any) => ({ ...f, outcomeCategory: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="律师提供服务内容" value={form.serviceProvided} onChange={(e) => setForm((f: any) => ({ ...f, serviceProvided: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="司法辖区（可选）" value={form.jurisdiction} onChange={(e) => setForm((f: any) => ({ ...f, jurisdiction: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="年份（可选）" value={form.year} onChange={(e) => setForm((f: any) => ({ ...f, year: e.target.value }))} />
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.value }))}>
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">发布</option>
                <option value="HIDDEN">隐藏</option>
              </select>
              <textarea className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} placeholder="案件背景（匿名化）" value={form.summaryMasked} onChange={(e) => setForm((f: any) => ({ ...f, summaryMasked: e.target.value }))} />
              <input className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="可选证据说明（不上传敏感资料）" value={form.evidenceOptional} onChange={(e) => setForm((f: any) => ({ ...f, evidenceOptional: e.target.value }))} />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => void submit(form.id ? "update" : "create")} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">{form.id ? "更新案例" : "新增案例"}</button>
              {form.id && <button onClick={() => setForm(blank)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">取消编辑</button>}
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">我的案例展示</h2>
            <div className="mt-4 grid gap-3">
              {items.length === 0 && <p className="text-sm text-slate-500">暂无案例展示</p>}
              {items.map((it) => (
                <div key={it.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{it.caseType} · {it.outcomeCategory}</p>
                      <p className="mt-1 text-xs text-slate-500">状态 {it.status} · {it.year ?? "Year N/A"} · {it.jurisdiction ?? "Jurisdiction N/A"}</p>
                      <p className="mt-2 text-sm text-slate-700">{it.summaryMasked}</p>
                      <p className="mt-2 text-xs text-slate-600">服务内容：{it.serviceProvided}</p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => setForm({ ...it, year: it.year ?? "", jurisdiction: it.jurisdiction ?? "", evidenceOptional: it.evidenceOptional ?? "" })} className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50">编辑</button>
                      <button onClick={() => void remove(it.id)} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-rose-700">删除</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

