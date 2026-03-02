export const dynamic = "force-dynamic";

/**
 * DELETE /api/marketplace/uscis/cases/[id]  — 删除追踪案件
 * PATCH  /api/marketplace/uscis/cases/[id]  — 刷新案件状态 / 更新备注
 */

import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { fetchUSCISStatus, classifyUSCISStatus } from "@/lib/uscis-tracker";
import { createUserNotification } from "@/lib/user-notifications";

type RouteParams = { params: Promise<{ id: string }> };

// ─── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

    const { id } = await params;

    const record = await prisma.uSCISTrackedCase.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ ok: false, error: "记录不存在" }, { status: 404 });
    if (record.userId !== auth.authUserId && auth.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "无权限" }, { status: 403 });
    }

    await prisma.uSCISTrackedCase.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/marketplace/uscis/cases/[id] failed", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action: string = body?.action ?? "refresh"; // "refresh" | "update"

    const record = await prisma.uSCISTrackedCase.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ ok: false, error: "记录不存在" }, { status: 404 });
    if (record.userId !== auth.authUserId && auth.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "无权限" }, { status: 403 });
    }

    // ── 仅更新备注/设置 ──
    if (action === "update") {
      const updated = await prisma.uSCISTrackedCase.update({
        where: { id },
        data: {
          nickname: typeof body.nickname === "string" ? body.nickname.trim() || null : undefined,
          formType: typeof body.formType === "string" ? body.formType.trim() || null : undefined,
          notifyOnChange: typeof body.notifyOnChange === "boolean" ? body.notifyOnChange : undefined,
        },
      });
      return NextResponse.json({ ok: true, case: updated });
    }

    // ── 刷新状态（action === "refresh"）──
    // 限流：同一案件 1 分钟内只查一次
    if (record.lastCheckedAt) {
      const secondsSinceCheck = (Date.now() - record.lastCheckedAt.getTime()) / 1000;
      if (secondsSinceCheck < 60) {
        return NextResponse.json(
          { ok: false, error: `请稍等，距上次查询仅 ${Math.ceil(60 - secondsSinceCheck)} 秒` },
          { status: 429 }
        );
      }
    }

    const statusResult = await fetchUSCISStatus(record.receiptNumber);
    const prevStatus = record.lastStatus ?? "";
    const statusChanged = statusResult.status !== prevStatus && !statusResult.error;

    // 追加到历史（最多保留 50 条）
    type HistoryEntry = { status: string; statusBody: string; category: string; checkedAt: string };
    let history: HistoryEntry[] = [];
    try {
      const raw = record.statusHistory;
      if (Array.isArray(raw)) history = raw as HistoryEntry[];
    } catch {
      history = [];
    }
    if (statusChanged) {
      history = [
        {
          status: statusResult.status,
          statusBody: statusResult.statusBody,
          category: statusResult.category,
          checkedAt: statusResult.checkedAt,
        },
        ...history,
      ].slice(0, 50);
    }

    const updated = await prisma.uSCISTrackedCase.update({
      where: { id },
      data: {
        lastStatus: statusResult.status,
        lastStatusBody: statusResult.statusBody,
        statusCategory: statusResult.category as never,
        lastCheckedAt: new Date(statusResult.checkedAt),
        statusHistory: JSON.stringify(history),
      },
    });

    // 状态变化时发送通知
    if (statusChanged && record.notifyOnChange && record.userId) {
      const { zh } = classifyUSCISStatus(statusResult.status);
      await createUserNotification({
        userId: record.userId,
        type: "SYSTEM_NOTICE",
        title: `USCIS 案件状态更新：${statusResult.status}`,
        body: `收据号 ${record.receiptNumber}${record.nickname ? `（${record.nickname}）` : ""} 状态变为：${zh}`,
        linkUrl: `/marketplace/uscis-cases`,
        metadata: {
          receiptNumber: record.receiptNumber,
          oldStatus: prevStatus,
          newStatus: statusResult.status,
          category: statusResult.category,
        },
      }).catch((e) => console.warn("USCIS notification failed:", e));
    }

    return NextResponse.json({ ok: true, case: updated, statusResult, statusChanged });
  } catch (err) {
    console.error("PATCH /api/marketplace/uscis/cases/[id] failed", err);
    return NextResponse.json({ ok: false, error: "刷新失败，请稍后重试" }, { status: 500 });
  }
}
