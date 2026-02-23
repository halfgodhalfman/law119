"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { AdminTabs } from "@/components/admin/admin-tabs";

type UserItem = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastSignInAt: string | null;
  profileName?: string;
  clientProfile?: { id: string; phone?: string | null } | null;
  attorneyProfile?: {
    id: string;
    isVerified: boolean;
    barNumberVerified: boolean;
    barState?: string | null;
    _count?: { bids: number; conversations: number };
  } | null;
};

export default function AdminUsersPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [actioning, setActioning] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});

  const isAdmin = viewer.user?.role === "ADMIN";

  function setFeedback(id: string, msg: string) {
    setRowMsg((m) => ({ ...m, [id]: msg }));
    setTimeout(() => setRowMsg((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    }), 1800);
  }

  async function runUserAction(userId: string, action: "enable" | "disable" | "set_role", nextRole?: string) {
    setActioning(userId);
    try {
      const r = await fetch(`/api/marketplace/admin/users/${userId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, role: nextRole }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "操作失败");
      setItems((prev) => prev.map((it) => (
        it.id === userId
          ? {
              ...it,
              ...(data.user?.status ? { status: data.user.status } : {}),
              ...(data.user?.role ? { role: data.user.role } : {}),
            }
          : it
      )));
      setFeedback(userId, "已更新");
    } catch (e) {
      setFeedback(userId, e instanceof Error ? e.message : "操作失败");
    } finally {
      setActioning(null);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    fetch(`/api/marketplace/admin/users?${params.toString()}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed");
        return data;
      })
      .then((data) => {
        setItems(data.items ?? []);
        setMeta({
          page: data.filters?.page ?? 1,
          totalPages: data.filters?.totalPages ?? 1,
          total: data.filters?.total ?? 0,
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, q, role, status, page, pageSize]);

  useEffect(() => setPage(1), [q, role, status, pageSize]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">用户管理</h1>
            <p className="mt-2 text-sm text-slate-500">列表、筛选、角色调整、启用/禁用。</p>
          </div>
          <AdminTabs />

          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索邮箱/ID" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部角色</option>
              <option value="CLIENT">CLIENT</option>
              <option value="ATTORNEY">ATTORNEY</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">全部状态</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </select>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value={20}>20/页</option>
              <option value={50}>50/页</option>
            </select>
            <span className="text-sm text-slate-500">共 {meta.total} 条</span>
          </div>

          {loading && isAdmin && <p className="text-sm text-slate-500">加载用户中...</p>}
          {error && isAdmin && <p className="text-sm text-rose-700">加载失败：{error}</p>}

          <div className="grid gap-4">
            {items.map((u) => (
              <article key={u.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{u.role}</span>
                      <span className={`rounded-full px-2 py-1 text-xs ${u.status === "DISABLED" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{u.status}</span>
                      {u.attorneyProfile && <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700">律师账号</span>}
                      {u.clientProfile && <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">发布方账号</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{u.profileName || "未填写姓名"}</p>
                    <p className="text-sm text-slate-700 break-all">{u.email}</p>
                    <p className="mt-1 text-xs text-slate-500 break-all">User ID: {u.id}</p>
                    <p className="mt-1 text-xs text-slate-500">最近登录：{u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString() : "未记录"}</p>
                    {u.attorneyProfile && (
                      <p className="mt-1 text-xs text-slate-500">
                        律师认证：{u.attorneyProfile.isVerified ? "已认证" : "未认证"} · 执照：{u.attorneyProfile.barNumberVerified ? "已核验" : "未核验"} {u.attorneyProfile.barState ? `· ${u.attorneyProfile.barState}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => runUserAction(u.id, "enable")} disabled={actioning === u.id || u.status === "ACTIVE"} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 disabled:opacity-50">启用</button>
                      <button type="button" onClick={() => runUserAction(u.id, "disable")} disabled={actioning === u.id || u.status === "DISABLED"} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 disabled:opacity-50">禁用</button>
                    </div>
                    <select
                      value={u.role}
                      onChange={(e) => void runUserAction(u.id, "set_role", e.target.value)}
                      disabled={actioning === u.id}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
                    >
                      <option value="CLIENT">CLIENT</option>
                      <option value="ATTORNEY">ATTORNEY</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    {u.attorneyProfile && (
                      <Link href={`/marketplace/admin/attorneys?q=${encodeURIComponent(u.email)}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-center hover:bg-slate-50">
                        查看律师档案
                      </Link>
                    )}
                    <Link href={`/marketplace/admin/users/${u.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-center hover:bg-slate-50">
                      用户详情
                    </Link>
                    {rowMsg[u.id] && <p className="text-xs text-slate-600 text-center">{rowMsg[u.id]}</p>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">上一页</button>
            <p className="text-sm text-slate-500">第 {meta.page} / {meta.totalPages} 页</p>
            <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">下一页</button>
          </div>
        </div>
      </main>
    </>
  );
}
