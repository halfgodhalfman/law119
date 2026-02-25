"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/ui/nav-bar";
import { ClientTabs } from "@/components/client/client-tabs";
import { RoleActionsHeader } from "@/components/shared/role-actions-header";

type NotificationItem = {
  id: string;
  type: string;
  status: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  return (<Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">加载中...</div>}><NotificationsInner /></Suspense>);
}

function NotificationsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setStatus(searchParams.get("status") ?? "");
  }, [searchParams]);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const r = await fetch(`/api/marketplace/notifications?${params.toString()}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || "加载通知失败");
      setLoading(false);
      return;
    }
    setItems(j.items ?? []);
    setUnreadCount(j.summary?.unreadCount ?? 0);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await load();
    };
    void run();
    const timer = window.setInterval(() => {
      void run();
    }, 15000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [status]);

  const act = async (action: "mark_read" | "mark_all_read" | "archive", id?: string) => {
    setMsg(null);
    const r = await fetch("/api/marketplace/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error || "操作失败");
      return;
    }
    setMsg(action === "mark_all_read" ? "已全部标记为已读" : "已更新");
    await load();
  };

  const updateStatus = (nextStatus: string) => {
    setStatus(nextStatus);
    const params = new URLSearchParams(searchParams.toString());
    if (nextStatus) params.set("status", nextStatus);
    else params.delete("status");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <ClientTabs />
          <RoleActionsHeader
            eyebrow="Notification Center"
            title="平台通知中心"
            description="接收工单更新、支付状态变更、举报处理结果和平台系统通知。"
            rightActions={
              <button type="button" onClick={() => void act("mark_all_read")} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                全部已读
              </button>
            }
          />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs text-indigo-700">未读 {unreadCount}</span>
            <select value={status} onChange={(e) => updateStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部状态</option>
              <option value="UNREAD">未读</option>
              <option value="READ">已读</option>
              <option value="ARCHIVED">已归档</option>
            </select>
          </div>

          {msg && <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{msg}</div>}
          {loading && <p className="text-sm text-slate-500">加载通知中...</p>}
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          <div className="space-y-3">
            {items.map((n) => (
              <article key={n.id} className={`rounded-2xl border p-4 shadow-sm ${n.status === "UNREAD" ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200 bg-white"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{n.type}</span>
                      <span className={`rounded-full px-2 py-1 text-xs ${n.status === "UNREAD" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>{n.status}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    {n.body && <p className="mt-1 text-xs text-slate-600">{n.body}</p>}
                    <p className="mt-1 text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</p>
                    {n.linkUrl && (
                      <div className="mt-2 text-xs">
                        <Link href={n.linkUrl} className="underline">打开相关页面</Link>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {n.status === "UNREAD" && (
                      <button type="button" onClick={() => void act("mark_read", n.id)} className="rounded border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50">
                        标记已读
                      </button>
                    )}
                    {n.status !== "ARCHIVED" && (
                      <button type="button" onClick={() => void act("archive", n.id)} className="rounded border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50">
                        归档
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {!loading && !items.length && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                暂无通知。
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
