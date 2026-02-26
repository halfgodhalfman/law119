export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-action-log";
import { createUserNotification } from "@/lib/user-notifications";

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const auth = await requireAdminAuth();
    const { reportId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: "review" | "resolve" | "dismiss" | "blacklist_target" | "clear_blacklist";
      template?: "warning_only" | "temp_mute_24h" | "temp_mute_7d" | "global_blacklist_permanent";
      adminNote?: string;
    };
    if (!body.action && !body.template) return NextResponse.json({ error: "Missing action." }, { status: 400 });

    const report = await prisma.conversationReport.findUnique({
      where: { id: reportId },
      select: { id: true, conversationId: true, reporterUserId: true, targetUserId: true, status: true },
    });
    if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

    if (body.template) {
      if (!report.targetUserId || !report.reporterUserId) {
        return NextResponse.json({ error: "Report target not available." }, { status: 400 });
      }
      const templateNote = body.adminNote?.trim() || null;
      if (body.template === "warning_only") {
        await prisma.chatMessage.create({
          data: {
            conversationId: report.conversationId,
            senderRole: "SYSTEM",
            senderUserId: auth.authUserId,
            body: "[PLATFORM_NOTICE] 平台已受理举报并发出警告，请遵守会话规则，禁止骚扰/威胁/站外诱导。",
          },
        }).catch(() => null);
        const updated = await prisma.conversationReport.update({
          where: { id: reportId },
          data: {
            status: "RESOLVED",
            adminNote: templateNote ?? "处罚模板：警告",
            handledByUserId: auth.authUserId,
            handledAt: new Date(),
          },
          select: { id: true, status: true, adminNote: true, handledAt: true },
        });
        await logAdminAction({
          adminUserId: auth.authUserId,
          entityType: "REPORT",
          entityId: reportId,
          action: "template_warning_only",
          reason: templateNote,
          metadata: { conversationId: report.conversationId },
        }).catch(() => null);
        await createUserNotification({
          userId: report.reporterUserId,
          type: "REPORT_UPDATE",
          title: "举报处理结果已更新",
          body: "平台已受理举报并发出警告",
          linkUrl: "/marketplace/support-center",
          metadata: { reportId, status: "RESOLVED" },
        }).catch(() => null);
        return NextResponse.json({ ok: true, report: updated });
      }

      const scope = body.template === "global_blacklist_permanent" ? "GLOBAL" : "CONVERSATION";
      const expiresAt =
        body.template === "temp_mute_24h"
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : body.template === "temp_mute_7d"
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            : null;

      await prisma.userBlacklist.upsert({
        where: {
          blockerUserId_blockedUserId: {
            blockerUserId: report.reporterUserId,
            blockedUserId: report.targetUserId,
          },
        },
        update: {
          active: true,
          scope,
          conversationId: scope === "CONVERSATION" ? report.conversationId : null,
          expiresAt,
          reason: templateNote || `处罚模板：${body.template}`,
          deactivatedAt: null,
          deactivatedByUserId: null,
        },
        create: {
          blockerUserId: report.reporterUserId,
          blockedUserId: report.targetUserId,
          scope,
          conversationId: scope === "CONVERSATION" ? report.conversationId : null,
          active: true,
          expiresAt,
          reason: templateNote || `处罚模板：${body.template}`,
        },
      });
      await prisma.chatMessage.create({
        data: {
          conversationId: report.conversationId,
          senderRole: "SYSTEM",
          senderUserId: auth.authUserId,
          body: `[PLATFORM_NOTICE] 平台已根据举报处理执行${scope === "GLOBAL" ? "全平台拉黑" : "会话禁言"}${expiresAt ? `（至 ${expiresAt.toLocaleString()}）` : "（永久）"}。`,
        },
      }).catch(() => null);
      const updated = await prisma.conversationReport.update({
        where: { id: reportId },
        data: {
          status: "RESOLVED",
          adminNote: templateNote ?? `处罚模板：${body.template}`,
          handledByUserId: auth.authUserId,
          handledAt: new Date(),
        },
        select: { id: true, status: true, adminNote: true, handledAt: true },
      });
      await logAdminAction({
        adminUserId: auth.authUserId,
        entityType: "REPORT",
        entityId: reportId,
        action: `template_${body.template}`,
        reason: templateNote,
        metadata: { conversationId: report.conversationId, scope, expiresAt: expiresAt?.toISOString() ?? null, targetUserId: report.targetUserId },
      }).catch(() => null);
      await createUserNotification({
        userId: report.reporterUserId,
        type: "REPORT_UPDATE",
        title: "举报处理结果已更新",
        body: `平台已执行${scope === "GLOBAL" ? "全平台拉黑" : "会话禁言"}处理`,
        linkUrl: "/marketplace/support-center",
        metadata: { reportId, status: "RESOLVED", scope },
      }).catch(() => null);
      return NextResponse.json({ ok: true, report: updated });
    }

    if (body.action === "blacklist_target") {
      if (!report.targetUserId || !report.reporterUserId) {
        return NextResponse.json({ error: "Report target not available." }, { status: 400 });
      }
      await prisma.userBlacklist.upsert({
        where: {
          blockerUserId_blockedUserId: {
            blockerUserId: report.reporterUserId,
            blockedUserId: report.targetUserId,
          },
        },
        update: {
          active: true,
          scope: "CONVERSATION",
          conversationId: report.conversationId,
          expiresAt: null,
          reason: body.adminNote?.trim() || "Admin action from report",
          deactivatedAt: null,
          deactivatedByUserId: null,
        },
        create: {
          blockerUserId: report.reporterUserId,
          blockedUserId: report.targetUserId,
          conversationId: report.conversationId,
          scope: "CONVERSATION",
          active: true,
          expiresAt: null,
          reason: body.adminNote?.trim() || "Admin action from report",
        },
      });
      const updated = await prisma.conversationReport.update({
        where: { id: reportId },
        data: {
          status: "RESOLVED",
          adminNote: body.adminNote ?? "已为举报方执行黑名单处理",
          handledByUserId: auth.authUserId,
          handledAt: new Date(),
        },
        select: { id: true, status: true, adminNote: true, handledAt: true },
      });
      await logAdminAction({
        adminUserId: auth.authUserId,
        entityType: "REPORT",
        entityId: reportId,
        action: "blacklist_target",
        reason: body.adminNote ?? null,
        metadata: { conversationId: report.conversationId, reporterUserId: report.reporterUserId, targetUserId: report.targetUserId },
      }).catch(() => null);
      await createUserNotification({
        userId: report.reporterUserId,
        type: "REPORT_UPDATE",
        title: "举报处理结果已更新",
        body: "平台已为你执行会话黑名单处理",
        linkUrl: "/marketplace/support-center",
        metadata: { reportId, status: "RESOLVED" },
      }).catch(() => null);
      return NextResponse.json({ ok: true, report: updated });
    }

    if (body.action === "clear_blacklist") {
      if (!report.targetUserId) {
        return NextResponse.json({ error: "Report target not available." }, { status: 400 });
      }
      await prisma.userBlacklist.updateMany({
        where: {
          blockerUserId: report.reporterUserId,
          blockedUserId: report.targetUserId,
          active: true,
        },
        data: {
          active: false,
          deactivatedAt: new Date(),
          deactivatedByUserId: auth.authUserId,
        },
      });
      const updated = await prisma.conversationReport.update({
        where: { id: reportId },
        data: {
          status: "REVIEWING",
          adminNote: body.adminNote ?? "已解除举报方黑名单，待继续核查",
          handledByUserId: auth.authUserId,
          handledAt: new Date(),
        },
        select: { id: true, status: true, adminNote: true, handledAt: true },
      });
      await logAdminAction({
        adminUserId: auth.authUserId,
        entityType: "REPORT",
        entityId: reportId,
        action: "clear_blacklist",
        reason: body.adminNote ?? null,
        metadata: { conversationId: report.conversationId, reporterUserId: report.reporterUserId, targetUserId: report.targetUserId },
      }).catch(() => null);
      return NextResponse.json({ ok: true, report: updated });
    }

    const status =
      body.action === "review" ? "REVIEWING" : body.action === "resolve" ? "RESOLVED" : "DISMISSED";
    const updated = await prisma.conversationReport.update({
      where: { id: reportId },
      data: {
        status,
        adminNote: body.adminNote ?? null,
        handledByUserId: auth.authUserId,
        handledAt: new Date(),
      },
      select: { id: true, status: true, adminNote: true, handledAt: true },
    });
    await logAdminAction({
      adminUserId: auth.authUserId,
      entityType: "REPORT",
      entityId: reportId,
      action: body.action!,
      reason: body.adminNote ?? null,
      metadata: { conversationId: report.conversationId, previousStatus: report.status, nextStatus: status },
    }).catch(() => null);
    await createUserNotification({
      userId: report.reporterUserId,
      type: "REPORT_UPDATE",
      title: "举报处理状态更新",
      body: `当前状态：${status}`,
      linkUrl: "/marketplace/support-center",
      metadata: { reportId, status },
    }).catch(() => null);
    return NextResponse.json({ ok: true, report: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("POST /api/marketplace/admin/reports/[reportId]/actions failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
