export const dynamic = "force-dynamic";

/**
 * GET  /api/marketplace/uscis/cases  — 获取当前用户追踪的 USCIS 案件列表
 * POST /api/marketplace/uscis/cases  — 添加一个 USCIS 案件到追踪列表（并立即查询状态）
 */

import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import {
  fetchUSCISStatus,
  validateReceiptNumber,
  normalizeReceiptNumber,
} from "@/lib/uscis-tracker";
import { createUserNotification } from "@/lib/user-notifications";

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

    const cases = await prisma.uSCISTrackedCase.findMany({
      where: { userId: auth.authUserId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ ok: true, cases });
  } catch (err) {
    console.error("GET /api/marketplace/uscis/cases failed", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const receiptRaw: string = body?.receiptNumber ?? "";
    const formType: string = body?.formType ?? "";
    const nickname: string = body?.nickname ?? "";
    const notifyOnChange: boolean = body?.notifyOnChange !== false; // 默认 true

    // 校验收据号
    const validation = validateReceiptNumber(receiptRaw);
    if (!validation.valid) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }
    const receipt = normalizeReceiptNumber(receiptRaw);

    // 检查是否已追踪
    const existing = await prisma.uSCISTrackedCase.findFirst({
      where: { userId: auth.authUserId, receiptNumber: receipt },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "该收据号已在追踪列表中", existingId: existing.id },
        { status: 409 }
      );
    }

    // 立即查询 USCIS 状态
    const statusResult = await fetchUSCISStatus(receipt);

    // 写入数据库
    const tracked = await prisma.uSCISTrackedCase.create({
      data: {
        userId: auth.authUserId,
        receiptNumber: receipt,
        formType: formType.trim() || null,
        nickname: nickname.trim() || null,
        lastStatus: statusResult.status,
        lastStatusBody: statusResult.statusBody,
        statusCategory: statusResult.category as never,
        lastCheckedAt: new Date(statusResult.checkedAt),
        notifyOnChange,
        statusHistory: JSON.stringify([
          {
            status: statusResult.status,
            statusBody: statusResult.statusBody,
            category: statusResult.category,
            checkedAt: statusResult.checkedAt,
          },
        ]),
      },
    });

    return NextResponse.json({ ok: true, case: tracked, statusResult });
  } catch (err) {
    console.error("POST /api/marketplace/uscis/cases failed", err);
    return NextResponse.json({ ok: false, error: "添加失败，请稍后重试" }, { status: 500 });
  }
}
