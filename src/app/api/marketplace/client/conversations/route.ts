import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

function classifyConversation(item: {
  status: string;
  updatedAt: Date;
  messages: Array<{ senderRole: string; createdAt: Date; body: string }>;
}) {
  const latest = item.messages[0] ?? null;
  const now = Date.now();
  const latestAt = latest ? new Date(latest.createdAt).getTime() : new Date(item.updatedAt).getTime();
  const isNew = Boolean(latest && latest.senderRole === "ATTORNEY" && now - latestAt <= 24 * 60 * 60 * 1000);
  const awaitingClient = Boolean(latest && latest.senderRole === "ATTORNEY" && item.status === "OPEN");
  return { latest, isNew, awaitingClient };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "CLIENT" || !auth.clientProfileId) {
      return NextResponse.json({ error: "Client login required." }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "all").trim();
    const sort = (url.searchParams.get("sort") ?? "updated_desc").trim();
    const q = (url.searchParams.get("q") ?? "").trim();
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);

    const baseWhere = {
      clientProfileId: auth.clientProfileId,
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" as const } },
              { case: { title: { contains: q, mode: "insensitive" as const } } },
              { attorney: { is: { firstName: { contains: q, mode: "insensitive" as const } } } },
              { attorney: { is: { lastName: { contains: q, mode: "insensitive" as const } } } },
              { attorney: { is: { firmName: { contains: q, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    };

    const rawItems = await prisma.conversation.findMany({
      where: baseWhere,
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        caseId: true,
        bidId: true,
        consultationAcceptedAt: true,
        case: { select: { title: true, category: true, status: true } },
        attorney: { select: { id: true, firstName: true, lastName: true, firmName: true, user: { select: { email: true } } } },
        readStates: {
          where: { userId: auth.authUserId },
          take: 1,
          select: { lastReadAt: true, lastReadMessageId: true, lastSeenAt: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { senderRole: true, createdAt: true, body: true },
        },
        disputeTickets: {
          where: { status: { in: ["OPEN", "UNDER_REVIEW", "WAITING_PARTY"] } },
          select: { id: true, status: true, priority: true },
          orderBy: { createdAt: "desc" },
          take: 2,
        },
        reports: {
          where: { reporterUserId: auth.authUserId },
          select: { id: true, status: true, category: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 2,
        },
      },
    });

    const unreadCounts = await Promise.all(
      rawItems.map(async (item) => {
        const myRead = item.readStates[0] ?? null;
        const count = await prisma.chatMessage.count({
          where: {
            conversationId: item.id,
            senderRole: "ATTORNEY",
            ...(myRead?.lastReadAt ? { createdAt: { gt: myRead.lastReadAt } } : {}),
          },
        });
        return [item.id, count] as const;
      }),
    );
    const unreadCountMap = new Map(unreadCounts);

    const mapped = rawItems.map((item) => {
      const derived = classifyConversation(item as any);
      const myRead = item.readStates[0] ?? null;
      const latest = item.messages[0] ?? null;
      const latestAt = latest ? new Date(latest.createdAt).getTime() : 0;
      const readAt = myRead?.lastReadAt ? new Date(myRead.lastReadAt).getTime() : 0;
      const unreadCount = unreadCountMap.get(item.id) ?? 0;
      const unreadByClient = unreadCount > 0 || Boolean(latest && latest.senderRole === "ATTORNEY" && latestAt > readAt);
      return {
        ...item,
        latestMessage: latest ?? derived.latest,
        latestAttorneyMessageAt:
          latest && latest.senderRole === "ATTORNEY" ? latest.createdAt : null,
        unreadCount,
        flags: {
          isNew: unreadByClient && (Date.now() - latestAt <= 24 * 60 * 60 * 1000),
          awaitingClientReply: unreadByClient && item.status === "OPEN",
        },
      };
    });

    const filtered = mapped.filter((item) => {
      if (status === "all") return true;
      if (status === "open") return item.status === "OPEN";
      if (status === "closed") return item.status !== "OPEN";
      if (status === "awaiting_client") return item.flags.awaitingClientReply;
      if (status === "new") return item.flags.isNew;
      return true;
    });

    const sorted = [...filtered].sort((a: any, b: any) => {
      if (sort === "unread_desc") {
        const unreadDiff = (b.unreadCount ?? 0) - (a.unreadCount ?? 0);
        if (unreadDiff !== 0) return unreadDiff;
      }
      if (sort === "attorney_latest_desc") {
        const aTs = a.latestAttorneyMessageAt ? new Date(a.latestAttorneyMessageAt).getTime() : 0;
        const bTs = b.latestAttorneyMessageAt ? new Date(b.latestAttorneyMessageAt).getTime() : 0;
        if (bTs !== aTs) return bTs - aTs;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const total = sorted.length;
    const items = sorted.slice((page - 1) * pageSize, page * pageSize);

    const summary = {
      total,
      open: mapped.filter((i) => i.status === "OPEN").length,
      closed: mapped.filter((i) => i.status !== "OPEN").length,
      awaitingClient: mapped.filter((i) => i.flags.awaitingClientReply).length,
      newMessages24h: mapped.filter((i) => i.flags.isNew).length,
    };

    return NextResponse.json({
      ok: true,
      items,
      summary,
      filters: { status, sort, q, page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  } catch (error) {
    console.error("GET /api/marketplace/client/conversations failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "CLIENT" || !auth.clientProfileId) {
      return NextResponse.json({ error: "Client login required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: "mark_all_read" | "mark_selected_read";
      conversationIds?: string[];
    };
    const action = body.action;
    if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 });

    const whereBase = { clientProfileId: auth.clientProfileId };
    const targetConversations =
      action === "mark_all_read"
        ? await prisma.conversation.findMany({
            where: whereBase,
            select: {
              id: true,
              messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, createdAt: true } },
            },
          })
        : await prisma.conversation.findMany({
            where: {
              ...whereBase,
              id: { in: Array.from(new Set((body.conversationIds ?? []).filter(Boolean))) },
            },
            select: {
              id: true,
              messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, createdAt: true } },
            },
          });

    if (action === "mark_selected_read" && !targetConversations.length) {
      return NextResponse.json({ error: "No conversations selected" }, { status: 400 });
    }

    const now = new Date();
    await prisma.$transaction(
      targetConversations.map((conversation) => {
        const latest = conversation.messages[0] ?? null;
        return prisma.conversationReadState.upsert({
          where: { conversationId_userId: { conversationId: conversation.id, userId: auth.authUserId } },
          create: {
            conversationId: conversation.id,
            userId: auth.authUserId,
            role: "CLIENT",
            lastSeenAt: now,
            lastReadAt: latest ? new Date(latest.createdAt) : now,
            lastReadMessageId: latest?.id ?? null,
          },
          update: {
            lastSeenAt: now,
            lastReadAt: latest ? new Date(latest.createdAt) : now,
            lastReadMessageId: latest?.id ?? null,
          },
        });
      }),
    );

    return NextResponse.json({ ok: true, updatedCount: targetConversations.length });
  } catch (error) {
    console.error("PATCH /api/marketplace/client/conversations failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
