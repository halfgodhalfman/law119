"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ATTORNEY_TABS = [
  { href: "/attorney/dashboard", label: "总览 Dashboard" },
  { href: "/marketplace/case-hall", label: "案件大厅" },
  { href: "/marketplace/my-bids", label: "我的报价" },
  { href: "/attorney/cases", label: "我的案件" },
  { href: "/attorney/conversations", label: "会话中心" },
  { href: "/attorney/workflow", label: "工作流" },
  { href: "/attorney/revenue", label: "收入与业绩" },
  { href: "/attorney/tasks", label: "任务中心" },
  { href: "/attorney/analytics", label: "数据分析" },
  { href: "/attorney/showcases", label: "案例展示" },
  { href: "/attorney/onboarding", label: "律师档案" },
  { href: "/marketplace/notifications", label: "通知中心" },
  { href: "/attorney/settings", label: "设置" },
] as const;

function isActive(pathname: string, href: string) {
  const [base] = href.split("#");
  if (base === "/attorney/dashboard") {
    return pathname === "/attorney/dashboard";
  }
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function AttorneyTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-5 overflow-x-auto">
      <div className="flex min-w-max gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {ATTORNEY_TABS.map((tab) => {
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
