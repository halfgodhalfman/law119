export const dynamic = "force-dynamic";

/**
 * GET  /api/marketplace/referrals  — 律师查看自己的转介绍（发出/收到）
 * POST /api/marketplace/referrals  — 律师创建转介绍请求
 */

import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { LegalCategory, ReferralFeeMode } from "@prisma/client";
import { z } from "zod";
import { createUserNotification } from "@/lib/user-notifications";
import { rateLimit, rateLimitResponse, getRequestIdentifier } from "@/lib/rate-limit";

// ─── 公共 attorney select ───────────────────────────────────────────────────

const ATTORNEY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  firmName: true,
  avatarUrl: true,
  barNumberVerified: true,
  isVerified: true,
  yearsExperience: true,
  userId: true,
  specialties: { select: { category: true } },
  serviceAreas: { select: { stateCode: true }, take: 6 },
  languages: { select: { language: true } },
};

// ─── GET ────────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
    if (auth.role !== "ATTORNEY") return NextResponse.json({ ok: false, error: "仅限律师" }, { status: 403 });

    const attorney = await prisma.attorneyProfile.findUnique({
      where: { userId: auth.authUserId },
      select: { id: true },
    });
    if (!attorney) return NextResponse.json({ ok: false, error: "律师档案未找到" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const direction = searchParams.get("direction") ?? "all"; // "outgoing" | "incoming" | "all"
    const status = searchParams.get("status");

    const baseWhere = {
      ...(status ? { status: status as never } : {}),
    };

    const [outgoing, incoming] = await Promise.all([
      direction !== "incoming"
        ? prisma.caseReferral.findMany({
            where: { referrerAttorneyId: attorney.id, ...baseWhere },
            include: {
              receiverAttorney: { select: ATTORNEY_SELECT },
              feeRecord: true,
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : [],
      direction !== "outgoing"
        ? prisma.caseReferral.findMany({
            where: { receiverAttorneyId: attorney.id, ...baseWhere },
            include: {
              referrerAttorney: { select: ATTORNEY_SELECT },
              feeRecord: true,
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : [],
    ]);

    return NextResponse.json({ ok: true, outgoing, incoming });
  } catch (err) {
    console.error("GET /api/marketplace/referrals failed", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  receiverAttorneyId:  z.string().min(1),
  clientDescBrief:     z.string().min(10).max(2000),
  legalCategory:       z.nativeEnum(LegalCategory),
  stateCode:           z.string().length(2).toUpperCase().optional().nullable(),
  urgencyNote:         z.string().max(200).optional().nullable(),
  sourceCaseId:        z.string().optional().nullable(),
  feeMode:             z.nativeEnum(ReferralFeeMode).default("NONE"),
  feePercent:          z.number().min(0).max(100).optional().nullable(),
  feeAmount:           z.number().min(0).optional().nullable(),
  feeNote:             z.string().max(500).optional().nullable(),
  // 合规声明（feeMode !== NONE 时三项均为 true）
  clientDisclosureAck: z.boolean().default(false),
  conflictCheckDone:   z.boolean().default(false),
  barRuleAck:          z.boolean().default(false),
  notes:               z.string().max(2000).optional().nullable(),
  expiresInDays:       z.number().int().min(1).max(90).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
    if (auth.role !== "ATTORNEY") return NextResponse.json({ ok: false, error: "仅限律师" }, { status: 403 });

    // 速率限制：10次/小时/律师（防止转介绍骚扰）
    const rl = await rateLimit(getRequestIdentifier(request, auth.authUserId), "REFERRAL_POST");
    if (!rl.success) return rateLimitResponse(rl);

    const referrer = await prisma.attorneyProfile.findUnique({
      where: { userId: auth.authUserId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!referrer) return NextResponse.json({ ok: false, error: "律师档案未找到" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "参数有误", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    // 不能向自己发转介绍
    if (data.receiverAttorneyId === referrer.id) {
      return NextResponse.json({ ok: false, error: "不能向自己发送转介绍" }, { status: 400 });
    }

    // 验证接收方律师存在
    const receiver = await prisma.attorneyProfile.findUnique({
      where: { id: data.receiverAttorneyId },
      select: { id: true, userId: true, firstName: true, lastName: true },
    });
    if (!receiver) return NextResponse.json({ ok: false, error: "接收方律师不存在" }, { status: 404 });

    // fee 约定校验
    if (data.feeMode !== "NONE") {
      if (!data.clientDisclosureAck || !data.conflictCheckDone || !data.barRuleAck) {
        return NextResponse.json({ ok: false, error: "有 referral fee 时，三项合规声明均须勾选" }, { status: 400 });
      }
      if (data.feeMode === "PERCENTAGE" && (data.feePercent == null || data.feePercent <= 0)) {
        return NextResponse.json({ ok: false, error: "请填写 referral fee 百分比" }, { status: 400 });
      }
      // Layer 5 合规上限：ABA Model Rule 1.5(e) 及各州律师行规对 referral fee 有隐性限制
      // 33% 是业界通行参考值（部分州要求更低，如 CA 禁止纯 referral fee）
      if (data.feeMode === "PERCENTAGE" && data.feePercent != null && data.feePercent > 33) {
        return NextResponse.json({
          ok: false,
          error: "转介绍费百分比不得超过 33%（参考 ABA Model Rule 1.5(e) 及各州律师行规上限）",
        }, { status: 400 });
      }
      if (data.feeMode === "FIXED" && (data.feeAmount == null || data.feeAmount <= 0)) {
        return NextResponse.json({ ok: false, error: "请填写 referral fee 金额" }, { status: 400 });
      }
    }

    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 86400_000)
      : null;

    const referral = await prisma.caseReferral.create({
      data: {
        referrerAttorneyId:  referrer.id,
        receiverAttorneyId:  data.receiverAttorneyId,
        clientDescBrief:     data.clientDescBrief,
        legalCategory:       data.legalCategory,
        stateCode:           data.stateCode ?? null,
        urgencyNote:         data.urgencyNote ?? null,
        sourceCaseId:        data.sourceCaseId ?? null,
        feeMode:             data.feeMode,
        feePercent:          data.feePercent ?? null,
        feeAmount:           data.feeAmount ?? null,
        feeNote:             data.feeNote ?? null,
        clientDisclosureAck: data.clientDisclosureAck,
        conflictCheckDone:   data.conflictCheckDone,
        barRuleAck:          data.barRuleAck,
        notes:               data.notes ?? null,
        expiresAt,
      },
      include: {
        receiverAttorney: { select: ATTORNEY_SELECT },
        feeRecord: true,
      },
    });

    // 通知接收方律师
    if (receiver.userId) {
      const referrerName = [referrer.firstName, referrer.lastName].filter(Boolean).join(" ") || "律师";
      await createUserNotification({
        userId: receiver.userId,
        type: "SYSTEM_NOTICE",
        title: `收到转介绍邀请 · Case Referral`,
        body: `律师 ${referrerName} 向您发送了一份 ${data.legalCategory} 领域的案件转介绍邀请，请查看并确认是否接受。`,
        linkUrl: `/attorney/referrals`,
        metadata: { referralId: referral.id, legalCategory: data.legalCategory },
      }).catch((e) => console.warn("Referral notification failed:", e));
    }

    // Layer 5: 当使用百分比 referral fee 时，返回合规提醒
    const complianceNote = data.feeMode === "PERCENTAGE"
      ? "合规提醒：部分州（如 CA）对律师间转介绍费有额外限制，PERCENTAGE 模式在某些州可能无效。请在执行前确认所在州律师行规。/ Note: Some states (e.g., CA) impose additional restrictions on referral fees. Verify compliance with your state bar rules before proceeding."
      : null;

    return NextResponse.json({ ok: true, referral, complianceNote }, { status: 201 });
  } catch (err) {
    console.error("POST /api/marketplace/referrals failed", err);
    return NextResponse.json({ ok: false, error: "创建失败，请稍后重试" }, { status: 500 });
  }
}
