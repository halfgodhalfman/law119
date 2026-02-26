export const dynamic = "force-dynamic";
// @ts-nocheck
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { redirect } from "next/navigation";

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

  return (
    <div className="mx-auto max-w-2xl bg-white px-8 py-12 print:px-0 print:py-0">
      <style>{`@media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>

      <div className="no-print mb-6 flex justify-end">
        <button onClick="window.print()" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">打印收据</button>
      </div>

      {/* Header */}
      <div className="mb-8 border-b pb-6">
        <h1 className="text-2xl font-bold">Law119 付款收据</h1>
        <p className="text-sm text-gray-500">Payment Receipt</p>
      </div>

      {/* Receipt Details */}
      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">收据编号:</span><br /><span className="font-mono text-xs">{order.id}</span></div>
        <div><span className="text-gray-500">日期:</span><br />{new Date(order.createdAt).toLocaleDateString("zh-CN")}</div>
        <div><span className="text-gray-500">状态:</span><br /><span className="font-medium">{order.status}</span></div>
        <div><span className="text-gray-500">币种:</span><br />{order.currency}</div>
      </div>

      {/* Parties */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-sm">
        <div>
          <p className="mb-1 font-medium text-gray-700">付款方 (客户)</p>
          <p>{order.client?.lastName}{order.client?.firstName}</p>
        </div>
        <div>
          <p className="mb-1 font-medium text-gray-700">收款方 (律师)</p>
          <p>{order.attorney?.lastName}{order.attorney?.firstName}</p>
          {order.attorney?.firmName && <p className="text-xs text-gray-500">{order.attorney.firmName}</p>}
        </div>
      </div>

      {/* Case & Service */}
      <div className="mb-6 text-sm">
        <h3 className="mb-2 font-medium">案件与服务</h3>
        <p><span className="text-gray-500">案件:</span> {order.case?.title} ({order.case?.category})</p>
        <p><span className="text-gray-500">州:</span> {order.case?.stateCode}</p>
        {order.engagement && <p><span className="text-gray-500">服务范围:</span> {order.engagement.serviceScopeSummary?.slice(0, 200)}</p>}
      </div>

      {/* Amount */}
      <div className="mb-6 rounded-lg border p-4">
        <h3 className="mb-3 font-medium">金额明细</h3>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b"><td className="py-2 text-gray-500">总金额</td><td className="py-2 text-right font-medium">${Number(order.amountTotal).toFixed(2)}</td></tr>
            <tr className="border-b"><td className="py-2 text-gray-500">托管中</td><td className="py-2 text-right">${Number(order.amountHeld).toFixed(2)}</td></tr>
            <tr className="border-b"><td className="py-2 text-gray-500">已释放</td><td className="py-2 text-right">${Number(order.amountReleased).toFixed(2)}</td></tr>
            <tr><td className="py-2 text-gray-500">已退款</td><td className="py-2 text-right">${Number(order.amountRefunded).toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Milestones */}
      {order.milestones.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 font-medium text-sm">里程碑</h3>
          <table className="w-full text-xs">
            <thead><tr className="border-b text-gray-500"><th className="py-1 text-left">阶段</th><th className="py-1 text-left">交付物</th><th className="py-1 text-right">金额</th><th className="py-1 text-right">状态</th></tr></thead>
            <tbody>
              {order.milestones.map(m => (
                <tr key={m.id} className="border-b"><td className="py-1">{m.title}</td><td className="py-1">{m.deliverable}</td><td className="py-1 text-right">${Number(m.amount).toFixed(2)}</td><td className="py-1 text-right">{m.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 border-t pt-4 text-center text-xs text-gray-400">
        <p>本收据由 Law119 平台生成，仅供记录参考</p>
        <p>This receipt is generated by Law119 platform for record purposes.</p>
        <p className="mt-1">生成时间: {new Date().toLocaleString("zh-CN")}</p>
      </div>
    </div>
  );
}
