export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { redirect } from "next/navigation";
import { PrintButton } from "./print-button";

export default async function ReceiptPage({ params }: { params: Promise<{ paymentOrderId: string }> }) {
  const { paymentOrderId } = await params;
  let auth;
  try { auth = await requireAuthContext(); } catch { redirect("/auth/login"); }

  const order = await prisma.paymentOrder.findUnique({
    where: { id: paymentOrderId },
    include: {
      case: { select: { title: true, category: true, stateCode: true } },
      engagement: { select: { serviceScopeSummary: true, serviceBoundary: true, feeMode: true } },
      client: { select: { firstName: true, lastName: true } },
      attorney: { select: { firstName: true, lastName: true, firmName: true } },
      milestones: { orderBy: { sortOrder: "asc" } },
      events: { where: { type: { in: ["PAYMENT_SUCCEEDED", "MILESTONE_RELEASED", "REFUND_COMPLETED"] } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) redirect("/marketplace/payments");
  // Auth check: only payer, payee, or admin
  const canView = auth.role === "ADMIN" || order.payerUserId === auth.authUserId || order.payeeUserId === auth.authUserId;
  if (!canView) redirect("/marketplace/payments");

  const statusLabel: Record<string, string> = {
    PENDING_PAYMENT: "待付款",
    PAID_HELD: "已付款（托管中）",
    PARTIALLY_RELEASED: "部分已释放",
    RELEASED: "全额已释放",
    REFUND_PENDING: "退款申请中",
    REFUNDED: "已退款",
  };

  const milestoneStatusLabel: Record<string, string> = {
    PENDING: "待执行",
    IN_PROGRESS: "进行中",
    RELEASE_REQUESTED: "申请释放",
    READY_FOR_RELEASE: "待客户确认",
    RELEASED: "已释放",
    DISPUTED: "争议中",
  };

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <style>{`@media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; } @page { margin: 1.5cm; } }`}</style>

      <div className="mx-auto max-w-2xl bg-white px-8 py-10 shadow-sm print:shadow-none print:px-0 print:py-0">
        <PrintButton paymentOrderId={paymentOrderId} />

        {/* Header */}
        <div className="mb-8 border-b-2 border-slate-900 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Law119</h1>
              <p className="mt-0.5 text-sm text-slate-500">美国华人119找律师网</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-slate-900">付款收据</p>
              <p className="text-sm text-slate-500">Payment Receipt</p>
            </div>
          </div>
        </div>

        {/* Receipt meta */}
        <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">收据编号</p>
            <p className="mt-1 font-mono text-xs text-slate-800">{order.id}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">创建日期</p>
            <p className="mt-1 text-slate-800">{new Date(order.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">支付状态</p>
            <p className="mt-1 font-semibold text-slate-800">{statusLabel[order.status] ?? order.status}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">币种</p>
            <p className="mt-1 text-slate-800">{order.currency}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">支付单标题</p>
            <p className="mt-1 font-semibold text-slate-800">{order.title}</p>
          </div>
        </div>

        {/* Parties */}
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm print:bg-slate-50">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">付款方（客户）</p>
            <p className="font-semibold text-slate-800">{order.client?.lastName}{order.client?.firstName}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">收款方（律师）</p>
            <p className="font-semibold text-slate-800">{order.attorney?.lastName}{order.attorney?.firstName}</p>
            {order.attorney?.firmName && <p className="text-xs text-slate-500">{order.attorney.firmName}</p>}
          </div>
        </div>

        {/* Case & Service */}
        <div className="mb-6 rounded-xl border border-slate-200 p-4 text-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">案件与服务</p>
          <div className="space-y-1.5">
            <div className="flex gap-2"><span className="w-20 flex-shrink-0 text-slate-500">案件</span><span className="text-slate-800">{order.case?.title} ({order.case?.category})</span></div>
            <div className="flex gap-2"><span className="w-20 flex-shrink-0 text-slate-500">所在州</span><span className="text-slate-800">{order.case?.stateCode}</span></div>
            {order.engagement?.serviceBoundary && <div className="flex gap-2"><span className="w-20 flex-shrink-0 text-slate-500">服务边界</span><span className="text-slate-800">{order.engagement.serviceBoundary}</span></div>}
            {order.engagement?.serviceScopeSummary && <div className="flex gap-2"><span className="w-20 flex-shrink-0 text-slate-500">服务范围</span><span className="line-clamp-3 text-slate-800">{order.engagement.serviceScopeSummary.slice(0, 300)}</span></div>}
          </div>
        </div>

        {/* Amount summary */}
        <div className="mb-6 rounded-xl border border-slate-200 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">金额明细</p>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr><td className="py-2 text-slate-500">总金额</td><td className="py-2 text-right font-semibold text-slate-900">${Number(order.amountTotal).toFixed(2)} {order.currency}</td></tr>
              <tr><td className="py-2 text-slate-500">托管中</td><td className="py-2 text-right text-slate-700">${Number(order.amountHeld).toFixed(2)}</td></tr>
              <tr><td className="py-2 text-slate-500">已释放</td><td className="py-2 text-right text-emerald-700">${Number(order.amountReleased).toFixed(2)}</td></tr>
              <tr><td className="py-2 text-slate-500">已退款</td><td className="py-2 text-right text-rose-700">${Number(order.amountRefunded).toFixed(2)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Milestones */}
        {order.milestones.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">里程碑明细</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 text-left font-medium">#</th>
                  <th className="py-2 text-left font-medium">阶段</th>
                  <th className="py-2 text-left font-medium">交付物</th>
                  <th className="py-2 text-right font-medium">金额</th>
                  <th className="py-2 text-right font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.milestones.map((m, idx) => (
                  <tr key={m.id}>
                    <td className="py-2 text-slate-500">{idx + 1}</td>
                    <td className="py-2 font-medium text-slate-800">{m.title}</td>
                    <td className="py-2 text-slate-600">{m.deliverable}</td>
                    <td className="py-2 text-right font-medium text-slate-800">${Number(m.amount).toFixed(2)}</td>
                    <td className="py-2 text-right">
                      <span className={`rounded-full px-2 py-0.5 ${m.status === "RELEASED" ? "bg-emerald-100 text-emerald-700" : m.status === "DISPUTED" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                        {milestoneStatusLabel[m.status] ?? m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment events */}
        {order.events.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">关键事件记录</p>
            <div className="space-y-2">
              {order.events.map((e) => (
                <div key={e.id} className="flex items-start gap-3 text-xs">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                  <span className="text-slate-500">{new Date(e.createdAt).toLocaleString("zh-CN")}</span>
                  <span className="text-slate-700">{e.type.replace(/_/g, " ")}</span>
                  {e.amount && <span className="ml-auto font-medium text-slate-800">${Number(e.amount).toFixed(2)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          <p className="font-medium text-slate-500">本收据由 Law119 平台自动生成，仅供记录参考</p>
          <p className="mt-1">This receipt is generated by Law119 platform for record purposes only.</p>
          <p className="mt-2 text-slate-400">生成时间：{new Date().toLocaleString("zh-CN")}</p>
        </div>
      </div>
    </div>
  );
}
