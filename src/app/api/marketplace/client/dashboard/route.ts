export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "CLIENT" || !auth.clientProfileId) {
      return NextResponse.json({ error: "Client login required." }, { status: 401 });
    }

    const [cases, conversations, payments, disputes, reports, notifications] = await Promise.all([
      prisma.case.findMany({
        where: { clientProfileId: auth.clientProfileId },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          status: true,
          selectedBidId: true,
          quoteDeadline: true,
          updatedAt: true,
          _count: { select: { bids: true, conversations: true } },
        },
      }),
      prisma.conversation.findMany({
        where: { clientProfileId: auth.clientProfileId },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          caseId: true,
          updatedAt: true,
          case: { select: { title: true } },
          attorney: { select: { firstName: true, lastName: true, firmName: true, user: { select: { email: true } } } },
          readStates: {
            where: { userId: auth.authUserId },
            take: 1,
            select: { lastReadAt: true, lastReadMessageId: true, lastSeenAt: true },
          },
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { senderRole: true, body: true, createdAt: true } },
        },
      }),
      prisma.paymentOrder.findMany({
        where: { clientProfileId: auth.clientProfileId },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          status: true,
          currency: true,
          amountTotal: true,
          holdBlockedByDispute: true,
          updatedAt: true,
          milestones: {
            select: { id: true, status: true, title: true, amount: true, releaseRequestedAt: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.disputeTicket.findMany({
        where: { clientProfileId: auth.clientProfileId },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          slaDueAt: true,
          updatedAt: true,
        },
      }),
      prisma.conversationReport.findMany({
        where: { reporterUserId: auth.authUserId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, status: true, category: true, conversationId: true, createdAt: true, handledAt: true },
      }),
      prisma.userNotification.findMany({
        where: { userId: auth.authUserId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, type: true, status: true, title: true, body: true, linkUrl: true, createdAt: true },
      }),
    ]);

    const now = Date.now();
    const caseCards = cases.map((c) => {
      const lifecycle =
        c.status === "CLOSED"
          ? "completed"
          : c.status === "CANCELLED"
            ? "cancelled"
            : c.selectedBidId
              ? "in_progress"
              : "pending_select";
      const quoteDeadlinePassed = c.quoteDeadline ? new Date(c.quoteDeadline).getTime() < now : false;
      return { ...c, lifecycle, quoteDeadlinePassed };
    });

    const convCards = conversations.map((c) => {
      const latest = c.messages[0] ?? null;
      const latestAt = latest ? new Date(latest.createdAt).getTime() : new Date(c.updatedAt).getTime();
      const myRead = c.readStates[0] ?? null;
      const readAt = myRead?.lastReadAt ? new Date(myRead.lastReadAt).getTime() : 0;
      const unreadByClient = Boolean(latest && latest.senderRole === "ATTORNEY" && latestAt > readAt);
      return {
        ...c,
        latestMessage: latest,
        flags: {
          awaitingClientReply: Boolean(unreadByClient && c.status === "OPEN"),
          newMessage24h: Boolean(unreadByClient && now - latestAt <= 24 * 60 * 60 * 1000),
        },
      };
    });

    const paymentCards = payments.map((p) => {
      const milestonesAwaitingClient = p.milestones.filter((m) => m.status === "READY_FOR_RELEASE").length;
      const refunding = p.status === "REFUND_PENDING";
      return { ...p, milestonesAwaitingClient, refunding };
    });

    const disputeCards = disputes.map((d) => ({
      ...d,
      needsClientReply: d.status === "WAITING_PARTY",
      slaOverdue: d.slaDueAt ? new Date(d.slaDueAt).getTime() < now && !["RESOLVED", "CLOSED"].includes(d.status) : false,
    }));

    const summary = {
      cases: {
        pendingSelect: caseCards.filter((c) => c.lifecycle === "pending_select").length,
        inProgress: caseCards.filter((c) => c.lifecycle === "in_progress").length,
        completed: caseCards.filter((c) => c.lifecycle === "completed").length,
      },
      conversations: {
        awaitingReply: convCards.filter((c) => c.flags.awaitingClientReply).length,
        newMessages24h: convCards.filter((c) => c.flags.newMessage24h).length,
      },
      payments: {
        milestoneConfirmationsPending: paymentCards.reduce((sum, p) => sum + p.milestonesAwaitingClient, 0),
        refunding: paymentCards.filter((p) => p.refunding).length,
      },
      support: {
        disputesInProgress: disputeCards.filter((d) => ["OPEN", "UNDER_REVIEW", "WAITING_PARTY"].includes(d.status)).length,
        disputesNeedReply: disputeCards.filter((d) => d.needsClientReply).length,
        reportsPending: reports.filter((r) => r.status === "PENDING" || r.status === "REVIEWING").length,
        notificationsUnread: notifications.filter((n) => n.status === "UNREAD").length,
      },
    };

    return NextResponse.json({
      ok: true,
      summary,
      modules: {
        cases: caseCards.slice(0, 6),
        conversations: convCards.slice(0, 6),
        payments: paymentCards.slice(0, 6),
        disputes: disputeCards.slice(0, 6),
        reports: reports.slice(0, 6),
        notifications: notifications.slice(0, 6),
      },
      supportContact: {
        channels: [
          { type: "dispute_ticket", label: "争议工单", href: "/marketplace/disputes" },
          { type: "in_chat_report", label: "会话内举报", hint: "进入聊天页面点击“举报”或“举报此消息”" },
          { type: "admin_center", label: "平台客服入口", href: "/marketplace/support-center" },
          { type: "notifications", label: "平台通知中心", href: "/marketplace/notifications" },
        ],
      },
    });
  } catch (error) {
    console.error("GET /api/marketplace/client/dashboard failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
