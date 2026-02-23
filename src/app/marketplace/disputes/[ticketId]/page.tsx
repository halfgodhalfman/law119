"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";

type TicketDetail = {
  id: string;
  status: string;
  priority: string;
  category: string;
  title: string;
  description: string;
  conversationId: string | null;
  caseId: string | null;
  bidId: string | null;
  slaDueAt: string | null;
  firstResponseAt: string | null;
  createdAt: string;
  updatedAt: string;
  case: { title: string } | null;
  messages: Array<{ id: string; body: string; createdAt: string; senderRole: string; isTemplate: boolean; isInternalNote: boolean; sender: { email: string } }>;
};

export default function DisputeTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/marketplace/disputes/${ticketId}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || "加载失败");
      setLoading(false);
      return;
    }
    setTicket(j.ticket);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (ticketId) void load();
  }, [ticketId]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    const r = await fetch(`/api/marketplace/disputes/${ticketId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const j = await r.json().catch(() => ({}));
    setSending(false);
    if (!r.ok) {
      setError(j.error || "发送失败");
      return;
    }
    setBody("");
    await load();
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Dispute Ticket</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">争议工单详情</h1>
            </div>
            <div className="flex gap-2">
              <Link href="/marketplace/admin/disputes" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">后台工单列表</Link>
              {ticket?.conversationId && <Link href={`/chat/${ticket.conversationId}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">打开会话</Link>}
            </div>
          </div>

          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          {ticket && (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mb-5">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{ticket.status}</span>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">{ticket.priority}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">{ticket.category}</span>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{ticket.title}</h2>
                {ticket.case && <p className="mt-1 text-sm text-slate-500">案件：{ticket.case.title}</p>}
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>
                <p className="mt-3 text-xs text-slate-500">SLA 截止：{ticket.slaDueAt ? new Date(ticket.slaDueAt).toLocaleString() : "未设置"} · 首次响应：{ticket.firstResponseAt ? new Date(ticket.firstResponseAt).toLocaleString() : "未响应"}</p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mb-5">
                <h3 className="text-lg font-semibold text-slate-900">工单沟通记录</h3>
                <div className="mt-4 space-y-3">
                  {ticket.messages.map((m) => (
                    <div key={m.id} className={`rounded-lg border p-3 ${m.isInternalNote ? "border-purple-200 bg-purple-50" : "border-slate-200"}`}>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2 py-1">{m.senderRole}</span>
                        {m.isTemplate && <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">模板回复</span>}
                        {m.isInternalNote && <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700">内部备注</span>}
                        <span className="text-slate-500">{m.sender.email}</span>
                        <span className="text-slate-400">{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{m.body}</p>
                    </div>
                  ))}
                  {ticket.messages.length === 0 && <p className="text-sm text-slate-500">暂无记录。</p>}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">追加说明</h3>
                <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="补充争议说明、证据说明或回复平台..." />
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => void send()} disabled={sending || !body.trim()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {sending ? "发送中..." : "发送"}
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}

