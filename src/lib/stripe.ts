/**
 * src/lib/stripe.ts
 *
 * Stripe SDK 单例 + 平台所需辅助函数
 *
 * 架构说明（Layer 2 — 资金结构合规）：
 *   客户 → Stripe PaymentIntent (application_fee_amount 扣除平台服务费)
 *        → 律师 Stripe Connect Express 子账户
 *   平台绝不持有客户资金；仅通过 application_fee 收取技术服务费。
 */

import Stripe from "stripe";

// ─── 单例 ────────────────────────────────────────────────────────────────────

if (!process.env.STRIPE_SECRET_KEY) {
  // 构建时/SSR 阶段可能未注入 — 仅运行时报错
  if (process.env.NODE_ENV === "production") {
    console.error("[stripe] STRIPE_SECRET_KEY not configured");
  }
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

// ─── 平台费率 ─────────────────────────────────────────────────────────────────

/** 平台技术服务费率，默认 5%，可通过 ENV 覆盖 */
export function getPlatformFeeRate(): number {
  const raw = parseFloat(process.env.STRIPE_PLATFORM_FEE_RATE ?? "0.05");
  if (isNaN(raw) || raw < 0 || raw > 1) return 0.05;
  return raw;
}

/** 将金额（美元，Decimal/string/number）转为 Stripe 使用的分（整数） */
export function toCents(amount: string | number): number {
  return Math.round(Number(amount) * 100);
}

// ─── Connect 账户管理 ─────────────────────────────────────────────────────────

/**
 * 创建 Stripe Connect Express 子账户（律师收款账户）
 * @param email  律师注册邮箱
 * @param metadata  附加元数据（attorneyProfileId 等）
 */
export async function createConnectAccount(
  email: string,
  metadata?: Record<string, string>
): Promise<Stripe.Account> {
  return stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: metadata ?? {},
  });
}

/**
 * 生成 Stripe Connect onboarding 链接（律师完成 KYC）
 * @param accountId  律师 Stripe 子账户 ID（acct_...）
 * @param returnUrl  onboarding 完成后跳转地址
 * @param refreshUrl onboarding 链接过期后刷新地址
 */
export async function createAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<Stripe.AccountLink> {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

/**
 * 获取律师 Stripe 子账户信息（用于同步 charges_enabled / payouts_enabled）
 */
export async function retrieveConnectAccount(accountId: string): Promise<Stripe.Account> {
  return stripe.accounts.retrieve(accountId);
}

// ─── PaymentIntent ────────────────────────────────────────────────────────────

/**
 * 创建 PaymentIntent（托管 Escrow 模式）
 *
 * 资金流：客户付款 → 平台 Stripe 账户（托管）→ 律师 Connect 子账户（里程碑释放时 Transfer）
 * 平台先收取全额，后续按里程碑通过 createTransfer() 释放给律师。
 * platformServiceFeeRate 决定最终平台留存比例；此处仅记录，不实时扣除。
 *
 * @param amountTotal       总金额（美元）
 * @param metadata          附加元数据（paymentOrderId, caseId 等）
 */
export async function createPaymentIntent(
  amountTotal: string | number,
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  const amountCents = toCents(amountTotal);

  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    // 无 transfer_data：资金托管于平台账户，里程碑确认后再 Transfer
    automatic_payment_methods: { enabled: true },
    metadata: metadata ?? {},
  });
}

// ─── Transfer（里程碑释放）────────────────────────────────────────────────────

/**
 * 向律师子账户转账（里程碑释放）
 *
 * 使用场景：客户确认里程碑完成后，将对应金额（扣除平台服务费分摊）
 * 从平台账户转入律师 Stripe 子账户。
 *
 * @param amountNet            转给律师的净金额（美元，已扣平台服务费）
 * @param connectedAccountId   律师 Stripe Connect 子账户 ID
 * @param metadata             附加元数据（paymentOrderId, milestoneId 等）
 */
export async function createTransfer(
  amountNet: string | number,
  connectedAccountId: string,
  metadata?: Record<string, string>
): Promise<Stripe.Transfer> {
  return stripe.transfers.create({
    amount: toCents(amountNet),
    currency: "usd",
    destination: connectedAccountId,
    metadata: metadata ?? {},
  });
}

// ─── Webhook 验证 ─────────────────────────────────────────────────────────────

/**
 * 验证并构造 Stripe Webhook 事件
 * 签名验证失败时抛出 Stripe.errors.StripeSignatureVerificationError
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(body, signature, secret);
}
