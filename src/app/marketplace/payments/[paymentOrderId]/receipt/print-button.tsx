"use client";

import Link from "next/link";

export function PrintButton({ paymentOrderId }: { paymentOrderId: string }) {
  return (
    <div className="no-print mb-6 flex items-center justify-between gap-3">
      <Link
        href={`/marketplace/payments/${paymentOrderId}`}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        ← 返回支付详情
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      >
        🖨 打印 / 保存 PDF
      </button>
    </div>
  );
}
