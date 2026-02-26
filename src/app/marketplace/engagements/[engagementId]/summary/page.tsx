export const dynamic = "force-dynamic";
// @ts-nocheck
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SummaryPage({ params }: { params: Promise<{ engagementId: string }> }) {
  const { engagementId } = await params;
  let auth;
  try { auth = await requireAuthContext(); } catch { redirect("/auth/login"); }

  const eng = await prisma.engagementConfirmation.findUnique({
    where: { id: engagementId },
    include: {
      case: { select: { title: true, category: true, stateCode: true, city: true, createdAt: true } },
      attorney: { select: { firstName: true, lastName: true, firmName: true, barState: true, barLicenseNumber: true, userId: true } },
      client: { select: { firstName: true, lastName: true, userId: true } },
      serviceStages: { orderBy: { sortOrder: "asc" } },
      paymentOrders: { include: { milestones: { orderBy: { sortOrder: "asc" } } } },
      attorneyClientReviews: { where: { status: "PUBLISHED" }, take: 1 },
    },
  });
  if (!eng) redirect("/marketplace");

  const canView = auth.role === "ADMIN" || auth.authUserId === eng.attorney?.userId || auth.authUserId === eng.client?.userId;
  if (!canView) redirect("/marketplace");

  const payment = eng.paymentOrders?.[0];
  const review = eng.attorneyClientReviews?.[0];

  return (
    <div className="mx-auto max-w-2xl bg-white px-8 py-12 print:px-0 print:py-0">
      <style>{`@media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>

      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={`/marketplace/engagements/${engagementId}`} className="text-sm text-blue-600 hover:underline">&larr; 返回委托详情</Link>
        <button onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">打印总结</button>
      </div>

      {/* Header */}
      <div className="mb-8 border-b pb-6">
        <h1 className="text-2xl font-bold">结案总结</h1>
        <p className="text-sm text-gray-500">Case Completion Summary</p>
      </div>

      {/* Case Info */}
      <div className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">案件信息</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">案件:</span> {eng.case?.title}</div>
          <div><span className="text-gray-500">类别:</span> {eng.case?.category}</div>
          <div><span className="text-gray-500">地区:</span> {eng.case?.stateCode} {eng.case?.city}</div>
          <div><span className="text-gray-500">立案日期:</span> {eng.case?.createdAt ? new Date(eng.case.createdAt).toLocaleDateString("zh-CN") : "—"}</div>
        </div>
      </div>

      {/* Parties */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-sm">
        <div>
          <p className="mb-1 font-medium">客户</p>
          <p>{eng.client?.lastName}{eng.client?.firstName}</p>
        </div>
        <div>
          <p className="mb-1 font-medium">律师</p>
          <p>{eng.attorney?.lastName}{eng.attorney?.firstName}</p>
          {eng.attorney?.firmName && <p className="text-xs text-gray-500">{eng.attorney.firmName}</p>}
          {eng.attorney?.barState && <p className="text-xs text-gray-500">Bar: {eng.attorney.barState} #{eng.attorney.barLicenseNumber}</p>}
        </div>
      </div>

      {/* Engagement Details */}
      <div className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">委托详情</h2>
        <div className="text-sm space-y-1">
          <p><span className="text-gray-500">服务类型:</span> {eng.serviceBoundary}</p>
          <p><span className="text-gray-500">收费模式:</span> {eng.feeMode}</p>
          {eng.feeAmountMin && eng.feeAmountMax && <p><span className="text-gray-500">费用范围:</span> ${Number(eng.feeAmountMin).toFixed(2)} - ${Number(eng.feeAmountMax).toFixed(2)}</p>}
          <p><span className="text-gray-500">服务范围:</span></p>
          <p className="rounded bg-gray-50 p-3 text-xs">{eng.serviceScopeSummary}</p>
        </div>
      </div>

      {/* Service Stages Timeline */}
      {eng.serviceStages.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">服务阶段</h2>
          <div className="space-y-2">
            {eng.serviceStages.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 text-sm">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${s.status === "COMPLETED" ? "bg-green-500" : s.status === "IN_PROGRESS" ? "bg-blue-500" : "bg-gray-300"}`}>{i + 1}</span>
                <span className="flex-1">{s.title}</span>
                <span className="text-xs text-gray-400">{s.completedAt ? new Date(s.completedAt).toLocaleDateString("zh-CN") : s.status === "IN_PROGRESS" ? "进行中" : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Summary */}
      {payment && (
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">付款概况</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"><td className="py-1 text-gray-500">总金额</td><td className="py-1 text-right">${Number(payment.amountTotal).toFixed(2)}</td></tr>
              <tr className="border-b"><td className="py-1 text-gray-500">已释放</td><td className="py-1 text-right">${Number(payment.amountReleased).toFixed(2)}</td></tr>
              <tr><td className="py-1 text-gray-500">已退款</td><td className="py-1 text-right">${Number(payment.amountRefunded).toFixed(2)}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Review */}
      {review && (
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">客户评价</h2>
          <div className="text-sm">
            <p className="text-yellow-500">{"★".repeat(review.ratingOverall)}{"☆".repeat(5 - review.ratingOverall)} {review.ratingOverall}/5</p>
            {review.comment && <p className="mt-1 text-gray-600">{review.comment}</p>}
          </div>
        </div>
      )}

      {/* Completion */}
      <div className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">完成信息</h2>
        <div className="text-sm space-y-1">
          <p><span className="text-gray-500">完成方式:</span> {eng.completionStatus === "CONFIRMED_BY_CLIENT" ? "客户确认" : eng.completionStatus === "AUTO_COMPLETED" ? "自动确认" : eng.completionStatus}</p>
          {eng.completionConfirmedAt && <p><span className="text-gray-500">完成日期:</span> {new Date(eng.completionConfirmedAt).toLocaleDateString("zh-CN")}</p>}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 border-t pt-4 text-center text-xs text-gray-400">
        <p>本结案总结由 Law119 平台自动生成</p>
        <p>生成时间: {new Date().toLocaleString("zh-CN")}</p>
      </div>
    </div>
  );
}
