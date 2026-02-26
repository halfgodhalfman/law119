export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

type AuditType = "case_status" | "bid_version" | "conversation_flag" | "conversation_message" | "admin_action" | "attachment_access";

type AdminActionMetadata = {
  key?: string;
  diff?: Record<string, { before?: unknown; after?: unknown; old?: unknown; new?: unknown } | undefined>;
};

function toCsv(rows: Record<string, unknown>[]) {
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const type = (url.searchParams.get("type") ?? "").trim() as AuditType | "";
    const actionFilter = (url.searchParams.get("action") ?? "").trim();
    const entityTypeFilter = (url.searchParams.get("entityType") ?? "").trim();
    const exportCsv = (url.searchParams.get("format") ?? "").trim() === "csv";
    const q = (url.searchParams.get("q") ?? "").trim();
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "30") || 30, 1), 100);

    const [caseLogs, bidVersions, flaggedMessages, recentMessages, adminActions, attachmentAccessLogs] = await Promise.all([
      prisma.caseStatusLog.findMany({
        take: 80,
        orderBy: { createdAt: "desc" },
        where: q
          ? {
              OR: [
                { caseId: { contains: q, mode: "insensitive" } },
                ...(q.includes("-") ? [{ operatorId: { equals: q } }] : []),
                { reason: { contains: q, mode: "insensitive" } },
              ],
            }
          : undefined,
        select: { id: true, caseId: true, fromStatus: true, toStatus: true, operatorId: true, reason: true, createdAt: true, case: { select: { title: true } } },
      }),
      prisma.bidVersion.findMany({
        take: 80,
        orderBy: { createdAt: "desc" },
        where: q ? { OR: [{ bidId: { contains: q, mode: "insensitive" } }, { message: { contains: q, mode: "insensitive" } }] } : undefined,
        select: { id: true, bidId: true, version: true, status: true, feeQuoteMin: true, feeQuoteMax: true, createdAt: true, bid: { select: { caseId: true, attorneyProfileId: true, case: { select: { title: true } } } } },
      }),
      prisma.chatMessage.findMany({
        take: 80,
        orderBy: { createdAt: "desc" },
        where: {
          AND: [
            { senderRole: "SYSTEM" },
            { body: { contains: "[ADMIN_FLAG:", mode: "insensitive" } },
            ...(q
              ? [{ OR: [{ body: { contains: q, mode: "insensitive" as const } }, { conversationId: { contains: q, mode: "insensitive" as const } }] }]
              : []),
          ],
        },
        select: { id: true, conversationId: true, senderUserId: true, body: true, createdAt: true, conversation: { select: { caseId: true, bidId: true, case: { select: { title: true } } } } },
      }),
      prisma.chatMessage.findMany({
        take: 80,
        orderBy: { createdAt: "desc" },
        where: {
          ...(q ? { OR: [{ body: { contains: q, mode: "insensitive" as const } }, { conversationId: { contains: q, mode: "insensitive" as const } }] } : {}),
        },
        select: { id: true, conversationId: true, senderRole: true, senderUserId: true, body: true, createdAt: true, conversation: { select: { caseId: true, bidId: true, case: { select: { title: true } } } } },
      }),
      prisma.adminActionLog.findMany({
        take: 80,
        orderBy: { createdAt: "desc" },
        where: {
          ...(actionFilter ? { action: actionFilter } : {}),
          ...(entityTypeFilter ? { entityType: entityTypeFilter as never } : {}),
          ...(q
            ? {
                OR: [
                  { entityId: { contains: q, mode: "insensitive" } },
                  { action: { contains: q, mode: "insensitive" } },
                  { reason: { contains: q, mode: "insensitive" } },
                  ...(q.includes("-") ? [{ adminUserId: { equals: q } }] : []),
                ],
              }
            : {}),
        },
        select: { id: true, adminUserId: true, entityType: true, entityId: true, action: true, reason: true, metadata: true, createdAt: true, admin: { select: { email: true } } },
      }),
      prisma.caseImageAccessLog.findMany({
        take: 80,
        orderBy: { createdAt: "desc" },
        where: q
          ? {
              OR: [
                { caseId: { contains: q, mode: "insensitive" } },
                { caseImageId: { contains: q, mode: "insensitive" } },
                { accessType: { contains: q, mode: "insensitive" } },
                { reason: { contains: q, mode: "insensitive" } },
              ],
            }
          : undefined,
        select: { id: true, caseId: true, caseImageId: true, viewerUserId: true, viewerRole: true, accessType: true, reason: true, createdAt: true, case: { select: { title: true } } },
      }),
    ]);

    let events = [
      ...caseLogs.map((e) => ({
        id: `case-${e.id}`,
        type: "case_status" as const,
        at: e.createdAt,
        title: `案件状态变更`,
        detail: `${e.case.title} (${e.caseId}) ${e.fromStatus ?? "NULL"} -> ${e.toStatus}${e.reason ? ` / ${e.reason}` : ""}`,
        eventCode: "CASE_STATUS_CHANGE",
        entityType: "CASE",
        actionCode: `CASE_STATUS_${e.toStatus}`,
        refs: { caseId: e.caseId, operatorId: e.operatorId ?? null },
      })),
      ...bidVersions.map((e) => ({
        id: `bidv-${e.id}`,
        type: "bid_version" as const,
        at: e.createdAt,
        title: `报价版本更新 v${e.version}`,
        detail: `${e.bid.case.title} / Bid ${e.bidId} / ${e.status} / ${e.feeQuoteMin ?? "-"}~${e.feeQuoteMax ?? "-"}`,
        eventCode: "BID_VERSION_CREATED",
        entityType: "BID",
        actionCode: `BID_VERSION_${e.status}`,
        refs: { caseId: e.bid.caseId, bidId: e.bidId, attorneyProfileId: e.bid.attorneyProfileId },
      })),
      ...flaggedMessages.map((e) => ({
        id: `flag-${e.id}`,
        type: "conversation_flag" as const,
        at: e.createdAt,
        title: `会话标记`,
        detail: `${e.conversation.case.title} / ${e.body}`,
        eventCode: "CONVERSATION_FLAG",
        entityType: "CONVERSATION",
        actionCode: "CONVERSATION_FLAG_MESSAGE",
        refs: { conversationId: e.conversationId, caseId: e.conversation.caseId, bidId: e.conversation.bidId },
      })),
      ...recentMessages.map((e) => ({
        id: `msg-${e.id}`,
        type: "conversation_message" as const,
        at: e.createdAt,
        title: `会话消息（${e.senderRole})`,
        detail: `${e.conversation.case.title} / ${(e.body ?? "").slice(0, 120)}`,
        eventCode: "CONVERSATION_MESSAGE",
        entityType: "CONVERSATION",
        actionCode: `CONVERSATION_MESSAGE_${e.senderRole}`,
        refs: { conversationId: e.conversationId, caseId: e.conversation.caseId, bidId: e.conversation.bidId, senderUserId: e.senderUserId ?? null },
      })),
      ...adminActions.map((e) => {
        const metadata = (e.metadata ?? null) as AdminActionMetadata | null;
        const diff = metadata?.diff && typeof metadata.diff === "object" ? metadata.diff : undefined;
        const diffLines =
          (e.action === "OPS_PRIORITY_SETTINGS_UPDATE" || e.action === "RECOMMENDATION_CONFIG_UPDATE") && diff
            ? Object.entries(diff)
                .slice(0, 12)
                .map(([field, values]) => `${field}: ${String((values as any)?.before ?? (values as any)?.old ?? "null")} -> ${String((values as any)?.after ?? (values as any)?.new ?? "null")}`)
            : [];

        return {
          id: `admin-${e.id}`,
          type: "admin_action" as const,
          at: e.createdAt,
          title: `后台动作 ${e.action}`,
          detail: `${e.entityType} / ${e.entityId}${e.reason ? ` / ${e.reason}` : ""}${diffLines.length ? `\n${diffLines.join("\n")}` : ""}`,
          refs: { adminUserId: e.adminUserId, adminEmail: e.admin.email, entityType: e.entityType, entityId: e.entityId },
          eventCode: `ADMIN_ACTION:${e.action}`,
          entityType: e.entityType,
          actionCode: e.action,
          actorLabel: e.admin.email ?? e.adminUserId,
          action: e.action,
          metadata: metadata ?? null,
        };
      }),
      ...attachmentAccessLogs.map((e) => ({
        id: `attach-${e.id}`,
        type: "attachment_access" as const,
        at: e.createdAt,
        title: `附件访问 ${e.accessType}`,
        detail: `${e.case.title} / Attachment ${e.caseImageId}${e.reason ? ` / ${e.reason}` : ""}`,
        eventCode: "CASE_ATTACHMENT_ACCESS",
        entityType: "CASE",
        actionCode: `CASE_ATTACHMENT_${e.accessType}`,
        refs: { caseId: e.caseId, senderUserId: e.viewerUserId },
      })),
    ];

    if (type) events = events.filter((e) => e.type === type);
    if (actionFilter) events = events.filter((e: any) => e.actionCode === actionFilter);
    if (entityTypeFilter) events = events.filter((e: any) => e.entityType === entityTypeFilter);
    events.sort((a, b) => b.at.getTime() - a.at.getTime());

    const total = events.length;
    const paged = events.slice((page - 1) * pageSize, page * pageSize);

    if (exportCsv) {
      const csvRows = events.map((e: any) => ({
        id: e.id,
        at: e.at.toISOString(),
        type: e.type,
        eventCode: e.eventCode ?? "",
        title: e.title,
        detail: e.detail,
        entityType: e.entityType ?? e.refs?.entityType ?? "",
        entityId: e.refs?.entityId ?? "",
        actionCode: e.actionCode ?? "",
        actor: e.actorLabel ?? e.refs?.adminEmail ?? e.refs?.operatorId ?? "",
        diffJson: e.metadata?.diff ? JSON.stringify(e.metadata.diff) : "",
        caseId: e.refs?.caseId ?? "",
        bidId: e.refs?.bidId ?? "",
        conversationId: e.refs?.conversationId ?? "",
      }));
      return new NextResponse(toCsv(csvRows), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename=\"admin-audit.csv\"' },
      });
    }

    return NextResponse.json({
      ok: true,
      items: paged.map((e) => ({ ...e, at: e.at.toISOString() })),
      filters: { type, q, action: actionFilter, entityType: entityTypeFilter, page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
      sources: ["CaseStatusLog", "BidVersion", "ChatMessage(system/admin-flag)", "ChatMessage(recent)", "AdminActionLog", "CaseImageAccessLog"],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/audit failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
