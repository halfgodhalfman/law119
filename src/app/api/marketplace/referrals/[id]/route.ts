export const dynamic = "force-dynamic";

/**
 * GET    /api/marketplace/referrals/[id]  — 查看单个转介绍详情
 * PATCH  /api/marketplace/referrals/[id]  — 操作：接受/拒绝/撤销/完成/更新 fee
 * DELETE /api/marketplace/referrals/[id]  — 物理删除（仅 PENDING/DECLINED/CANCELLED 状态）
 */

import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { createUserNotification } from "@/lib/user-notifications";

type RouteParams = { params: Promise<{ id: string }> };

const ATTORNEY_SELECT = {
  id: true, firstName: true, lastName: true, firmName: true,
  avatarUrl: true, barNumberVerified: true, isVerified: true,
  yearsExperience: true, userId: true,
  specialties: { select: { category: true } },
  serviceAreas: { select: { stateCode: true }, take: 6 },
  languages: { select: { language: true } },
};

// ─── 辅助：获取转介绍并校验权限 ─────────────────────────────────────────────────

async function getReferralWithAuth(id: string, authUserId: string) {
  const referral = await prisma.caseReferral.findUnique({
    where: { id },
    include: {
      referrerAttorney: { select: ATTORNEY_SELECT },
      receiverAttorney: { select: ATTORNEY_SELECT },
      feeRecord: true,
    },
  });
  if (!referral) return { referral: null, role: null as null };

  const isReferrer = referral.referrerAttorney.userId === authUserId;
  const isReceiver = referral.receiverAttorney.userId === authUserId;
  const role = isReferrer ? "referrer" : isReceiver ? "receiver" : null;
  return { referral, role };
}

// ─── GET ────────────────────────────────────────────────────────────────────────

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
    const { id } = await params;
    const { referral, role } = await getReferralWithAuth(id, auth.authUserId);
    if (!referral) return NextResponse.json({ ok: false, error: "转介绍记录未找到" }, { status: 404 });
    if (!role && auth.role !== "ADMIN") return NextResponse.json({ ok: false, error: "无权限" }, { status: 403 });
    return NextResponse.json({ ok: true, referral, myRole: role });
  } catch (err) {
    console.error("GET /api/marketplace/referrals/[id] failed", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────────

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { referral, role } = await getReferralWithAuth(id, auth.authUserId);
    if (!referral) return NextResponse.json({ ok: false, error: "转介绍记录未找到" }, { status: 404 });
    if (!role && auth.role !== "ADMIN") return NextResponse.json({ ok: false, error: "无权限" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const action: string = body?.action ?? "";

    // ── 接受（接收方操作）────────────────────────────────────────────────────────
    if (action === "accept") {
      if (role !== "receiver") return NextResponse.json({ ok: false, error: "只有接收方可接受转介绍" }, { status: 403 });
      if (referral.status !== "PENDING") return NextResponse.json({ ok: false, error: `当前状态 ${referral.status} 不可接受` }, { status: 400 });

      const updated = await prisma.caseReferral.update({
        where: { id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          receiverNote: typeof body.receiverNote === "string" ? body.receiverNote.trim() || null : null,
        },
        include: { referrerAttorney: { select: ATTORNEY_SELECT }, receiverAttorney: { select: ATTORNEY_SELECT }, feeRecord: true },
      });

      // 通知转出方
      if (referral.referrerAttorney.userId) {
        const receiverName = [referral.receiverAttorney.firstName, referral.receiverAttorney.lastName].filter(Boolean).join(" ") || "律师";
        await createUserNotification({
          userId: referral.referrerAttorney.userId,
          type: "SYSTEM_NOTICE",
          title: `转介绍已被接受 ✓`,
          body: `律师 ${receiverName} 接受了您的案件转介绍请求，请继续跟进案件进展。`,
          linkUrl: `/attorney/referrals`,
          metadata: { referralId: id },
        }).catch(() => {});
      }
      return NextResponse.json({ ok: true, referral: updated });
    }

    // ── 拒绝（接收方操作）────────────────────────────────────────────────────────
    if (action === "decline") {
      if (role !== "receiver") return NextResponse.json({ ok: false, error: "只有接收方可拒绝转介绍" }, { status: 403 });
      if (referral.status !== "PENDING") return NextResponse.json({ ok: false, error: "当前状态不可拒绝" }, { status: 400 });

      const updated = await prisma.caseReferral.update({
        where: { id },
        data: {
          status: "DECLINED",
          declineReason: typeof body.declineReason === "string" ? body.declineReason.trim() || null : null,
        },
        include: { referrerAttorney: { select: ATTORNEY_SELECT }, receiverAttorney: { select: ATTORNEY_SELECT }, feeRecord: true },
      });

      if (referral.referrerAttorney.userId) {
        const receiverName = [referral.receiverAttorney.firstName, referral.receiverAttorney.lastName].filter(Boolean).join(" ") || "律师";
        await createUserNotification({
          userId: referral.referrerAttorney.userId,
          type: "SYSTEM_NOTICE",
          title: `转介绍已被婉拒`,
          body: `律师 ${receiverName} 婉拒了您的案件转介绍请求。${body.declineReason ? `原因：${body.declineReason}` : ""}`,
          linkUrl: `/attorney/referrals`,
          metadata: { referralId: id },
        }).catch(() => {});
      }
      return NextResponse.json({ ok: true, referral: updated });
    }

    // ── 撤销（转出方操作）────────────────────────────────────────────────────────
    if (action === "cancel") {
      if (role !== "referrer") return NextResponse.json({ ok: false, error: "只有转出方可撤销" }, { status: 403 });
      if (!["PENDING", "ACCEPTED"].includes(referral.status)) {
        return NextResponse.json({ ok: false, error: "当前状态不可撤销" }, { status: 400 });
      }
      const updated = await prisma.caseReferral.update({
        where: { id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
        include: { referrerAttorney: { select: ATTORNEY_SELECT }, receiverAttorney: { select: ATTORNEY_SELECT }, feeRecord: true },
      });
      return NextResponse.json({ ok: true, referral: updated });
    }

    // ── 标记完成（转出方操作）── ─────────────────────────────────────────────────
    if (action === "complete") {
      if (role !== "referrer" && auth.role !== "ADMIN") return NextResponse.json({ ok: false, error: "无权限" }, { status: 403 });
      if (!["ACCEPTED", "IN_PROGRESS"].includes(referral.status)) {
        return NextResponse.json({ ok: false, error: "当前状态不可标记完成" }, { status: 400 });
      }

      // 如果有 fee，创建 ReferralFeeRecord
      const hasFee = referral.feeMode !== "NONE";
      const feeAmount = referral.feeMode === "PERCENTAGE"
        ? (body.finalFeeAmount != null ? Number(body.finalFeeAmount) : null)
        : referral.feeMode === "FIXED"
        ? Number(referral.feeAmount)
        : null;

      const updated = await prisma.$transaction(async (tx) => {
        const r = await tx.caseReferral.update({
          where: { id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            linkedEngagementId: typeof body.linkedEngagementId === "string" ? body.linkedEngagementId : referral.linkedEngagementId,
          },
        });
        if (hasFee && feeAmount != null && !referral.feeRecord) {
          await tx.referralFeeRecord.create({
            data: {
              referralId: id,
              feeAmount,
              feeCurrency: referral.feeCurrency,
              calculationNote: typeof body.feeNote === "string" ? body.feeNote : null,
              status: "HELD",
              heldAt: new Date(),
            },
          });
        }
        return r;
      });

      // 通知接收方
      if (referral.receiverAttorney.userId) {
        await createUserNotification({
          userId: referral.receiverAttorney.userId,
          type: "SYSTEM_NOTICE",
          title: `转介绍案件已完成`,
          body: `案件转介绍已标记完成。${hasFee && feeAmount ? `Referral fee $${feeAmount} 已进入托管，等待平台审核释放。` : ""}`,
          linkUrl: `/attorney/referrals`,
          metadata: { referralId: id },
        }).catch(() => {});
      }
      const finalReferral = await prisma.caseReferral.findUnique({
        where: { id },
        include: { referrerAttorney: { select: ATTORNEY_SELECT }, receiverAttorney: { select: ATTORNEY_SELECT }, feeRecord: true },
      });
      return NextResponse.json({ ok: true, referral: finalReferral });
    }

    // ── 更新关联 Case ID（接收方接受后，记录在平台创建的 Case）──────────────────
    if (action === "link-case") {
      if (role !== "receiver") return NextResponse.json({ ok: false, error: "只有接收方可关联案件" }, { status: 403 });
      const updated = await prisma.caseReferral.update({
        where: { id },
        data: {
          linkedCaseId: typeof body.linkedCaseId === "string" ? body.linkedCaseId : referral.linkedCaseId,
          status: referral.status === "ACCEPTED" ? "IN_PROGRESS" : referral.status,
        },
        include: { referrerAttorney: { select: ATTORNEY_SELECT }, receiverAttorney: { select: ATTORNEY_SELECT }, feeRecord: true },
      });
      return NextResponse.json({ ok: true, referral: updated });
    }

    // ── Fee 放弃（双方均可）──────────────────────────────────────────────────────
    if (action === "waive-fee") {
      if (!referral.feeRecord) return NextResponse.json({ ok: false, error: "无 fee 记录" }, { status: 400 });
      if (!["HELD", "PENDING"].includes(referral.feeRecord.status)) {
        return NextResponse.json({ ok: false, error: "当前 fee 状态不可放弃" }, { status: 400 });
      }
      await prisma.referralFeeRecord.update({
        where: { referralId: id },
        data: { status: "WAIVED", waivedAt: new Date() },
      });
      const updated = await prisma.caseReferral.findUnique({
        where: { id },
        include: { referrerAttorney: { select: ATTORNEY_SELECT }, receiverAttorney: { select: ATTORNEY_SELECT }, feeRecord: true },
      });
      return NextResponse.json({ ok: true, referral: updated });
    }

    return NextResponse.json({ ok: false, error: `未知操作：${action}` }, { status: 400 });
  } catch (err) {
    console.error("PATCH /api/marketplace/referrals/[id] failed", err);
    return NextResponse.json({ ok: false, error: "操作失败，请稍后重试" }, { status: 500 });
  }
}

// ─── DELETE ─────────────────────────────────────────────────────────────────────

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const { referral, role } = await getReferralWithAuth(id, auth.authUserId);
    if (!referral) return NextResponse.json({ ok: false, error: "转介绍记录未找到" }, { status: 404 });
    if (role !== "referrer" && auth.role !== "ADMIN") return NextResponse.json({ ok: false, error: "只有转出方可删除" }, { status: 403 });

    const deletable = ["PENDING", "DECLINED", "CANCELLED", "EXPIRED"];
    if (!deletable.includes(referral.status)) {
      return NextResponse.json({ ok: false, error: "进行中或已完成的转介绍不可删除，请先撤销" }, { status: 400 });
    }

    await prisma.caseReferral.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/marketplace/referrals/[id] failed", err);
    return NextResponse.json({ ok: false, error: "删除失败" }, { status: 500 });
  }
}
