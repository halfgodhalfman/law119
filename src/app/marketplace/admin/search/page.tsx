"use client";

import { useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type SearchResponse = {
  q?: string;
  results?: {
    cases?: Array<{ id: string; title: string; status: string; category: string; stateCode: string }>;
    users?: Array<{ id: string; email: string; role: string }>;
    attorneys?: Array<{ id: string; firstName: string | null; lastName: string | null; firmName: string | null; isVerified: boolean; user: { email: string } }>;
    bids?: Array<{ id: string; caseId: string; status: string; case: { title: string } }>;
    conversations?: Array<{ id: string; caseId: string; bidId: string; status: string; case: { title: string } }>;
  };
  error?: string;
};

export default function AdminSearchPage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = viewer.user?.role === "ADMIN";

  async function runSearch() {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/marketplace/admin/search?q=${encodeURIComponent(q.trim())}`);
      const json = (await r.json()) as SearchResponse;
      if (!r.ok) throw new Error(json.error || "搜索失败");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "搜索失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">后台全局搜索</h1>
            <p className="mt-2 text-sm text-slate-500">统一搜索用户、律师、案件、报价、会话。</p>
          </div>
          <AdminTabs />
          {!authLoading && !isAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">仅管理员可访问。</div>}
          <div className="mb-5 flex flex-wrap gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void runSearch()} placeholder="输入邮箱 / ID / 案件标题 / 会话关键词" className="min-w-[320px] rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="button" onClick={() => void runSearch()} disabled={loading || !q.trim()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">
              {loading ? "搜索中..." : "搜索"}
            </button>
          </div>
          {error && <p className="text-sm text-rose-700">{error}</p>}

          {data?.results && (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-semibold text-slate-900">案件 ({data.results.cases?.length ?? 0})</h2>
                <div className="mt-3 space-y-2 text-sm">
                  {(data.results.cases ?? []).map((c) => (
                    <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="font-medium text-slate-900">{c.title}</p>
                      <p className="text-xs text-slate-500">{c.id} · {c.category} · {c.stateCode} · {c.status}</p>
                      <div className="mt-2 flex gap-2">
                        <Link href={`/marketplace/admin/cases/${c.id}`} className="text-xs underline">后台详情</Link>
                        <Link href={`/marketplace/cases/${c.id}`} className="text-xs underline">前台详情</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-semibold text-slate-900">用户 ({data.results.users?.length ?? 0})</h2>
                <div className="mt-3 space-y-2 text-sm">
                  {(data.results.users ?? []).map((u) => (
                    <div key={u.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="font-medium text-slate-900">{u.email}</p>
                      <p className="text-xs text-slate-500">{u.id} · {u.role}</p>
                      <Link href={`/marketplace/admin/users/${u.id}`} className="mt-2 inline-block text-xs underline">用户详情</Link>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-semibold text-slate-900">律师 ({data.results.attorneys?.length ?? 0})</h2>
                <div className="mt-3 space-y-2 text-sm">
                  {(data.results.attorneys ?? []).map((a) => (
                    <div key={a.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="font-medium text-slate-900">{[a.firstName, a.lastName].filter(Boolean).join(" ") || "未填写姓名"}</p>
                      <p className="text-xs text-slate-500">{a.user.email} · {a.firmName || "未填写律所"} · {a.isVerified ? "已认证" : "未认证"}</p>
                      <Link href={`/marketplace/admin/attorneys/${a.id}`} className="mt-2 inline-block text-xs underline">律师详情</Link>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-semibold text-slate-900">报价 / 会话</h2>
                <div className="mt-3 space-y-2 text-sm">
                  {(data.results.bids ?? []).map((b) => (
                    <div key={b.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="font-medium text-slate-900">Bid {b.id}</p>
                      <p className="text-xs text-slate-500">{b.case.title} · {b.status}</p>
                      <Link href={`/marketplace/admin/bids/${b.id}`} className="mt-2 inline-block text-xs underline">报价详情</Link>
                    </div>
                  ))}
                  {(data.results.conversations ?? []).map((c) => (
                    <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="font-medium text-slate-900">Conversation {c.id}</p>
                      <p className="text-xs text-slate-500">{c.case.title} · {c.status}</p>
                      <div className="mt-2 flex gap-2">
                        <Link href={`/marketplace/admin/conversations/${c.id}`} className="text-xs underline">后台详情</Link>
                        <Link href={`/chat/${c.id}`} className="text-xs underline">打开会话</Link>
                      </div>
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

