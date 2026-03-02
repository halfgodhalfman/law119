"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ScalesIcon } from "./icons";

type DevActor = { key: "client" | "attorney" | "admin"; role: string; label: string };

export function NavBar() {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [viewerRole, setViewerRole] = useState<"CLIENT" | "ATTORNEY" | "ADMIN" | null>(null);
  const [devCurrent, setDevCurrent] = useState<DevActor | null>(null);
  const [devActors, setDevActors] = useState<DevActor[]>([]);
  const [devOpen, setDevOpen] = useState(false);
  const [devSwitching, setDevSwitching] = useState(false);
  const devRef = useRef<HTMLDivElement>(null);

  // Load viewer role + unread notifications
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const me = await fetch("/api/marketplace/me", { cache: "no-store" }).catch(() => null);
      if (me?.ok && mounted) {
        const j = await me.json().catch(() => ({}));
        if (mounted) setViewerRole(j?.user?.role ?? null);
      }
      const r = await fetch("/api/marketplace/notifications?pageSize=1", { cache: "no-store" }).catch(() => null);
      if (!r || !mounted) return;
      if (!r.ok) { if (r.status === 401) setUnreadCount(null); return; }
      const j = await r.json().catch(() => ({}));
      if (mounted) setUnreadCount(j.summary?.unreadCount ?? 0);
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 10000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  // Load dev actors (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    let mounted = true;
    fetch("/api/dev/auth-switch", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (mounted && j.enabled) { setDevCurrent(j.current ?? null); setDevActors(j.actors ?? []); } })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Close dev dropdown on outside click
  useEffect(() => {
    if (!devOpen) return;
    const handler = (e: MouseEvent) => {
      if (devRef.current && !devRef.current.contains(e.target as Node)) setDevOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [devOpen]);

  const switchDevActor = async (key: "client" | "attorney" | "admin") => {
    setDevSwitching(true);
    try {
      await fetch("/api/dev/auth-switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actor: key }) });
      window.location.reload();
    } catch { setDevSwitching(false); }
  };

  const isAttorney = viewerRole === "ATTORNEY";
  const isAdmin = viewerRole === "ADMIN";
  const isClient = viewerRole === "CLIENT";
  const isLoggedIn = Boolean(viewerRole);

  // Primary CTA changes based on role
  const primaryCta =
    isAttorney ? { href: "/marketplace/case-hall", label: "案件大厅", labelEn: "Case Hall" }
    : isAdmin   ? { href: "/marketplace/admin/dashboard", label: "管理后台", labelEn: "Admin" }
    : isClient  ? { href: "/marketplace/post-case", label: "发布案件", labelEn: "Post Case" }
    :             { href: "/marketplace/post-case", label: "免费发案", labelEn: "Post Case" };

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ─────────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="h-8 w-8 bg-amber-600 rounded-lg flex items-center justify-center group-hover:bg-amber-500 transition-colors">
              <ScalesIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-white font-bold text-sm tracking-tight leading-tight">美国华人119找律师网</span>
              <span className="text-amber-400 text-[10px] font-semibold tracking-wider uppercase hidden sm:block">Law119</span>
            </div>
          </Link>

          {/* ── Center Nav Links (desktop) ───────────────────── */}
          <div className="hidden md:flex items-center gap-1">

            {/* Public links — shown to guests and clients */}
            {!isAttorney && !isAdmin && (
              <>
                <Link href="/services" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">全部服务</Link>
                <Link href="/attorneys" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">找律师</Link>
                <Link href="/qa" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-amber-400 rounded-full" />
                  免费问答
                </Link>
                <Link href="/forms" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5">
                  📄 法律文书
                </Link>
                <Link
                  href={isClient ? "/marketplace/uscis-cases" : "/uscis"}
                  className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  🛂 USCIS 追踪
                </Link>
                <Link
                  href="/legal-aid"
                  className="text-emerald-400 hover:text-emerald-300 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  🤝 法律援助
                </Link>
                <Link
                  href="/emergency"
                  className="text-rose-400 hover:text-rose-300 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-pulse" />
                  紧急求助
                </Link>
                {isClient && (
                  <Link href="/marketplace/client-center" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">客户后台</Link>
                )}
                {!isLoggedIn && (
                  <>
                    <Link href="/about" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">关于我们</Link>
                    <Link href="/for-attorneys" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">律师入驻</Link>
                  </>
                )}
              </>
            )}

            {/* Attorney links */}
            {isAttorney && (
              <>
                <Link href="/attorney/dashboard" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">律师后台</Link>
                <Link href="/marketplace/case-hall" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">案件大厅</Link>
                <Link href="/attorney/qa" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">回答问题</Link>
                <Link href="/attorney/tasks" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">任务中心</Link>
                <Link href="/attorney/service-packages" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1">🤝 援助服务</Link>
                <Link href="/attorney/referrals" className="text-amber-400 hover:text-amber-300 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1">↔ 转介绍</Link>
              </>
            )}

            {/* Admin links */}
            {isAdmin && (
              <>
                <Link href="/marketplace/admin/dashboard" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">管理看板</Link>
                <Link href="/marketplace/admin/support-inbox" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">统一工单台</Link>
                <Link href="/marketplace/admin/qa" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">Q&A管理</Link>
                <Link href="/marketplace/admin/audit" className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">审计中心</Link>
              </>
            )}

            {/* Notification bell — logged-in users only */}
            {isLoggedIn && (
              <Link
                href="/marketplace/notifications"
                className="relative text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                通知
                {typeof unreadCount === "number" && unreadCount > 0 && (
                  <span className="ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Dev switcher — dev environment only, shown once here */}
            {process.env.NODE_ENV !== "production" && devActors.length > 0 && (
              <div className="relative" ref={devRef}>
                <button
                  type="button"
                  onClick={() => setDevOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {devCurrent?.role ?? "Dev"}
                  <span className="text-xs opacity-70">▾</span>
                </button>
                {devOpen && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-44 rounded-xl border border-slate-700 bg-slate-800 shadow-xl py-1">
                    {devActors.map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        disabled={devSwitching}
                        onClick={() => { setDevOpen(false); void switchDevActor(a.key); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${devCurrent?.key === a.key ? "text-emerald-300 font-semibold" : "text-slate-300"}`}
                      >
                        {devCurrent?.key === a.key ? "✓ " : ""}{a.role}
                      </button>
                    ))}
                    <div className="my-1 border-t border-slate-700" />
                    <Link href="/dev/quick-login" onClick={() => setDevOpen(false)} className="block px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700">
                      Dev 切换页 →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right Actions ────────────────────────────────── */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Login link — guests only */}
            {!isLoggedIn && (
              <Link
                href="/auth/sign-in?role=client"
                className="hidden sm:block text-slate-300 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                登录
              </Link>
            )}

            {/* Mobile: emergency button */}
            <Link
              href="/emergency"
              className="md:hidden flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
              紧急
            </Link>

            {/* Primary CTA */}
            <Link
              href={primaryCta.href}
              className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">{primaryCta.label} / {primaryCta.labelEn}</span>
              <span className="sm:hidden">{primaryCta.label}</span>
            </Link>
          </div>

        </div>
      </div>
    </nav>
  );
}
