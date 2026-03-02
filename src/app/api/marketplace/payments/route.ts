export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { createPaymentIntent, getPlatformFeeRate } from "@/lib/stripe";

const createSchema = z.object({
  engagementId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(200),
  currency: z.string().trim().min(3).max(8).default("USD"),
  amountTotal: z.coerce.number().positive(),
  milestones: z.array(z.object({
    title: z.string().trim().min(2).max(200),
    deliverable: z.string().trim().min(2).max(500),
    amount: z.coerce.number().positive(),
    targetDate: z.string().datetime().optional(),
  })).max(10).optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "").trim();
    const engagementId = (url.searchParams.get("engagementId") ?? "").trim();
    const engagementFilter = engagementId ? { engagementId } : {};
    const where =
      auth.role === "ADMIN"
        ? { ...(status ? { status: status as never } : {}), ...engagementFilter }
        : auth.role === "CLIENT"
          ? { clientProfileId: auth.clientProfileId ?? "__none__", ...(status ? { status: status as never } : {}), ...engagementFilter }
          : { attorneyProfileId: auth.attorneyProfileId ?? "__none__", ...(status ? { status: status as never } : {}), ...engagementFilter };

    const items = await prisma.paymentOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        milestones: { orderBy: { sortOrder: "asc" } },
        events: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("GET /api/marketplace/payments failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || (auth.role !== "CLIENT" && auth.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only client/admin can create payment orders." }, { status: 403 });
    }
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;

    const engagement = await prisma.engagementConfirmation.findUnique({
      where: { id: data.engagementId },
      include: {
        case: true,
        bid: {
          include: {
            attorney: {
              select: {
                id: true,
                userId: true,
                stripeAccountId: true,
                stripeChargesEnabled: true,
              },
            },
          },
        },
        client: true,
      },
    });
    if (!engagement) return NextResponse.json({ error: "Engagement not found." }, { status: 404 });
    if (engagement.status !== "ACTIVE") return NextResponse.json({ error: "Payment requires active engagement confirmation." }, { status: 409 });
    if (auth.role === "CLIENT" && auth.clientProfileId !== engagement.clientProfileId) return NextResponse.json({ error: "Not your engagement." }, { status: 403 });

    const attorney = engagement.bid.attorney;

    // ── Stripe 合规检查（Layer 2）：律师必须完成 Stripe Connect 设置才能收款 ──
    if (process.env.STRIPE_SECRET_KEY) {
      // 仅在 Stripe 已配置时强制检查（允许无 Stripe 的开发环境继续使用）
      if (!attorney.stripeAccountId || !attorney.stripeChargesEnabled) {
        return NextResponse.json(
          {
            error: "律师尚未完成 Stripe 收款账户设置，暂时无法接受付款。请联系律师完成 Stripe Connect 注册后再发起付款。",
            code: "ATTORNEY_STRIPE_NOT_READY",
          },
          { status: 409 }
        );
      }
    }

    const milestoneTotal = (data.milestones ?? []).reduce((sum, m) => sum + Number(m.amount), 0);
    if (data.milestones && Math.abs(milestoneTotal - Number(data.amountTotal)) > 0.01) {
      return NextResponse.json({ error: "Milestone sum must equal total amount." }, { status: 400 });
    }

    const blockingDispute = await prisma.disputeTicket.findFirst({
      where: {
        OR: [
          { conversationId: engagement.conversationId ?? "__none__" },
          { caseId: engagement.caseId },
          { bidId: engagement.bidId },
        ],
        status: { in: ["OPEN", "UNDER_REVIEW", "WAITING_PARTY"] },
      },
      select: { id: true, status: true },
    });

    // ── 计算平台服务费（快照记录）────────────────────────────────────────────
    const platformFeeRate = getPlatformFeeRate();
    const platformFeeAmount = Number((data.amountTotal * platformFeeRate).toFixed(2));

    // ── 创建 Stripe PaymentIntent（资金托管模式）─────────────────────────────
    // 仅在 Stripe 已配置时创建；开发环境可跳过
    let stripePaymentIntentId: string | null = null;
    let stripeClientSecret: string | null = null;

    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const pi = await createPaymentIntent(
          data.amountTotal,
          {
            paymentOrderId: "__placeholder__", // 将在创建 Order 后更新
            engagementId: engagement.id,
            caseId: engagement.caseId ?? "",
            attorneyProfileId: attorney.id,
            platformFeeRate: platformFeeRate.toString(),
          }
        );
        stripePaymentIntentId = pi.id;
        stripeClientSecret = pi.client_secret;
      } catch (stripeErr) {
        console.error("Stripe PaymentIntent creation failed:", stripeErr);
        return NextResponse.json(
          { error: "支付服务暂时不可用，请稍后重试" },
          { status: 503 }
        );
      }
    }

    // ── 创建 PaymentOrder + Milestones（DB 事务）─────────────────────────────
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentOrder.create({
        data: {
          engagementId: engagement.id,
          caseId: engagement.caseId,
          bidId: engagement.bidId,
          conversationId: engagement.conversationId,
          clientProfileId: engagement.clientProfileId,
          attorneyProfileId: engagement.attorneyProfileId,
          payerUserId: engagement.client ? engagement.client.userId : auth.authUserId,
          payeeUserId: attorney.userId,
          feeMode: engagement.feeMode,
          status: "PENDING_PAYMENT",
          currency: data.currency.toUpperCase(),
          amountTotal: data.amountTotal.toFixed(2),
          amountHeld: "0.00",
          title: data.title,
          scopeSnapshot: {
            serviceBoundary: engagement.serviceBoundary,
            serviceScopeSummary: engagement.serviceScopeSummary,
            stagePlan: engagement.stagePlan,
            feeMode: engagement.feeMode,
          },
          holdBlockedByDispute: Boolean(blockingDispute),
          holdBlockedReason: blockingDispute ? `Blocked by dispute ${blockingDispute.id}` : null,
          // ── Stripe 字段 ──
          stripePaymentIntentId,
          platformServiceFeeAmount: platformFeeAmount.toFixed(2),
          platformServiceFeeRate: platformFeeRate.toFixed(4),
        },
      });

      // 若已创建 PaymentIntent，更新其 metadata 中的 paymentOrderId
      // （Stripe metadata 更新为 best-effort，不影响主流程）
      if (stripePaymentIntentId) {
        import("@/lib/stripe").then(({ stripe }) => {
          stripe.paymentIntents.update(stripePaymentIntentId!, {
            metadata: {
              paymentOrderId: created.id,
              engagementId: engagement.id,
              caseId: engagement.caseId ?? "",
              attorneyProfileId: attorney.id,
              platformFeeRate: platformFeeRate.toString(),
            },
          }).catch((e) => console.warn("PaymentIntent metadata update failed (non-critical):", e));
        }).catch(() => null);
      }

      if (data.milestones?.length) {
        await tx.paymentMilestone.createMany({
          data: data.milestones.map((m, idx) => ({
            paymentOrderId: created.id,
            sortOrder: idx,
            title: m.title,
            deliverable: m.deliverable,
            amount: Number(m.amount).toFixed(2),
            targetDate: m.targetDate ? new Date(m.targetDate) : null,
          })),
        });
      }
      await tx.paymentEvent.create({
        data: {
          paymentOrderId: created.id,
          actorUserId: auth.authUserId,
          type: "PAYMENT_INTENT_CREATED",
          amount: data.amountTotal.toFixed(2),
          note: blockingDispute
            ? `Created with dispute block (${blockingDispute.id})`
            : stripePaymentIntentId
              ? `Stripe PaymentIntent ${stripePaymentIntentId} created`
              : "Payment order created (Stripe not configured)",
          metadata: {
            engagementId: engagement.id,
            milestoneCount: data.milestones?.length ?? 0,
            stripePaymentIntentId: stripePaymentIntentId ?? null,
            platformFeeRate,
            platformFeeAmount,
          },
        },
      });
      return created;
    });

    return NextResponse.json({
      ok: true,
      paymentOrder: order,
      // stripeClientSecret 供前端 Stripe.js 完成支付（使用 PaymentElement）
      stripeClientSecret,
      platformFee: {
        rate: platformFeeRate,
        amount: platformFeeAmount,
        note: "平台技术服务费（服务条款第 5 节）/ Platform technology service fee (ToS §5)",
      },
      blockedByDispute: blockingDispute
        ? { id: blockingDispute.id, status: blockingDispute.status }
        : null,
    });
  } catch (error) {
    console.error("POST /api/marketplace/payments failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
