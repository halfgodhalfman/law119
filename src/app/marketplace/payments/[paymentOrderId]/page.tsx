"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NavBar } from "@/components/ui/nav-bar";
import { ClientTabs } from "@/components/client/client-tabs";
import { RoleActionsHeader } from "@/components/shared/role-actions-header";

type PaymentDetail = {
  paymentOrder: {
    id: string;
    title: string;
    status: string;
    currency: string;
    amountTotal: string;
    amountHeld: string;
    amountReleased: string;
    amountRefunded: string;
    holdBlockedByDispute: boolean;
    holdBlockedReason: string | null;
    refundReviewStatus: string | null;
    refundReason: string | null;
    refundDescription: string | null;
    caseId: string | null;
    conversationId: string | null;
    milestones: Array<{
      id: string;
      title: string;
      deliverable: string;
      amount: string;
      status: string;
      sortOrder: number;
      targetDate?: string | null;
      releaseRequestedAt?: string | null;
      releasedAt?: string | null;
    }>;
    events: Array<{
      id: string;
      type: string;
      note: string | null;
      amount: string | null;
      createdAt: string;
      actor?: { email?: string | null; role?: string | null } | null;
    }>;
    engagement?: { id: string; status: string; serviceBoundary: string; serviceScopeSummary: string | null } | null;
  };
  viewer: {
    role: string;
    canClientActions: boolean;
    canAttorneyActions: boolean;
    isAdmin: boolean;
  };
};

export default function PaymentOrderDetailPage() {
  const { paymentOrderId } = useParams<{ paymentOrderId: string }>();
  const [data, setData] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/marketplace/payments/${paymentOrderId}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "加载失败");
      setLoading(false);
      return;
    }
    setData(json);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (paymentOrderId) void load();
  }, [paymentOrderId]);

  const act = async (action: string, milestoneId?: string) => {
    setActing(`${action}:${milestoneId ?? ""}`);
    setMsg(null);
    const res = await fetch(`/api/marketplace/payments/${paymentOrderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, milestoneId }),
    });
    const json = await res.json().catch(() => ({}));
    setActing(null);
    if (!res.ok) {
      setMsg(json.error ?? "操作失败");
      return;
    }
    setMsg("已更新支付状态");
    await load();
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <ClientTabs />
          <RoleActionsHeader
            eyebrow="Payment / Escrow"
            title="支付单详情与里程碑确认"
            description="客户可确认释放里程碑，律师可请求释放；争议工单未关闭时将阻止释放。"
            backLinkProps={{
              className: "rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-white",
              clientHref: "/marketplace/payments",
              clientLabel: "返回支付列表",
              attorneyHref: "/marketplace/payments",
              attorneyLabel: "返回支付列表",
              adminHref: "/marketplace/admin/finance-ops",
              adminLabel: "返回财务运营",
            }}
            rightActions={
              <>
                {data?.paymentOrder.caseId && (
                  <Link
                    href={`/marketplace/cases/${data.paymentOrder.caseId}`}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-white"
                  >
                    案件详情
                  </Link>
                )}
                {data?.paymentOrder.conversationId && (
                  <Link
                    href={`/chat/${data.paymentOrder.conversationId}`}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-white"
                  >
                    会话
                  </Link>
                )}
              </>
            }
          />
          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          {msg && <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{msg}</div>}
          {data && (
            <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{data.paymentOrder.status}</span>
                  {data.paymentOrder.holdBlockedByDispute && (
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">争议阻断</span>
                  )}
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                    角色：{data.viewer.role}
                  </span>
                  <Link href={`/marketplace/payments/${paymentOrderId}/receipt`} target="_blank" className="text-sm text-blue-600 hover:underline">打印收据</Link>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{data.paymentOrder.title}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {data.paymentOrder.currency} {data.paymentOrder.amountTotal} · Held {data.paymentOrder.amountHeld} · Released {data.paymentOrder.amountReleased} · Refunded {data.paymentOrder.amountRefunded}
                </p>
                {data.paymentOrder.holdBlockedReason && (
                  <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {data.paymentOrder.holdBlockedReason}
                  </p>
                )}
                {data.paymentOrder.engagement && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">委托确认单</p>
                    <p className="mt-1">状态：{data.paymentOrder.engagement.status}</p>
                    <p>服务边界：{data.paymentOrder.engagement.serviceBoundary}</p>
                    {data.paymentOrder.engagement.serviceScopeSummary && (
                      <p className="mt-1">范围摘要：{data.paymentOrder.engagement.serviceScopeSummary}</p>
                    )}
                  </div>
                )}

                <div className="mt-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">里程碑确认 / 释放</h3>
                  {data.paymentOrder.milestones.map((m) => (
                    <div key={m.id} className={`rounded-xl border p-3 ${m.status === "RELEASED" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">{m.sortOrder + 1}. {m.title}</p>
                          <p className="mt-1 text-xs text-slate-600">{m.deliverable}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {data.paymentOrder.currency} {m.amount} · {m.status}
                            {m.targetDate ? ` · 目标日期 ${new Date(m.targetDate).toLocaleDateString()}` : ""}
                          </p>
                          {m.releaseRequestedAt && (
                            <p className="text-[11px] text-amber-700">律师已申请释放：{new Date(m.releaseRequestedAt).toLocaleString()}</p>
                          )}
                          {m.releasedAt && (
                            <p className="text-[11px] text-emerald-700">已释放：{new Date(m.releasedAt).toLocaleString()}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {data.viewer.canAttorneyActions && m.status !== "READY_FOR_RELEASE" && m.status !== "RELEASED" && (
                            <button
                              type="button"
                              disabled={acting === `request_milestone_release:${m.id}`}
                              onClick={() => void act("request_milestone_release", m.id)}
                              className="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs text-blue-700"
                            >
                              请求释放（律师）
                            </button>
                          )}
                          {data.viewer.canClientActions && m.status !== "RELEASED" && (
                            <button
                              type="button"
                              disabled={acting === `release_milestone:${m.id}`}
                              onClick={() => void act("release_milestone", m.id)}
                              className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700"
                            >
                              确认释放（客户）
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!data.paymentOrder.milestones.length && (
                    <p className="text-sm text-slate-500">暂无里程碑（单次收费支付单）。</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">支付动作</h3>
                <div className="mt-3 space-y-2">
                  {data.viewer.canClientActions && (
                    <>
                      <button
                        type="button"
                        disabled={acting === "mark_paid_held:"}
                        onClick={() => void act("mark_paid_held")}
                        className="w-full rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-700"
                      >
                        标记已支付并托管（测试）
                      </button>
                      {["PAID_HELD", "PARTIALLY_RELEASED"].includes(data.paymentOrder.status) && (
                        <Link
                          href={`/marketplace/payments/${paymentOrderId}/refund`}
                          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-xs hover:bg-slate-50"
                        >
                          发起退款申请
                        </Link>
                      )}
                    </>
                  )}
                  {data.paymentOrder.refundReviewStatus && data.paymentOrder.refundReviewStatus !== "NONE" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <p className="font-medium">退款审核状态：{data.paymentOrder.refundReviewStatus}</p>
                      {data.paymentOrder.refundReason && <p className="mt-1">退款原因：{data.paymentOrder.refundReason}</p>}
                      {data.paymentOrder.refundDescription && <p className="mt-1">退款说明：{data.paymentOrder.refundDescription}</p>}
                    </div>
                  )}
                </div>
                <h4 className="mt-5 text-sm font-semibold text-slate-900">事件记录</h4>
                <div className="mt-2 space-y-2">
                  {data.paymentOrder.events.map((ev) => (
                    <div key={ev.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                      <p className="font-medium text-slate-900">{ev.type}</p>
                      <p className="text-slate-500">{new Date(ev.createdAt).toLocaleString()}</p>
                      {ev.amount && <p className="text-slate-600">金额：{ev.amount}</p>}
                      {ev.note && <p className="text-slate-600">{ev.note}</p>}
                      {ev.actor?.email && <p className="text-slate-500">{ev.actor.role} · {ev.actor.email}</p>}
                    </div>
                  ))}
                  {!data.paymentOrder.events.length && <p className="text-xs text-slate-500">暂无事件记录</p>}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
