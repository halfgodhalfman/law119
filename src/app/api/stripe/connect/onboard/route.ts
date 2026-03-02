export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/connect/onboard
 *   律师调用：创建或获取 Stripe Connect Express 子账户，返回 onboarding URL
 *   首次调用创建账户；已有账户 ID 则直接生成新链接（可用于重新进入 onboarding）
 *
 * GET  /api/stripe/connect/onboard
 *   律师调用：获取当前 Stripe 账户状态（charges_enabled, payouts_enabled 等）
 *
 * Layer 2 合规：资金流 客户 → Stripe → 律师子账户；平台不持有客户资金。
 */

import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import {
  createConnectAccount,
  createAccountLink,
  retrieveConnectAccount,
} from "@/lib/stripe";

const ONBOARD_RETURN_URL =
  (process.env.NEXT_PUBLIC_APP_URL ?? "https://law119.com") +
  "/attorney/stripe-onboard/complete";

const ONBOARD_REFRESH_URL =
  (process.env.NEXT_PUBLIC_APP_URL ?? "https://law119.com") +
  "/attorney/stripe-onboard";

// ─── GET — 获取律师当前 Stripe 账户状态 ──────────────────────────────────────

export async function GET(_request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
    if (auth.role !== "ATTORNEY") {
      return NextResponse.json({ ok: false, error: "仅律师可查询 Stripe 账户状态" }, { status: 403 });
    }

    const attorney = await prisma.attorneyProfile.findUnique({
      where: { userId: auth.authUserId },
      select: {
        id: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
      },
    });
    if (!attorney) {
      return NextResponse.json({ ok: false, error: "律师档案不存在" }, { status: 404 });
    }

    // 若有 Stripe 账户，从 Stripe 同步最新状态
    if (attorney.stripeAccountId) {
      try {
        const acct = await retrieveConnectAccount(attorney.stripeAccountId);
        const chargesEnabled = acct.charges_enabled;
        const payoutsEnabled = acct.payouts_enabled;
        const onboardingComplete = acct.details_submitted;

        // 若状态有变化则同步到 DB
        if (
          chargesEnabled !== attorney.stripeChargesEnabled ||
          payoutsEnabled !== attorney.stripePayoutsEnabled ||
          onboardingComplete !== attorney.stripeOnboardingComplete
        ) {
          await prisma.attorneyProfile.update({
            where: { id: attorney.id },
            data: {
              stripeChargesEnabled: chargesEnabled,
              stripePayoutsEnabled: payoutsEnabled,
              stripeOnboardingComplete: onboardingComplete,
            },
          });
        }

        return NextResponse.json({
          ok: true,
          stripe: {
            accountId: attorney.stripeAccountId,
            chargesEnabled,
            payoutsEnabled,
            onboardingComplete,
            detailsSubmitted: acct.details_submitted,
            requirementsCurrentlyDue: acct.requirements?.currently_due ?? [],
            requirementsPastDue: acct.requirements?.past_due ?? [],
            disabledReason: acct.requirements?.disabled_reason ?? null,
          },
        });
      } catch (stripeErr) {
        console.error("Stripe account retrieve failed", stripeErr);
        // 降级：返回 DB 中缓存的状态
        return NextResponse.json({
          ok: true,
          stripe: {
            accountId: attorney.stripeAccountId,
            chargesEnabled: attorney.stripeChargesEnabled,
            payoutsEnabled: attorney.stripePayoutsEnabled,
            onboardingComplete: attorney.stripeOnboardingComplete,
          },
          warning: "Stripe 状态同步失败，返回缓存数据",
        });
      }
    }

    // 尚未创建 Stripe 账户
    return NextResponse.json({
      ok: true,
      stripe: {
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingComplete: false,
      },
    });
  } catch (err) {
    console.error("GET /api/stripe/connect/onboard failed", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST — 创建账户 / 生成 onboarding URL ────────────────────────────────────

export async function POST(_request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
    if (auth.role !== "ATTORNEY") {
      return NextResponse.json({ ok: false, error: "仅律师可创建 Stripe Connect 账户" }, { status: 403 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { ok: false, error: "Stripe 服务未配置，请联系管理员" },
        { status: 503 }
      );
    }

    const attorney = await prisma.attorneyProfile.findUnique({
      where: { userId: auth.authUserId },
      select: {
        id: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        user: { select: { email: true } },
      },
    });
    if (!attorney) {
      return NextResponse.json({ ok: false, error: "律师档案不存在" }, { status: 404 });
    }

    let stripeAccountId = attorney.stripeAccountId;

    // 首次：创建 Express 子账户
    if (!stripeAccountId) {
      const email = attorney.user.email ?? `attorney+${attorney.id}@law119.com`;
      const acct = await createConnectAccount(email, {
        attorneyProfileId: attorney.id,
        platform: "law119",
      });
      stripeAccountId = acct.id;

      await prisma.attorneyProfile.update({
        where: { id: attorney.id },
        data: {
          stripeAccountId,
          stripeOnboardingComplete: false,
          stripeChargesEnabled: false,
          stripePayoutsEnabled: false,
        },
      });
    }

    // 生成 onboarding 链接
    const accountLink = await createAccountLink(
      stripeAccountId,
      ONBOARD_RETURN_URL,
      ONBOARD_REFRESH_URL
    );

    return NextResponse.json({
      ok: true,
      onboardingUrl: accountLink.url,
      expiresAt: accountLink.expires_at,
      stripeAccountId,
    });
  } catch (err) {
    console.error("POST /api/stripe/connect/onboard failed", err);
    return NextResponse.json(
      { ok: false, error: "Stripe Connect 初始化失败，请稍后重试" },
      { status: 500 }
    );
  }
}
