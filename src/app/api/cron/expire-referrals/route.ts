export const dynamic = "force-dynamic";

/**
 * GET /api/cron/expire-referrals
 *
 * 修复 #15: 转介绍到期自动处理 Cron Job
 *
 * 触发方式：
 * - Vercel Cron（vercel.json 配置）：每天凌晨2点（UTC）自动触发
 * - 手动触发：管理员 GET 请求（需携带 CRON_SECRET 请求头）
 *
 * 安全：通过 CRON_SECRET 环境变量验证请求来源
 * 防止外部随意触发 Cron 任务
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  // 安全校验：验证 Cron 触发来源
  // Vercel Cron 会自动携带 Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    // 生产环境：验证密钥
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // 生产环境未设置 CRON_SECRET 时拒绝所有请求
    console.warn("[Cron] CRON_SECRET not set in production. Rejecting request.");
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
  }

  try {
    const now = new Date();

    // 查找所有已过期但状态仍为 PENDING 的转介绍
    const expiredReferrals = await prisma.caseReferral.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now, not: null },
      },
      select: { id: true, expiresAt: true },
    });

    if (expiredReferrals.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No expired referrals found",
        processedCount: 0,
        runAt: now.toISOString(),
      });
    }

    // 批量更新为 EXPIRED 状态
    const { count } = await prisma.caseReferral.updateMany({
      where: {
        id: { in: expiredReferrals.map((r) => r.id) },
        status: "PENDING", // 二次确认状态，防止并发
      },
      data: { status: "EXPIRED" },
    });

    console.log(`[Cron] expire-referrals: Expired ${count} referrals at ${now.toISOString()}`);

    return NextResponse.json({
      ok: true,
      message: `Expired ${count} referral(s)`,
      processedCount: count,
      runAt: now.toISOString(),
      expiredIds: expiredReferrals.map((r) => r.id),
    });
  } catch (error) {
    console.error("[Cron] expire-referrals failed:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
