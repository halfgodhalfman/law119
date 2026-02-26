export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuthContext } from "../../../../../../lib/auth-context";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

type TimelineEvent = {
  id: string;
  at: Date;
  type: "case_created" | "status_changed" | "bid_version" | "conversation_opened" | "conversation_closed";
  title: string;
  detail?: string;
  meta?: Record<string, unknown>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await Promise.resolve(params);
    const auth = await requireAuthContext().catch(() => null);

    const item = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        clientProfileId: true,
        createdAt: true,
        statusLogs: {
          orderBy: { createdAt: "desc" },
          take: 100,
          select: { id: true, fromStatus: true, toStatus: true, reason: true, createdAt: true },
        },
        bids: {
          select: {
            id: true,
            attorneyProfileId: true,
            versions: {
              orderBy: { createdAt: "desc" },
              take: 50,
              select: {
                id: true,
                version: true,
                feeQuoteMin: true,
                feeQuoteMax: true,
                feeMode: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        conversations: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            attorneyProfileId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!item) return NextResponse.json({ error: "Case not found." }, { status: 404 });

    const isAdmin = auth?.role === "ADMIN";
    const isOwnerClient = Boolean(auth?.clientProfileId && auth.clientProfileId === item.clientProfileId);
    const isAttorney = auth?.role === "ATTORNEY" && auth.attorneyProfileId;
    const canViewFullTimeline = isAdmin || isOwnerClient || Boolean(isAttorney);

    if (!canViewFullTimeline) {
      return NextResponse.json({
        ok: true,
        events: [
          {
            id: `case-created-${item.id}`,
            at: item.createdAt,
            type: "case_created",
            title: "案件已发布",
          },
        ],
      });
    }

    const visibleAttorneyProfileId = isAttorney ? auth!.attorneyProfileId! : null;
    const visibleBids = visibleAttorneyProfileId
      ? item.bids.filter((b) => b.attorneyProfileId === visibleAttorneyProfileId)
      : item.bids;
    const visibleConversations = visibleAttorneyProfileId
      ? item.conversations.filter((c) => c.attorneyProfileId === visibleAttorneyProfileId)
      : item.conversations;

    const events: TimelineEvent[] = [];
    events.push({
      id: `case-created-${item.id}`,
      at: item.createdAt,
      type: "case_created",
      title: "案件已发布",
    });

    for (const log of item.statusLogs) {
      events.push({
        id: `status-${log.id}`,
        at: log.createdAt,
        type: "status_changed",
        title: `状态变更：${log.fromStatus ?? "N/A"} -> ${log.toStatus}`,
        detail: log.reason ?? undefined,
      });
    }

    for (const bid of visibleBids) {
      for (const v of bid.versions) {
        events.push({
          id: `bidv-${v.id}`,
          at: v.createdAt,
          type: "bid_version",
          title: `报价版本 v${v.version}`,
          detail: `${v.feeMode} · ${v.feeQuoteMin ?? "?"}-${v.feeQuoteMax ?? "?"} · ${v.status}`,
          meta: { bidId: bid.id, attorneyProfileId: bid.attorneyProfileId, version: v.version },
        });
      }
    }

    for (const conv of visibleConversations) {
      events.push({
        id: `conv-open-${conv.id}`,
        at: conv.createdAt,
        type: "conversation_opened",
        title: "沟通会话已创建",
        detail: `会话 ${conv.status}`,
        meta: { conversationId: conv.id, status: conv.status },
      });
      if (conv.status === "CLOSED") {
        events.push({
          id: `conv-closed-${conv.id}`,
          at: conv.updatedAt,
          type: "conversation_closed",
          title: "沟通会话已关闭",
          meta: { conversationId: conv.id },
        });
      }
    }

    events.sort((a, b) => b.at.getTime() - a.at.getTime());

    return NextResponse.json({
      ok: true,
      events,
      conversationEntry: visibleConversations.find((c) => c.status === "OPEN")?.id ?? visibleConversations[0]?.id ?? null,
    });
  } catch (error) {
    console.error("GET /api/marketplace/cases/[caseId]/timeline failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

