"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";

type Row = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  firmName: string | null;
  barState: string | null;
  barLicenseNumber: string | null;
  barVerificationStatus: string;
  identityVerificationStatus: string;
  identityDocumentType: string | null;
  identityDocumentFileName: string | null;
  registeredLegalName: string | null;
  barRegisteredName: string | null;
  profileCompletenessScore: number;
};

export default function AdminAttorneyTrustPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [onlyPending, setOnlyPending] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (onlyPending) sp.set("onlyPending", "1");
    const r = await fetch(`/api/marketplace/admin/attorney-trust?${sp.toString()}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setItems(j.items ?? []);
  }
  useEffect(() => { void load(); }, [onlyPending]);

  async function act(attorneyId: string, target: "identity" | "bar", action: "verify" | "needs_info" | "reject") {
    const note = window.prompt("审核备注（可选）") ?? "";
    const r = await fetch(`/api/marketplace/admin/attorneys/${attorneyId}/trust-actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, action, note }),
    });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "操作成功" : `操作失败：${j.error || "Unknown"}`);
    if (r.ok) void load();
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <AdminTabs />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索律师/执照号" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button onClick={() => void load()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-white">搜索</button>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />仅看待审核</label>
          </div>
          {msg && <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm">{msg}</div>}
          <div className="grid gap-3">
            {items.map((x) => (
              <div key={x.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{[x.firstName, x.lastName].filter(Boolean).join(" ") || "Attorney"} · {x.firmName || "Independent"}</p>
                    <p className="mt-1 text-xs text-slate-500">Bar {x.barState || "N/A"} · {x.barLicenseNumber || "N/A"} · 完整度 {x.profileCompletenessScore}/100</p>
                    <p className="mt-1 text-xs text-slate-500">实名状态：{x.identityVerificationStatus}（证件：{x.identityDocumentType || "N/A"} / {x.identityDocumentFileName || "未上传"}）</p>
                    <p className="mt-1 text-xs text-slate-500">Bar状态：{x.barVerificationStatus} · 注册姓名：{x.barRegisteredName || "未填"} · 证件姓名：{x.registeredLegalName || "未填"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button onClick={() => void act(x.id, "identity", "verify")} className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-700">实名通过</button>
                    <button onClick={() => void act(x.id, "identity", "needs_info")} className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700">实名补件</button>
                    <button onClick={() => void act(x.id, "bar", "verify")} className="rounded-lg border border-blue-300 bg-blue-50 px-2 py-1 text-blue-700">Bar通过</button>
                    <button onClick={() => void act(x.id, "bar", "needs_info")} className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700">Bar补件</button>
                    <button onClick={() => void act(x.id, "identity", "reject")} className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-rose-700">实名拒绝</button>
                    <button onClick={() => void act(x.id, "bar", "reject")} className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-rose-700">Bar拒绝</button>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">暂无记录</div>}
          </div>
        </div>
      </main>
    </>
  );
}

