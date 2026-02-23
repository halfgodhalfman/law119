"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NavBar } from "@/components/ui/nav-bar";
import { ClientTabs } from "@/components/client/client-tabs";

type TicketDetail = {
  ticket: {
    id: string;
    subject: string;
    status: string;
    priority: string;
    category: string;
    createdAt: string;
    updatedAt: string;
    slaDueAt?: string | null;
    assignedAdmin?: { email?: string | null } | null;
    attachments?: Array<{ id: string; fileName: string | null; url: string; mimeType?: string | null; sizeBytes?: number | null; uploaderUserId: string }>;
    messages: Array<{
      id: string;
      senderRole: string;
      body: string;
      createdAt: string;
      isInternalNote: boolean;
      sender: { email: string; role: string };
      attachments?: Array<{ id: string; fileName: string | null; url: string; mimeType?: string | null; sizeBytes?: number | null }>;
    }>;
  };
};

export default function SupportTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [data, setData] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ id: string; fileName: string | null; url: string; mimeType?: string | null; sizeBytes?: number | null }>>([]);
  const [uploading, setUploading] = useState(false);

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
    setPendingAttachments((j.ticket?.attachments ?? []) as any[]);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (ticketId) void load();
  }, [ticketId]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    setMsg(null);
    const r = await fetch(`/api/marketplace/support-tickets/${ticketId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply, attachmentIds: pendingAttachments.map((a) => a.id) }),
    });
    const j = await r.json().catch(() => ({}));
    setSending(false);
    if (!r.ok) {
      setMsg(j.error || "发送失败");
      return;
    }
    setReply("");
    setPendingAttachments([]);
    setMsg("已发送");
    await load();
  };

  const uploadAttachments = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setMsg(null);
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));
    const r = await fetch(`/api/marketplace/support-tickets/${ticketId}/attachments`, { method: "POST", body: form });
    const j = await r.json().catch(() => ({}));
    setUploading(false);
    if (!r.ok) {
      setMsg(j.error || "附件上传失败");
      return;
    }
    setPendingAttachments((prev) => [...prev, ...((j.items ?? []) as any[])]);
    setMsg("附件已上传，发送回复后会一并提交");
  };

  const removeAttachment = async (attachmentId: string) => {
    const r = await fetch(`/api/marketplace/support-tickets/${ticketId}/attachments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachmentId }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error || "删除附件失败");
      return;
    }
    setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <ClientTabs />
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Support Ticket</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">联系客服消息单详情</h1>
            </div>
            <div className="flex gap-2">
              <Link href="/marketplace/support-tickets" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">返回客服消息单</Link>
              <Link href="/marketplace/support-center" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">支持中心</Link>
            </div>
          </div>

          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          {msg && <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{msg}</div>}

          {data && (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{data.ticket.status}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">{data.ticket.priority}</span>
                  <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700">{data.ticket.category}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-900">{data.ticket.subject}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  创建时间：{new Date(data.ticket.createdAt).toLocaleString()} · 更新时间：{new Date(data.ticket.updatedAt).toLocaleString()}
                </p>
                {data.ticket.slaDueAt && (
                  <p className="mt-1 text-xs text-amber-700">SLA 截止：{new Date(data.ticket.slaDueAt).toLocaleString()}</p>
                )}
                {data.ticket.assignedAdmin?.email && (
                  <p className="mt-1 text-xs text-slate-500">当前跟进平台账号：{data.ticket.assignedAdmin.email}</p>
                )}
              </section>

              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">沟通记录</h3>
                <div className="mt-3 space-y-3">
                  {data.ticket.messages.map((m) => (
                    <div key={m.id} className={`rounded-xl border p-3 ${m.senderRole === "ADMIN" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
                      <p className="text-xs text-slate-500">{m.senderRole} · {m.sender.email} · {new Date(m.createdAt).toLocaleString()}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{m.body}</p>
                      {!!m.attachments?.length && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.attachments.map((a) => (
                            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs underline">
                              {a.fileName || "附件"}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">回复平台</h3>
                <textarea
                  rows={5}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="补充问题细节、截图说明、期待平台处理方式..."
                  className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="mt-3 rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700">附件（截图 / PDF）</p>
                    <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50">
                      {uploading ? "上传中..." : "上传附件"}
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          void uploadAttachments(e.target.files);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">发送回复后附件会绑定到这条消息。</p>
                  {pendingAttachments.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {pendingAttachments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-2 text-xs">
                          <a href={a.url} target="_blank" rel="noreferrer" className="truncate underline">
                            {a.fileName || a.id}
                          </a>
                          <button type="button" onClick={() => void removeAttachment(a.id)} className="text-rose-600 underline">删除</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">暂无待发送附件</p>
                  )}
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => void sendReply()} disabled={sending || !reply.trim()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {sending ? "发送中..." : "发送回复"}
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
