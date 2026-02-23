import { prisma } from "./prisma";

export async function getConversationParticipants(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      status: true,
      client: { select: { userId: true, firstName: true, lastName: true, phone: true } },
      attorney: { select: { userId: true, firstName: true, lastName: true } },
    },
  });
}

export async function getConversationSafetyState(params: {
  conversationId: string;
  viewerUserId: string;
}) {
  const { conversationId, viewerUserId } = params;
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      status: true,
      client: { select: { userId: true } },
      attorney: { select: { userId: true } },
    },
  });
  if (!conversation) return null;

  const peerUserId =
    conversation.client?.userId === viewerUserId
      ? conversation.attorney.userId
      : conversation.attorney.userId === viewerUserId
        ? conversation.client?.userId ?? null
        : null;

  if (peerUserId) {
    await prisma.userBlacklist.updateMany({
      where: {
        active: true,
        expiresAt: { lte: new Date() },
        OR: [
          { blockerUserId: viewerUserId, blockedUserId: peerUserId },
          { blockerUserId: peerUserId, blockedUserId: viewerUserId },
        ],
      },
      data: {
        active: false,
        deactivatedAt: new Date(),
      },
    }).catch(() => null);
  }

  const [viewerBlockRows, peerBlockRows, pendingReports] = await Promise.all([
    peerUserId
      ? prisma.userBlacklist.findMany({
          where: { blockerUserId: viewerUserId, blockedUserId: peerUserId, active: true },
          select: { id: true, active: true, reason: true, updatedAt: true, scope: true, conversationId: true, expiresAt: true },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve(null),
    peerUserId
      ? prisma.userBlacklist.findMany({
          where: { blockerUserId: peerUserId, blockedUserId: viewerUserId, active: true },
          select: { id: true, active: true, reason: true, updatedAt: true, scope: true, conversationId: true, expiresAt: true },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve(null),
    prisma.conversationReport.count({
      where: {
        conversationId,
        reporterUserId: viewerUserId,
        status: { in: ["PENDING", "REVIEWING"] },
      },
    }),
  ]);

  const resolveBlock = (
    rows: Array<{ id: string; scope: "CONVERSATION" | "GLOBAL"; conversationId: string | null; active: boolean; expiresAt: Date | null }> | null,
  ) => {
    if (!rows || rows.length === 0) return null;
    const global = rows.find((r) => r.scope === "GLOBAL");
    if (global) return global;
    return rows.find((r) => r.scope === "CONVERSATION" && r.conversationId === conversationId) ?? null;
  };

  const myBlock = resolveBlock(viewerBlockRows);
  const peerBlock = resolveBlock(peerBlockRows);
  const blockedByMe = Boolean(myBlock?.active);
  const blockedByPeer = Boolean(peerBlock?.active);

  return {
    conversationStatus: conversation.status,
    peerUserId,
    blockedByMe,
    blockedByPeer,
    canSendMessages: conversation.status === "OPEN" && !blockedByMe && !blockedByPeer,
    myBlacklistEntryId: myBlock?.id ?? null,
    peerBlacklistEntryId: peerBlock?.id ?? null,
    myBlacklistScope: myBlock?.scope ?? null,
    peerBlacklistScope: peerBlock?.scope ?? null,
    myBlacklistExpiresAt: myBlock?.expiresAt?.toISOString() ?? null,
    peerBlacklistExpiresAt: peerBlock?.expiresAt?.toISOString() ?? null,
    myPendingReports: pendingReports,
  };
}
