export const dynamic = "force-dynamic";
// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const stateCode = url.searchParams.get("stateCode");

  if (!category) return NextResponse.json({ error: "category required" }, { status: 400 });

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // Aggregate from accepted bids
  const bidWhere: any = {
    status: "ACCEPTED",
    createdAt: { gte: twelveMonthsAgo },
    case: { category },
  };
  if (stateCode) bidWhere.case.stateCode = stateCode;

  const bidAgg = await prisma.bid.aggregate({
    where: bidWhere,
    _avg: { feeQuoteMin: true, feeQuoteMax: true },
    _min: { feeQuoteMin: true },
    _max: { feeQuoteMax: true },
    _count: true,
  });

  // Aggregate from payment orders
  const paymentWhere: any = {
    status: { in: ["PAID_HELD", "PARTIALLY_RELEASED", "RELEASED"] },
    createdAt: { gte: twelveMonthsAgo },
    case: { category },
  };
  if (stateCode) paymentWhere.case.stateCode = stateCode;

  const paymentAgg = await prisma.paymentOrder.aggregate({
    where: paymentWhere,
    _avg: { amountTotal: true },
    _min: { amountTotal: true },
    _max: { amountTotal: true },
    _count: true,
  });

  return NextResponse.json({
    ok: true,
    estimate: {
      bidAvg: bidAgg._avg.feeQuoteMin ? Number(((Number(bidAgg._avg.feeQuoteMin) + Number(bidAgg._avg.feeQuoteMax || bidAgg._avg.feeQuoteMin)) / 2).toFixed(2)) : null,
      bidMin: bidAgg._min.feeQuoteMin ? Number(bidAgg._min.feeQuoteMin) : null,
      bidMax: bidAgg._max.feeQuoteMax ? Number(bidAgg._max.feeQuoteMax) : null,
      bidSampleSize: bidAgg._count,
      paymentAvg: paymentAgg._avg.amountTotal ? Number(Number(paymentAgg._avg.amountTotal).toFixed(2)) : null,
      paymentMin: paymentAgg._min.amountTotal ? Number(paymentAgg._min.amountTotal) : null,
      paymentMax: paymentAgg._max.amountTotal ? Number(paymentAgg._max.amountTotal) : null,
      paymentSampleSize: paymentAgg._count,
      category,
      stateCode,
    },
  });
}
