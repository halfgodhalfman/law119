export const dynamic = "force-dynamic";

/**
 * POST /api/uscis/check
 *
 * 公开接口：无需登录，实时查询 USCIS 案件状态
 * 不写入数据库，仅返回查询结果
 */

import { NextResponse } from "next/server";
import { fetchUSCISStatus, validateReceiptNumber, normalizeReceiptNumber } from "@/lib/uscis-tracker";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const receipt = typeof body?.receiptNumber === "string" ? body.receiptNumber : "";

    if (!receipt.trim()) {
      return NextResponse.json(
        { ok: false, error: "请输入收据号（Receipt Number）" },
        { status: 400 }
      );
    }

    const validation = validateReceiptNumber(receipt);
    if (!validation.valid) {
      return NextResponse.json(
        { ok: false, error: validation.error },
        { status: 400 }
      );
    }

    const result = await fetchUSCISStatus(normalizeReceiptNumber(receipt));

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("POST /api/uscis/check failed", err);
    return NextResponse.json(
      { ok: false, error: "查询失败，请稍后重试" },
      { status: 500 }
    );
  }
}
