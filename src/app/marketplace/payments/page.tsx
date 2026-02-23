"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/ui/nav-bar";
import { ClientTabs } from "@/components/client/client-tabs";
import { RoleActionsHeader } from "@/components/shared/role-actions-header";

type PaymentOrder = {
  id: string;
  title: string;
  status: string;
  currency: string;
  amountTotal: string;
  amountHeld: string;
  amountReleased: string;
  holdBlockedByDispute: boolean;
  createdAt: string;
  milestones: Array<{ id: string; status: string }>;
};

export default function MarketplacePaymentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<PaymentOrder[]>([]);
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(searchParams.get("status") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const res = await fetch(`/api/marketplace/payments?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "加载支付单失败");
        setLoading(false);
        return;
      }
      setItems(json.items ?? []);
      setError(null);
      setLoading(false);
    };
    void load();
  }, [status]);

  const updateStatus = (nextStatus: string) => {
    setStatus(nextStatus);
    const params = new URLSearchParams(searchParams.toString());
    if (nextStatus) params.set("status", nextStatus);
    else params.delete("status");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <ClientTabs />
          <RoleActionsHeader
            eyebrow="Payments"
            title="我的支付与托管"
            description="查看支付单状态、里程碑释放进度与退款/争议阻断情况。"
            backLinkProps={{}}
          />
          <div className="mb-4 flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => updateStatus(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">全部状态</option>
              {["PENDING_PAYMENT","PAID_HELD","PARTIALLY_RELEASED","RELEASED","REFUND_PENDING","REFUNDED"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <div className="grid gap-4">
            {items.map((o) => (
              <article key={o.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${o.holdBlockedByDispute ? "border-rose-300" : "border-slate-200"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{o.status}</span>
                      {o.holdBlockedByDispute && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">争议阻断</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{o.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {o.currency} {o.amountTotal} · Held {o.amountHeld} · Released {o.amountReleased}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      里程碑 {o.milestones.length} 项 · 创建于 {new Date(o.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/marketplace/payments/${o.id}`}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    查看详情 / 里程碑确认
                  </Link>
                </div>
              </article>
            ))}
            {!loading && !items.length && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                暂无支付单记录。
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
