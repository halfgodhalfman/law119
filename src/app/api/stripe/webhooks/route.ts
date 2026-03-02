export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/webhooks
 *
 * Stripe Webhook 处理器 — 接收 Stripe 事件并同步平台数据库状态
 *
 * 处理的事件类型：
 *   - payment_intent.succeeded        → PaymentOrder 状态更新为 PAID_HELD
 *   - payment_intent.payment_failed   → 记录失败事件（可选通知客户）
 *   - transfer.created                → 记录 Transfer ID 到 PaymentOrder
 *   - account.updated                 → 同步律师 Stripe 账户 charges/payouts 状态
 *
 * 安全：所有请求须通过 Stripe 签名验证（constructWebhookEvent）
 * Next.js 须关闭 body parsing — Stripe 验签需要原始 body bytes
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { constructWebhookEvent } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

// 关闭 Next.js 的 body parser，让 Stripe SDK 直接读取原始 buffer
export const config = {
  api: { bodyParser: false },
};

export async function POST(request: Request) {
  // 读取原始 body（需在 App Router 中用 arrayBuffer）
  const rawBody = await request.arrayBuffer();
  const bodyBuffer = Buffer.from(rawBody);

  const headersList = await headers();
  const stripeSignature = headersList.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  if (!stripeSignature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // ─── 签名验证 ──────────────────────────────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(bodyBuffer, stripeSignature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ─── 幂等性检查（同一 event.id 不重复处理）─────────────────────────────────
  // 注：可扩展为持久化 processed event IDs，此处用 try/catch 保障最终一致性

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error(`[stripe-webhook] Handler error for ${event.type}:`, err);
    // 返回 200 防止 Stripe 无限重试；错误已记录，可通过 Stripe Dashboard 手动重放
    return NextResponse.json({ received: true, error: "Handler error logged" }, { status: 200 });
  }

  return NextResponse.json({ received: true });
}

// ─── 事件处理分发 ──────────────────────────────────────────────────────────────

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case "transfer.created":
      await handleTransferCreated(event.data.object as Stripe.Transfer);
      break;

    case "account.updated":
      await handleAccountUpdated(event.data.object as Stripe.Account);
      break;

    default:
      // 未处理的事件类型，静默忽略
      break;
  }
}

// ─── payment_intent.succeeded ────────────────────────────────────────────────

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  const paymentOrderId = pi.metadata?.paymentOrderId;
  if (!paymentOrderId) {
    console.warn("[stripe-webhook] payment_intent.succeeded: no paymentOrderId in metadata", pi.id);
    return;
  }

  const order = await prisma.paymentOrder.findUnique({
    where: { id: paymentOrderId },
    select: { id: true, status: true, amountTotal: true },
  });
  if (!order) {
    console.warn("[stripe-webhook] PaymentOrder not found:", paymentOrderId);
    return;
  }

  // 幂等：若已经是 PAID_HELD 以上状态则跳过
  if (["PAID_HELD", "PARTIALLY_RELEASED", "RELEASED", "REFUNDED"].includes(order.status)) {
    return;
  }

  await prisma.$transaction([
    prisma.paymentOrder.update({
      where: { id: paymentOrderId },
      data: {
        status: "PAID_HELD",
        amountHeld: order.amountTotal,
        stripePaymentIntentId: pi.id,
      },
    }),
    prisma.paymentEvent.create({
      data: {
        paymentOrderId,
        type: "PAYMENT_SUCCEEDED",
        amount: order.amountTotal.toString(),
        note: `Stripe PaymentIntent ${pi.id} succeeded`,
        metadata: { stripePaymentIntentId: pi.id, stripeAmount: pi.amount },
      },
    }),
  ]);
}

// ─── payment_intent.payment_failed ───────────────────────────────────────────

async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  const paymentOrderId = pi.metadata?.paymentOrderId;
  if (!paymentOrderId) return;

  const failureMsg = pi.last_payment_error?.message ?? "Unknown payment failure";

  await prisma.paymentEvent.create({
    data: {
      paymentOrderId,
      type: "PAYMENT_FAILED",
      note: `Stripe PaymentIntent ${pi.id} failed: ${failureMsg}`,
      metadata: {
        stripePaymentIntentId: pi.id,
        errorCode: pi.last_payment_error?.code ?? null,
        errorMessage: failureMsg,
      },
    },
  }).catch((e) => console.error("[stripe-webhook] Failed to log payment_failed event:", e));
}

// ─── transfer.created ─────────────────────────────────────────────────────────

async function handleTransferCreated(transfer: Stripe.Transfer): Promise<void> {
  const paymentOrderId = transfer.metadata?.paymentOrderId;
  const milestoneId = transfer.metadata?.milestoneId;

  if (!paymentOrderId) {
    console.warn("[stripe-webhook] transfer.created: no paymentOrderId in metadata", transfer.id);
    return;
  }

  // 将 Transfer ID 写入 PaymentOrder（用于对账）
  await prisma.paymentOrder.updateMany({
    where: { id: paymentOrderId, stripeTransferId: null },
    data: { stripeTransferId: transfer.id },
  });

  await prisma.paymentEvent.create({
    data: {
      paymentOrderId,
      milestoneId: milestoneId ?? null,
      type: "MILESTONE_RELEASED",
      amount: (transfer.amount / 100).toFixed(2),
      note: `Stripe Transfer ${transfer.id} created — funds sent to attorney`,
      metadata: {
        stripeTransferId: transfer.id,
        stripeAmount: transfer.amount,
        // destination can be string | Account object — stringify for JSON safety
        destination: typeof transfer.destination === "string"
          ? transfer.destination
          : (transfer.destination as { id?: string } | null)?.id ?? null,
      },
    },
  }).catch((e) => console.error("[stripe-webhook] Failed to log transfer.created event:", e));
}

// ─── account.updated ──────────────────────────────────────────────────────────

async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  if (!account.id) return;

  // 找到对应律师档案
  const attorney = await prisma.attorneyProfile.findFirst({
    where: { stripeAccountId: account.id },
    select: { id: true, stripeChargesEnabled: true, stripePayoutsEnabled: true, stripeOnboardingComplete: true },
  });
  if (!attorney) {
    // 可能是平台账户事件，忽略
    return;
  }

  const chargesEnabled = account.charges_enabled;
  const payoutsEnabled = account.payouts_enabled;
  const onboardingComplete = account.details_submitted;

  // 仅在状态发生变化时更新，减少 DB 写入
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
}
