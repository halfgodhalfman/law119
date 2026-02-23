"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default function AdminSupportTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/marketplace/support-tickets/${ticketId}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || "加载失败");
      setLoading(false);
      return;
    }
    setData(j);
    setError(null);
    setLoading(false);
  };

  useEffect(() => { if (ticketId) void load(); }, [ticketId]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    const r = await fetch(`/api/marketplace/support-tickets/${ticketId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply, isInternalNote: internalNote }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error || "发送失败");
      return;
    }
    setMsg("已发送");
    setReply("");
    setInternalNote(false);
    await load();
  };

  const patchStatus = async (status: string) => {
    const r = await fetch(`/api/marketplace/support-tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error || "更新失败");
      return;
    }
    setMsg("状态已更新");
    await load();
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">客服消息单详情</h1>
          </div>
          <AdminTabs />
          <div className="mb-4 flex gap-2">
            <Link href="/marketplace/admin/support-tickets" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">返回列表</Link>
          </div>
          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          {msg && <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{msg}</div>}
          {data && (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{data.ticket.status}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">{data.ticket.priority}</span>
                  <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700">{data.ticket.category}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-900">{data.ticket.subject}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["PENDING_CLIENT","PENDING_PLATFORM","RESOLVED","CLOSED"].map((s) => (
                    <button key={s} type="button" onClick={() => void patchStatus(s)} className="rounded border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50">{s}</button>
                  ))}
                </div>
              </section>
              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">消息记录</h3>
                <div className="mt-3 space-y-3">
                  {data.ticket.messages.map((m: any) => (
                    <div key={m.id} className={`rounded-xl border p-3 ${m.isInternalNote ? "border-rose-200 bg-rose-50" : m.senderRole === "ADMIN" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
                      <p className="text-xs text-slate-500">{m.senderRole} · {m.sender.email} · {new Date(m.createdAt).toLocaleString()}</p>
                      {m.isInternalNote && <p className="mt-1 text-[11px] font-semibold text-rose-700">内部备注（用户不可见）</p>}
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{m.body}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">回复 / 内部备注</h3>
                <textarea rows={5} value={reply} onChange={(e) => setReply(e.target.value)} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={internalNote} onChange={(e) => setInternalNote(e.target.checked)} />
                  作为内部备注（客户不可见）
                </label>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => void sendReply()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">发送</button>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}

