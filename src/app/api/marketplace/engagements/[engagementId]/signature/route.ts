export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import {
  createTemplateFromHtml,
  createSubmission,
  voidSubmission,
} from "@/lib/docuseal";
import { generateEngagementLetterHtml, type EngagementLetterData } from "@/lib/engagement-letter";

type RouteParams = { params: Promise<{ engagementId: string }> };

// ─── GET — 获取当前签名状态和当前用户的 embed token ─────────────────────────

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

    const { engagementId } = await params;

    // 验证访问权限：只有该 engagement 的律师或客户可访问
    const engagement = await prisma.engagementConfirmation.findUnique({
      where: { id: engagementId },
      select: {
        id: true,
        status: true,
        clientProfileId: true,
        attorneyProfileId: true,
        attorney: { select: { userId: true } },
        client: { select: { userId: true } },
        signature: true,
      },
    });

    if (!engagement) {
      return NextResponse.json({ ok: false, error: "Engagement 不存在" }, { status: 404 });
    }

    const isAttorney = engagement.attorney.userId === auth.authUserId;
    const isClient = engagement.client?.userId === auth.authUserId;
    const isAdmin = auth.role === "ADMIN";

    if (!isAttorney && !isClient && !isAdmin) {
      return NextResponse.json({ ok: false, error: "无访问权限" }, { status: 403 });
    }

    const sig = engagement.signature;

    if (!sig) {
      return NextResponse.json({ ok: true, signature: null });
    }

    // 根据角色返回对应的 embed token
    const embedToken = isAttorney
      ? sig.attorneyEmbedToken
      : isClient
      ? sig.clientEmbedToken
      : null;

    return NextResponse.json({
      ok: true,
      signature: {
        id: sig.id,
        status: sig.status,
        embedToken,
        attorneySignedAt: sig.attorneySignedAt,
        clientSignedAt: sig.clientSignedAt,
        completedAt: sig.completedAt,
        signedPdfUrl: sig.signedPdfUrl,
      },
    });
  } catch (err) {
    console.error("GET /signature failed", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST — 创建签名请求（律师在设置 PENDING_CLIENT 后调用）──────────────────

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
    if (auth.role !== "ATTORNEY" && auth.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "仅律师可创建签名请求" }, { status: 403 });
    }

    const { engagementId } = await params;

    // 验证 DOCUSEAL_API_KEY 已配置
    if (!process.env.DOCUSEAL_API_KEY) {
      console.error("DOCUSEAL_API_KEY not configured");
      return NextResponse.json({ ok: false, error: "电子签名服务未配置，请联系管理员" }, { status: 503 });
    }

    // 查询 Engagement + 关联数据
    const engagement = await prisma.engagementConfirmation.findUnique({
      where: { id: engagementId },
      include: {
        attorney: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            firmName: true,
            barState: true,
            barLicenseNumber: true,
            user: { select: { email: true } },
          },
        },
        client: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
        signature: { select: { id: true, status: true } },
      },
    });

    if (!engagement) {
      return NextResponse.json({ ok: false, error: "Engagement 不存在" }, { status: 404 });
    }

    // 权限：只有该 engagement 的律师可创建
    if (auth.role !== "ADMIN" && engagement.attorney.userId !== auth.authUserId) {
      return NextResponse.json({ ok: false, error: "仅该聘用协议的律师可发起签名" }, { status: 403 });
    }

    // 状态检查：必须是 PENDING_CLIENT 或 DRAFT 状态
    if (!["PENDING_CLIENT", "DRAFT"].includes(engagement.status)) {
      return NextResponse.json({
        ok: false,
        error: `当前状态（${engagement.status}）不允许创建签名请求`,
      }, { status: 400 });
    }

    // 如果签名请求已存在且未作废，直接返回现有 token
    if (engagement.signature && engagement.signature.status !== "VOIDED") {
      const existing = await prisma.engagementSignature.findUnique({
        where: { engagementId },
      });
      return NextResponse.json({
        ok: true,
        alreadyExists: true,
        signature: {
          id: existing!.id,
          status: existing!.status,
          embedToken: existing!.attorneyEmbedToken,
        },
      });
    }

    // 修复 #13: 查询转介绍费信息（若本案存在转介绍安排），用于 Engagement Letter 披露
    // 依据 ABA Model Rule 1.5(e) 及各州律师行规：有转介绍费时必须书面告知客户
    let referralFeeData: EngagementLetterData["referralFee"] = null;
    if (engagement.caseId) {
      const referral = await prisma.caseReferral.findFirst({
        where: {
          sourceCaseId: engagement.caseId,
          feeMode: { not: "NONE" },
          status: { in: ["PENDING", "ACCEPTED", "COMPLETED"] },
        },
        include: {
          referrerAttorney: {
            select: { firstName: true, lastName: true },
          },
        },
      }).catch(() => null); // 查询失败不阻断签名流程

      if (referral) {
        const referrerName = [referral.referrerAttorney.firstName, referral.referrerAttorney.lastName]
          .filter(Boolean).join(" ") || "Referring Attorney";
        referralFeeData = {
          referrerAttorneyName: referrerName,
          feeMode: referral.feeMode,
          feePercent: referral.feePercent != null ? Number(referral.feePercent) : null,
          feeAmount: referral.feeAmount != null ? Number(referral.feeAmount) : null,
          feeNote: referral.feeNote,
          clientDisclosureAck: referral.clientDisclosureAck,
          conflictCheckDone: referral.conflictCheckDone,
          barRuleAck: referral.barRuleAck,
        };
      }
    }

    // 生成聘用协议 HTML
    const letterHtml = generateEngagementLetterHtml({
      id: engagement.id,
      createdAt: new Date(),
      serviceScopeSummary: engagement.serviceScopeSummary,
      stagePlan: engagement.stagePlan,
      serviceBoundary: engagement.serviceBoundary,
      feeMode: engagement.feeMode,
      feeAmountMin: engagement.feeAmountMin,
      feeAmountMax: engagement.feeAmountMax,
      includesConsultation: engagement.includesConsultation,
      includesCourtAppearance: engagement.includesCourtAppearance,
      includesTranslation: engagement.includesTranslation,
      includesDocumentFiling: engagement.includesDocumentFiling,
      nonLegalAdviceAck: engagement.nonLegalAdviceAck,
      noAttorneyClientRelationshipAck: engagement.noAttorneyClientRelationshipAck,
      attorneyConflictChecked: engagement.attorneyConflictChecked,
      attorneyConflictCheckNote: engagement.attorneyConflictCheckNote,
      attorney: {
        firstName: engagement.attorney.firstName,
        lastName: engagement.attorney.lastName,
        firmName: engagement.attorney.firmName,
        barState: engagement.attorney.barState,
        barNumber: engagement.attorney.barLicenseNumber,
        email: engagement.attorney.user?.email,
      },
      client: {
        firstName: engagement.client?.firstName,
        lastName: engagement.client?.lastName,
        email: engagement.client?.user?.email,
      },
      referralFee: referralFeeData,
    });

    // 创建 Docuseal Template
    const templateName = `EngagementLetter-${engagementId}`;
    const templateId = await createTemplateFromHtml(letterHtml, templateName);

    // 准备双方信息
    const attorneyName = [engagement.attorney.firstName, engagement.attorney.lastName]
      .filter(Boolean).join(" ") || "Attorney";
    const clientName = [engagement.client?.firstName, engagement.client?.lastName]
      .filter(Boolean).join(" ") || "Client";
    const attorneyEmail = engagement.attorney.user?.email ?? `attorney+${engagementId}@law119.com`;
    const clientEmail = engagement.client?.user?.email ?? `client+${engagementId}@law119.com`;

    // 创建 Submission（顺序签署：律师先，客户后）
    const { submissionId, attorneyToken, attorneySubmitterId, clientToken, clientSubmitterId } =
      await createSubmission(
        templateId,
        { name: attorneyName, email: attorneyEmail },
        { name: clientName, email: clientEmail }
      );

    // 存入数据库（upsert 防重复）
    const sig = await prisma.engagementSignature.upsert({
      where: { engagementId },
      create: {
        engagementId,
        submissionId: String(submissionId),
        docusealTemplateId: templateId,
        status: "AWAITING_ATTORNEY",
        attorneySubmitterId,
        attorneyEmbedToken: attorneyToken,
        clientSubmitterId,
        clientEmbedToken: clientToken,
      },
      update: {
        submissionId: String(submissionId),
        docusealTemplateId: templateId,
        status: "AWAITING_ATTORNEY",
        attorneySubmitterId,
        attorneyEmbedToken: attorneyToken,
        clientSubmitterId,
        clientEmbedToken: clientToken,
        attorneySignedAt: null,
        clientSignedAt: null,
        completedAt: null,
        signedPdfUrl: null,
        signedPdfStoragePath: null,
      },
    });

    return NextResponse.json({
      ok: true,
      signature: {
        id: sig.id,
        status: sig.status,
        embedToken: attorneyToken,
      },
    });
  } catch (err) {
    console.error("POST /signature failed", err);
    return NextResponse.json({ ok: false, error: "创建签名请求失败，请稍后重试" }, { status: 500 });
  }
}

// ─── DELETE — 作废签名请求（当 Engagement 被取消时调用）────────────────────

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

    const { engagementId } = await params;

    const sig = await prisma.engagementSignature.findUnique({
      where: { engagementId },
      include: { engagement: { select: { attorney: { select: { userId: true } } } } },
    });

    if (!sig) {
      return NextResponse.json({ ok: true, message: "签名记录不存在，无需作废" });
    }

    const isOwner = sig.engagement.attorney.userId === auth.authUserId;
    if (!isOwner && auth.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "无权限作废签名请求" }, { status: 403 });
    }

    // 在 Docuseal 作废
    if (sig.submissionId && sig.status !== "COMPLETED" && sig.status !== "VOIDED") {
      await voidSubmission(sig.submissionId).catch((e) =>
        console.warn("Docuseal void failed (ignoring):", e)
      );
    }

    // 更新状态
    await prisma.engagementSignature.update({
      where: { engagementId },
      data: { status: "VOIDED" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /signature failed", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
