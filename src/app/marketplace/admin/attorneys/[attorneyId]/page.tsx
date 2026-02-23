"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default function AdminAttorneyDetailPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const params = useParams<{ attorneyId: string }>();
  const attorneyId = params.attorneyId;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const isAdmin = viewer.user?.role === "ADMIN";

  const runReviewAction = async (action: string, templateKey?: string) => {
    setActioning(action);
    setMsg(null);
    try {
      const r = await fetch(`/api/marketplace/admin/attorneys/${attorneyId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, templateKey }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "操作失败");
      setMsg("审核已更新");
      const detail = await fetch(`/api/marketplace/admin/attorneys/${attorneyId}`);
      const dj = await detail.json().catch(() => ({}));
      if (detail.ok) setData(dj.attorney);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "操作失败");
    } finally {
      setActioning(null);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { setLoading(false); return; }
    fetch(`/api/marketplace/admin/attorneys/${attorneyId}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d; })
      .then((d) => setData(d.attorney))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, attorneyId]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">律师详情</h1>
            </div>
            <Link href="/marketplace/admin/attorneys" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">返回律师列表</Link>
          </div>
          <AdminTabs />
          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <p className="text-sm text-rose-700">{error}</p>}
          {msg && <p className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{msg}</p>}
          {data && (
            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">审核工作台</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      状态：{data.reviewQueue?.displayStatus || data.reviewStatus} · 完整度 {data.completeness ?? data.profileCompletenessScore ?? 0}%
                    </p>
                    {data.reviewQueue?.needsReReview && (
                      <p className="mt-1 text-xs text-orange-700">检测到资料更新时间晚于上次审核，建议复审。</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button disabled={!!actioning} onClick={() => void runReviewAction("review_approve", "APPROVE_STANDARD")} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 disabled:opacity-50">通过</button>
                    <button disabled={!!actioning} onClick={() => void runReviewAction("review_request_info", "REQUEST_MORE_INFO")} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 disabled:opacity-50">补充材料</button>
                    <button disabled={!!actioning} onClick={() => void runReviewAction("review_reject", "REJECT_INCOMPLETE")} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 disabled:opacity-50">拒绝</button>
                    <button disabled={!!actioning} onClick={() => void runReviewAction("mark_rereview")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs disabled:opacity-50">标记复审</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-800">审核项 checklist</p>
                    <div className="mt-2 space-y-2">
                      {(data.reviewChecklist?.items ?? []).map((item: any) => (
                        <div key={item.key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                          <span className="text-slate-700">{item.label}</span>
                          <span className={item.passed ? "text-emerald-700" : "text-rose-700"}>
                            {item.passed ? `已填写（${item.detail}）` : `缺失（${item.detail}）`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-800">审核历史</p>
                    <div className="mt-2 space-y-2">
                      {(data.reviewLogs ?? []).map((log: any) => (
                        <div key={log.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs">
                          <p className="font-medium text-slate-800">{log.action}{log.toStatus ? ` -> ${log.toStatus}` : ""}</p>
                          <p className="text-slate-500">{new Date(log.createdAt).toLocaleString()} · {log.adminUser?.email || "System"}</p>
                          {log.templateKey && <p className="text-slate-600">模板：{log.templateKey}</p>}
                          {log.reason && <p className="text-slate-600">原因：{log.reason}</p>}
                        </div>
                      ))}
                      {(data.reviewLogs ?? []).length === 0 && <p className="text-xs text-slate-500">暂无审核历史</p>}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">档案信息</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                  <div><span className="text-slate-500">姓名</span><p>{[data.firstName, data.lastName].filter(Boolean).join(" ") || "未填写"}</p></div>
                  <div><span className="text-slate-500">邮箱</span><p>{data.user?.email}</p></div>
                  <div><span className="text-slate-500">头像</span><p>{data.avatarUrl ? "已上传" : "未上传"}</p></div>
                  <div><span className="text-slate-500">律所</span><p>{data.firmName || "未填写"}</p></div>
                  <div><span className="text-slate-500">执照号</span><p>{data.barLicenseNumber || "未填写"}</p></div>
                  <div><span className="text-slate-500">平台认证</span><p>{data.isVerified ? "已认证" : "未认证"}</p></div>
                  <div><span className="text-slate-500">执照核验</span><p>{data.barNumberVerified ? "已核验" : "未核验"}</p></div>
                  <div><span className="text-slate-500">州</span><p>{data.barState || "未填写"}</p></div>
                  <div><span className="text-slate-500">经验</span><p>{typeof data.yearsExperience === "number" ? `${data.yearsExperience} 年` : "未填写"}</p></div>
                  <div><span className="text-slate-500">最近审核人</span><p>{data.lastReviewedBy?.email || "—"}</p></div>
                  <div><span className="text-slate-500">最近审核时间</span><p>{data.lastReviewedAt ? new Date(data.lastReviewedAt).toLocaleString() : "—"}</p></div>
                </div>
                {data.bio && <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{data.bio}</p>}
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">执业区域 / 擅长类目 / 语言</h2>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex flex-wrap gap-2">{(data.serviceAreas ?? []).map((s: any, i: number) => <span key={i} className="rounded-full border border-slate-200 px-2 py-1 text-xs">{s.stateCode}{s.zipCode ? `-${s.zipCode}` : ""}</span>)}</div>
                  <div className="flex flex-wrap gap-2">{(data.specialties ?? []).map((s: any, i: number) => <span key={i} className="rounded-full border border-slate-200 px-2 py-1 text-xs">{s.category}</span>)}</div>
                  <div className="flex flex-wrap gap-2">{(data.languages ?? []).map((s: any, i: number) => <span key={i} className="rounded-full border border-slate-200 px-2 py-1 text-xs">{s.language}</span>)}</div>
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">最近报价 / 会话</h2>
                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">最近报价</p>
                    <div className="space-y-2">
                      {(data.bids ?? []).map((b: any) => (
                        <div key={b.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                          <p className="font-medium">{b.case.title}</p>
                          <p className="text-xs text-slate-500">{b.id} · {b.status} · v{b.version}</p>
                          <Link href={`/marketplace/admin/bids/${b.id}`} className="mt-1 inline-block text-xs underline">报价详情</Link>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">最近会话</p>
                    <div className="space-y-2">
                      {(data.conversations ?? []).map((c: any) => (
                        <div key={c.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                          <p className="font-medium">{c.case.title}</p>
                          <p className="text-xs text-slate-500">{c.id} · {c.status}</p>
                          <div className="mt-1 flex gap-2">
                            <Link href={`/marketplace/admin/conversations/${c.id}`} className="text-xs underline">后台详情</Link>
                            <Link href={`/chat/${c.id}`} className="text-xs underline">打开会话</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
