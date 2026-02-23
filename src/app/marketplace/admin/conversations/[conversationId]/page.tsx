"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default function AdminConversationDetailPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);
  const isAdmin = viewer.user?.role === "ADMIN";

  async function load() {
    const r = await fetch(`/api/marketplace/admin/conversations/${conversationId}`);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Failed");
    setData(d.conversation);
  }

  async function runAction(action: "close" | "reopen" | "mark_complaint" | "clear_flags") {
    setActioning(true);
    setActionMsg(null);
    try {
      const r = await fetch(`/api/marketplace/admin/conversations/${conversationId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setActionMsg("已更新");
      await load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "操作失败");
    } finally {
      setActioning(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { setLoading(false); return; }
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed")).finally(() => setLoading(false));
  }, [authLoading, isAdmin, conversationId]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p><h1 className="mt-1 text-2xl font-bold text-slate-900">会话详情</h1></div>
            <div className="flex gap-2">
              <Link href="/marketplace/admin/conversations" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">返回会话列表</Link>
              <Link href={`/chat/${conversationId}`} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">打开会话</Link>
            </div>
          </div>
          <AdminTabs />
          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <p className="text-sm text-rose-700">{error}</p>}
          {data && (
            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{data.status}</span>
                      {data.consultationAcceptedAt && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">已接受咨询</span>}
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">{data.case?.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{data.case?.category} · {data.case?.status} · {data.case?.stateCode}</p>
                    <p className="mt-1 text-xs text-slate-500 break-all">Conversation ID: {data.id} · Bid: {data.bidId} · Case: {data.caseId}</p>
                    <p className="mt-1 text-sm text-slate-600">律师：{[data.attorney?.firstName, data.attorney?.lastName].filter(Boolean).join(" ") || "未填写"}（{data.attorney?.user?.email}）</p>
                    <p className="mt-1 text-sm text-slate-600">发布方：{data.client ? [data.client.firstName, data.client.lastName].filter(Boolean).join(" ") || "未填写" : "匿名"}{data.client?.user?.email ? `（${data.client.user.email}）` : ""}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href={`/marketplace/admin/cases/${data.caseId}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">案件详情</Link>
                    <Link href={`/marketplace/admin/bids/${data.bidId}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">报价详情</Link>
                    <Link href={`/marketplace/admin/attorneys/${data.attorneyProfileId}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">律师详情</Link>
                  </div>
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">管理操作</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto] items-start">
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="投诉/审核备注" />
                  <button type="button" disabled={actioning} onClick={() => void runAction(data.status === "OPEN" ? "close" : "reopen")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50">{data.status === "OPEN" ? "关闭会话" : "重开会话"}</button>
                  <button type="button" disabled={actioning} onClick={() => void runAction("mark_complaint")} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">标记投诉</button>
                  <button type="button" disabled={actioning} onClick={() => void runAction("clear_flags")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs">清除标记</button>
                </div>
                {actionMsg && <p className="mt-3 text-sm text-slate-600">{actionMsg}</p>}
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">最近消息（100条）</h3>
                <div className="mt-3 space-y-2">
                  {(data.messages ?? []).map((m: any) => (
                    <div key={m.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{m.senderRole}</span>
                          {m.senderUserId && <span className="text-xs text-slate-500 break-all">{m.senderUserId}</span>}
                        </div>
                        <span className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-slate-700">{m.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

