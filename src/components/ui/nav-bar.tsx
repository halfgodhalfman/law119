 "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScalesIcon } from "./icons";

export function NavBar() {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [viewerRole, setViewerRole] = useState<"CLIENT" | "ATTORNEY" | "ADMIN" | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const me = await fetch("/api/marketplace/me", { cache: "no-store" }).catch(() => null);
      if (me && me.ok && mounted) {
        const meJson = await me.json().catch(() => ({}));
        if (mounted) setViewerRole(meJson?.user?.role ?? null);
      }
      const r = await fetch("/api/marketplace/notifications?pageSize=1", { cache: "no-store" }).catch(() => null);
      if (!r || !mounted) return;
      if (!r.ok) {
        if (r.status === 401) setUnreadCount(null);
        return;
      }
      const j = await r.json().catch(() => ({}));
      if (!mounted) return;
      setUnreadCount(j.summary?.unreadCount ?? 0);
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const primaryCta =
    viewerRole === "ATTORNEY"
      ? { href: "/marketplace/case-hall", desktop: "案件大厅 / Case Hall", mobile: "大厅" }
      : viewerRole === "ADMIN"
        ? { href: "/marketplace/admin/dashboard", desktop: "管理后台 / Admin", mobile: "后台" }
        : { href: "/case/new", desktop: "发布案件 / Post Case", mobile: "发案" };
  const isAttorney = viewerRole === "ATTORNEY";
  const isAdmin = viewerRole === "ADMIN";
  const isClient = viewerRole === "CLIENT";

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 bg-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500 transition-colors">
              <ScalesIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-white font-bold text-sm tracking-tight leading-tight">美国华人119找律师网</span>
              <span className="text-amber-400 text-[10px] font-semibold tracking-wider uppercase hidden sm:block">
                Law119
              </span>
            </div>
          </Link>

          {/* Nav Links - Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {!isAttorney && !isAdmin && (
              <>
                <Link
                  href="/services"
                  className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
                >
                  全部服务
                </Link>
                <Link
                  href="/emergency"
                  className="text-rose-400 hover:text-rose-300 text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-pulse" />
                  紧急求助
                </Link>
                <Link
                  href="/about"
                  className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
                >
                  关于我们
                </Link>
              </>
            )}
            {isAttorney && (
              <>
                <Link href="/attorney/dashboard" className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-800">律师后台</Link>
                <Link href="/marketplace/case-hall" className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-800">案件大厅</Link>
                <Link href="/attorney/tasks" className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-800">任务中心</Link>
              </>
            )}
            {isAdmin && (
              <>
                <Link href="/marketplace/admin/dashboard" className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-800">管理看板</Link>
                <Link href="/marketplace/admin/support-inbox" className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-800">统一工单台</Link>
                <Link href="/marketplace/admin/audit" className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-800">审计中心</Link>
              </>
            )}
            <Link
              href="/marketplace/notifications"
              className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-800 relative"
            >
              通知
              {typeof unreadCount === "number" && unreadCount > 0 && (
                <span className="ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            {!isAttorney && !isAdmin && (
              <Link
                href="/for-attorneys"
                className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
              >
                律师入驻
              </Link>
            )}
            {!isAdmin && (
              <Link
                href="/auth/sign-in?role=admin&mode=signin"
                className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
              >
                后台登录
              </Link>
            )}
            {process.env.NODE_ENV !== "production" && (
              <Link
                href="/dev/quick-login"
                className="text-emerald-300 hover:text-emerald-200 text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
              >
                Dev 切换
              </Link>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!viewerRole && (
              <Link
                href="/auth/sign-in?role=client"
                className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-2 py-1.5 hidden sm:block"
              >
                登录
              </Link>
            )}
            <Link
              href="/marketplace/notifications"
              className="hidden lg:block text-slate-300 hover:text-white text-xs font-medium transition-colors px-2 py-1.5 rounded-md border border-slate-700 hover:border-slate-500"
            >
              通知
              {typeof unreadCount === "number" && unreadCount > 0 ? ` (${unreadCount > 99 ? "99+" : unreadCount})` : ""}
            </Link>
            <Link
              href="/auth/sign-in?role=admin&mode=signin"
              className="hidden lg:block text-slate-300 hover:text-white text-xs font-medium transition-colors px-2 py-1.5 rounded-md border border-slate-700 hover:border-slate-500"
            >
              后台
            </Link>
            {process.env.NODE_ENV !== "production" && (
              <Link
                href="/dev/quick-login"
                className="hidden lg:block text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-colors px-2 py-1.5 rounded-md border border-emerald-800 hover:border-emerald-600"
              >
                Dev
              </Link>
            )}
            <Link
              href="/emergency"
              className="md:hidden flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
              紧急
            </Link>
            <Link
              href={primaryCta.href}
              className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">{primaryCta.desktop}</span>
              <span className="sm:hidden">{primaryCta.mobile}</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
