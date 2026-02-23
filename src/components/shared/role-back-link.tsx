"use client";

import Link from "next/link";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type Props = {
  className?: string;
  clientHref?: string;
  clientLabel?: string;
  attorneyHref?: string;
  attorneyLabel?: string;
  adminHref?: string;
  adminLabel?: string;
  guestHref?: string;
  guestLabel?: string;
};

export function RoleBackLink({
  className = "rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white",
  clientHref = "/marketplace/client-center",
  clientLabel = "返回客户后台",
  attorneyHref = "/attorney/dashboard",
  attorneyLabel = "返回律师后台",
  adminHref = "/marketplace/admin/dashboard",
  adminLabel = "返回管理后台",
  guestHref = "/",
  guestLabel = "返回首页",
}: Props) {
  const { viewer } = useMarketplaceAuth();
  const role = viewer.user?.role ?? null;

  if (role === "CLIENT") return <Link href={clientHref} className={className}>{clientLabel}</Link>;
  if (role === "ATTORNEY") return <Link href={attorneyHref} className={className}>{attorneyLabel}</Link>;
  if (role === "ADMIN") return <Link href={adminHref} className={className}>{adminLabel}</Link>;
  return <Link href={guestHref} className={className}>{guestLabel}</Link>;
}

