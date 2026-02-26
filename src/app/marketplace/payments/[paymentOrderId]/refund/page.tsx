// @ts-nocheck
"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const REFUND_REASONS = [
  { value: "SERVICE_NOT_STARTED", label: "服务未开始" },
  { value: "SERVICE_INCOMPLETE", label: "服务未完成" },
  { value: "QUALITY_ISSUE", label: "服务质量问题" },
  { value: "COMMUNICATION_ISSUE", label: "沟通问题" },
  { value: "OVERCHARGED", label: "收费过高" },
  { value: "OTHER", label: "其他原因" },
];

export default function RefundPage() {
  const { paymentOrderId } = useParams<{ paymentOrderId: string }>();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) { setError("请选择退款原因"); return; }
    if (description.length < 20) { setError("请详细描述退款原因（至少20字）"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/marketplace/payments/${paymentOrderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refund_request", note: description, refundReason: reason, refundDescription: description }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "提交失败"); return; }
      setSuccess(true);
    } catch { setError("网络错误"); } finally { setSubmitting(false); }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="mb-4 text-4xl">✓</div>
        <h2 className="text-xl font-bold">退款申请已提交</h2>
        <p className="mt-2 text-sm text-gray-500">我们将在 1-3 个工作日内审核您的申请</p>
        <Link href={`/marketplace/payments/${paymentOrderId}`} className="mt-4 inline-block text-sm text-blue-600 hover:underline">返回付款详情</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href={`/marketplace/payments/${paymentOrderId}`} className="text-sm text-blue-600 hover:underline">&larr; 返回付款详情</Link>
      <h1 className="mt-4 text-2xl font-bold">退款申请</h1>
      <p className="mt-1 text-sm text-gray-500">请填写退款原因，我们将尽快审核</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">退款原因 *</label>
          <select value={reason} onChange={e => setReason(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">请选择</option>
            {REFUND_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">详细说明 *</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="请详细描述退款原因（至少20字）..." />
          <p className="mt-1 text-xs text-gray-400">{description.length}/2000</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
          {submitting ? "提交中..." : "提交退款申请"}
        </button>
      </form>

      {/* Refund process explanation */}
      <div className="mt-8 rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
        <h3 className="mb-2 font-medium text-gray-700">退款流程说明</h3>
        <ol className="list-inside list-decimal space-y-1">
          <li>提交退款申请</li>
          <li>平台审核（1-3 个工作日）</li>
          <li>审核通过后处理退款</li>
          <li>退款到账</li>
        </ol>
      </div>
    </div>
  );
}
