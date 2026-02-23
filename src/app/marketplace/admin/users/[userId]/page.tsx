"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default function AdminUserDetailPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = viewer.user?.role === "ADMIN";

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { setLoading(false); return; }
    fetch(`/api/marketplace/admin/users/${userId}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d; })
      .then((d) => setData(d.user))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, userId]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">用户详情</h1>
            </div>
            <Link href="/marketplace/admin/users" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">返回用户列表</Link>
          </div>
          <AdminTabs />
          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <p className="text-sm text-rose-700">{error}</p>}
          {data && (
            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">基础信息</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                  <div><span className="text-slate-500">User ID</span><p className="break-all">{data.id}</p></div>
                  <div><span className="text-slate-500">邮箱</span><p>{data.email}</p></div>
                  <div><span className="text-slate-500">角色</span><p>{data.role}</p></div>
                  <div><span className="text-slate-500">最后登录</span><p>{data.auth?.lastSignInAt ? new Date(data.auth.lastSignInAt).toLocaleString() : "未记录"}</p></div>
                  <div><span className="text-slate-500">状态</span><p>{data.auth?.disabled ? "DISABLED" : "ACTIVE"}</p></div>
                  <div><span className="text-slate-500">创建时间</span><p>{new Date(data.createdAt).toLocaleString()}</p></div>
                </div>
              </section>
              {data.clientProfile && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">发布方档案</h2>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                    <div><span className="text-slate-500">Client Profile ID</span><p className="break-all">{data.clientProfile.id}</p></div>
                    <div><span className="text-slate-500">姓名</span><p>{[data.clientProfile.firstName, data.clientProfile.lastName].filter(Boolean).join(" ") || "未填写"}</p></div>
                    <div><span className="text-slate-500">电话</span><p>{data.clientProfile.phone || "未填写"}</p></div>
                    <div><span className="text-slate-500">ZIP</span><p>{data.clientProfile.zipCode || "未填写"}</p></div>
                    <div><span className="text-slate-500">语言</span><p>{data.clientProfile.preferredLanguage || "未填写"}</p></div>
                    <div><span className="text-slate-500">案件/会话</span><p>{data.clientProfile._count?.cases ?? 0} / {data.clientProfile._count?.conversations ?? 0}</p></div>
                  </div>
                </section>
              )}
              {data.attorneyProfile && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">律师档案</h2>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                    <div><span className="text-slate-500">Attorney Profile ID</span><p className="break-all">{data.attorneyProfile.id}</p></div>
                    <div><span className="text-slate-500">姓名</span><p>{[data.attorneyProfile.firstName, data.attorneyProfile.lastName].filter(Boolean).join(" ") || "未填写"}</p></div>
                    <div><span className="text-slate-500">律所</span><p>{data.attorneyProfile.firmName || "未填写"}</p></div>
                    <div><span className="text-slate-500">执照号</span><p>{data.attorneyProfile.barLicenseNumber || "未填写"}</p></div>
                    <div><span className="text-slate-500">平台认证</span><p>{data.attorneyProfile.isVerified ? "已认证" : "未认证"}</p></div>
                    <div><span className="text-slate-500">执照核验</span><p>{data.attorneyProfile.barNumberVerified ? "已核验" : "未核验"}</p></div>
                  </div>
                  <div className="mt-3">
                    <Link href={`/marketplace/admin/attorneys/${data.attorneyProfile.id}`} className="text-sm underline">打开律师详情页</Link>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

