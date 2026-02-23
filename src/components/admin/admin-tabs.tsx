"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/marketplace/admin/dashboard", label: "看板" },
  { href: "/marketplace/admin/cases", label: "案件" },
  { href: "/marketplace/admin/ops-priority-settings", label: "运营权重" },
  { href: "/marketplace/admin/ranking-weights", label: "推荐权重" },
  { href: "/marketplace/admin/users", label: "用户" },
  { href: "/marketplace/admin/attorneys", label: "律师" },
  { href: "/marketplace/admin/attorney-reviews", label: "律师审核" },
  { href: "/marketplace/admin/attorney-trust", label: "信任验证" },
  { href: "/marketplace/admin/attorney-review-moderation", label: "评价审核" },
  { href: "/marketplace/admin/attorney-quality", label: "律师质量" },
  { href: "/marketplace/admin/bids", label: "报价" },
  { href: "/marketplace/admin/conversations", label: "沟通" },
  { href: "/marketplace/admin/content-rules", label: "规则配置" },
  { href: "/marketplace/admin/content-rule-events", label: "规则命中" },
  { href: "/marketplace/admin/legal-categories", label: "法律类目" },
  { href: "/marketplace/admin/faqs", label: "FAQ" },
  { href: "/marketplace/admin/legal-notices", label: "合规文案" },
  { href: "/marketplace/admin/reports", label: "举报" },
  { href: "/marketplace/admin/disputes", label: "争议工单" },
  { href: "/marketplace/admin/support-inbox", label: "统一工单台" },
  { href: "/marketplace/admin/reply-templates", label: "回复模板" },
  { href: "/marketplace/admin/support-tickets", label: "客服消息" },
  { href: "/marketplace/admin/blacklists", label: "黑名单" },
  { href: "/marketplace/admin/payments", label: "支付托管" },
  { href: "/marketplace/admin/finance-ops", label: "财务运营" },
  { href: "/marketplace/admin/payout-review-queue", label: "放款审核" },
  { href: "/marketplace/admin/refund-review-queue", label: "退款审批" },
  { href: "/marketplace/admin/search", label: "全局搜索" },
  { href: "/marketplace/admin/audit", label: "审计" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
