// @ts-nocheck
"use client";
import { useState, useEffect } from "react";

export function PriceEstimateCard({ category, stateCode }: { category?: string; stateCode?: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    const params = new URLSearchParams({ category });
    if (stateCode) params.set("stateCode", stateCode);
    fetch(`/api/marketplace/price-estimate?${params}`)
      .then(r => r.json())
      .then(d => setData(d.estimate))
      .finally(() => setLoading(false));
  }, [category, stateCode]);

  if (!category || loading) return null;
  if (!data || (data.bidSampleSize === 0 && data.paymentSampleSize === 0)) return null;

  const avg = data.paymentAvg || data.bidAvg;
  const min = data.bidMin || data.paymentMin;
  const max = data.bidMax || data.paymentMax;
  const sampleSize = data.bidSampleSize + data.paymentSampleSize;

  if (!avg) return null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
      <p className="mb-1 font-medium text-blue-800">市场参考价</p>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-blue-900">${min?.toFixed(0)} - ${max?.toFixed(0)}</span>
        <span className="text-xs text-blue-600">平均 ${avg.toFixed(0)}</span>
      </div>
      <p className="mt-1 text-xs text-blue-500">基于过去 12 个月 {sampleSize} 个类似案件</p>
    </div>
  );
}
