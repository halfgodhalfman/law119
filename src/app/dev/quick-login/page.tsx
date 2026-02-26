"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";

type DevActor = {
  key: "client" | "attorney" | "admin";
  email: string;
  role: "CLIENT" | "ATTORNEY" | "ADMIN";
  label: string;
};

type Payload = {
  ok: true;
  enabled: boolean;
  current: DevActor | null;
  actors: DevActor[];
};

const roleDestinations: Record<DevActor["role"], string[]> = {
  CLIENT: ["/", "/marketplace/post-case", "/marketplace/my-cases"],
  ATTORNEY: ["/attorney/dashboard", "/marketplace/case-hall", "/marketplace/my-bids"],
  ADMIN: ["/marketplace/admin/dashboard", "/marketplace/admin/cases", "/marketplace/admin/reports"],
};

export default function DevQuickLoginPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/auth-switch", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Failed");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const switchActor = async (actorKey: DevActor["key"]) => {
    setSwitching(actorKey);
    setError(null);
    try {
      const res = await fetch("/api/dev/auth-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: actorKey }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Switch failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Switch failed");
    } finally {
      setSwitching(null);
    }
  };

  const clearSwitch = async () => {
    setSwitching("clear");
    setError(null);
    try {
      const res = await fetch("/api/dev/auth-switch", { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Clear failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setSwitching(null);
    }
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-10">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Local Dev Tool</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">一键测试账号切换 / Dev Quick Login</h1>
            <p className="mt-2 text-sm text-slate-600">
              仅本地开发环境可用。点击角色按钮后会写入本地 dev cookie，`requireAuthContext` 会使用该身份。
            </p>
          </div>

          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          {data && (
            <>
              <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">当前模拟身份</p>
                {data.current ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {data.current.role}
                    </span>
                    <span className="text-sm font-medium text-slate-900">{data.current.label}</span>
                    <span className="text-xs text-slate-500">{data.current.email}</span>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">未启用 dev 切换（当前走正常登录流程）。</p>
                )}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => void clearSwitch()}
                    disabled={switching !== null}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    清除模拟身份（恢复正常登录）
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {data.actors.map((actor) => (
                  <section key={actor.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {actor.role}
                      </span>
                      {data.current?.key === actor.key && (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                          当前
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-semibold text-slate-900">{actor.label}</h2>
                    <p className="mt-1 break-all text-xs text-slate-500">{actor.email}</p>
                    <button
                      type="button"
                      onClick={() => void switchActor(actor.key)}
                      disabled={switching !== null}
                      className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      {switching === actor.key ? "切换中..." : "切换到此身份"}
                    </button>
                    <div className="mt-4 space-y-1">
                      {roleDestinations[actor.role].map((href) => (
                        <Link key={href} href={href} className="block text-xs text-blue-700 underline">
                          打开 {href}
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

