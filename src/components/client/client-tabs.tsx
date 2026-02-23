"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const CLIENT_TABS = [
  { href: "/client/dashboard", label: "客户后台" },
  { href: "/marketplace/client-conversations", label: "我的会话" },
  { href: "/marketplace/payments", label: "我的支付" },
  { href: "/marketplace/notifications", label: "平台通知" },
  { href: "/marketplace/support-center", label: "支持中心" },
  { href: "/marketplace/support-tickets", label: "客服消息单" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/client/dashboard") {
    return pathname === "/client/dashboard" || pathname === "/marketplace/client-center" || pathname === "/client";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ClientTabs() {
  const pathname = usePathname();
  const [canRender, setCanRender] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const r = await fetch("/api/marketplace/me", { cache: "no-store" }).catch(() => null);
      if (!mounted || !r || !r.ok) return setCanRender(false);
      const j = await r.json().catch(() => ({}));
      if (!mounted) return;
      setCanRender(j?.user?.role === "CLIENT");
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  if (!canRender) return null;

  return (
    <div className="mb-5 overflow-x-auto">
      <div className="flex min-w-max gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {CLIENT_TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-xl px-3 py-2 text-sm transition ${
                active
                  ? "bg-slate-900 font-semibold text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
