"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";

type ReviewRow = {
  id: string;
  status: string;
  ratingOverall: number;
  ratingResponsiveness: number | null;
  ratingProfessionalism: number | null;
  ratingCommunication: number | null;
  wouldRecommend: boolean | null;
  comment: string | null;
  moderationReason: string | null;
  moderationLabels: string[] | null;
  createdAt: string;
  attorney: { id: string; firstName: string | null; lastName: string | null; firmName: string | null };
  case: { id: string; title: string } | null;
};

export default function AdminAttorneyReviewModerationPage() {
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  async function load() {
    const sp = new URLSearchParams();
    sp.set("status", status);
    if (q.trim()) sp.set("q", q.trim());
    const r = await fetch(`/api/marketplace/admin/attorney-reviews?${sp.toString()}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setItems(j.items ?? []);
  }
  useEffect(() => { void load(); }, [status]);
  async function act(reviewId: string, action: "publish" | "hide") {
    const reason = window.prompt(action === "hide" ? "隐藏原因（必填建议）" : "恢复发布备注（可选）") ?? "";
    const r = await fetch(`/api/marketplace/admin/attorney-reviews/${reviewId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
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
          <div className="mb-4 flex flex-wrap gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="ALL">全部状态</option>
              <option value="PUBLISHED">已发布</option>
              <option value="HIDDEN">已隐藏</option>
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索评论/案件/律师" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button onClick={() => void load()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-white">搜索</button>
          </div>
          {msg && <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm">{msg}</div>}
          <div className="grid gap-3">
            {items.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {[r.attorney.firstName, r.attorney.lastName].filter(Boolean).join(" ") || "Attorney"} · {r.case?.title || "未关联案件"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">状态 {r.status} · 评分 {r.ratingOverall}/5 · {new Date(r.createdAt).toLocaleString()}</p>
                    <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{r.comment || "（无文字评价）"}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2 py-1">响应 {r.ratingResponsiveness ?? "-"}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1">专业 {r.ratingProfessionalism ?? "-"}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1">沟通 {r.ratingCommunication ?? "-"}</span>
                      {r.wouldRecommend != null && <span className="rounded-full bg-slate-100 px-2 py-1">{r.wouldRecommend ? "愿意推荐" : "不推荐"}</span>}
                      {(r.moderationLabels ?? []).map((lb) => <span key={lb} className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">{lb}</span>)}
                    </div>
                    {r.moderationReason && <p className="mt-2 text-xs text-rose-700">审核原因：{r.moderationReason}</p>}
                  </div>
                  <div className="flex flex-col gap-2 text-xs">
                    <button onClick={() => void act(r.id, "publish")} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-700">发布</button>
                    <button onClick={() => void act(r.id, "hide")} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-rose-700">隐藏</button>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">暂无评价记录</div>}
          </div>
        </div>
      </main>
    </>
  );
}

