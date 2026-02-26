export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "").trim();
    const q = (url.searchParams.get("q") ?? "").trim();
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);

    const where = {
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" as const } },
              { title: { contains: q, mode: "insensitive" as const } },
              { category: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              ...(q.includes("-") ? [{ conversationId: { equals: q } }, { caseId: { equals: q } }, { bidId: { equals: q } }] : []),
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.disputeTicket.count({ where }),
      prisma.disputeTicket.findMany({
        where,
        orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          status: true,
          priority: true,
          category: true,
          title: true,
          assignedAdminUserId: true,
          slaDueAt: true,
          firstResponseAt: true,
          createdAt: true,
          updatedAt: true,
          conversationId: true,
          caseId: true,
          bidId: true,
          createdBy: { select: { email: true, role: true } },
          assignedAdmin: { select: { email: true } },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      filters: { status, q, page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
      templates: [
        { code: "request_documents", title: "请补充材料", body: "您好，平台已受理争议。为便于处理，请在 24 小时内补充相关截图、付款记录或聊天证据。" },
        { code: "cool_down", title: "冷静期提示", body: "平台提醒双方保持理性沟通，避免人身攻击。我们正在审核并将在 SLA 时限内回复。" },
        { code: "resolution_notice", title: "处理结果通知", body: "平台已完成核查并更新工单状态。如对结果有异议，请在工单中补充说明。" },
      ],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/disputes failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

