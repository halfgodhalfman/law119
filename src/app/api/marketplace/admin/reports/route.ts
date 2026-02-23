import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "").trim();
    const category = (url.searchParams.get("category") ?? "").trim();
    const q = (url.searchParams.get("q") ?? "").trim();
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);

    const where = {
      ...(status ? { status: status as never } : {}),
      ...(category ? { category: category as never } : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" as const } },
              { conversationId: { contains: q, mode: "insensitive" as const } },
              { details: { contains: q, mode: "insensitive" as const } },
              ...(q.includes("-") ? [{ reporterUserId: { equals: q } }, { targetUserId: { equals: q } }] : []),
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.conversationReport.count({ where }),
      prisma.conversationReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          conversationId: true,
          reporterUserId: true,
          reporterRole: true,
          targetUserId: true,
          targetRole: true,
          reportedMessageId: true,
          reportedMessageExcerpt: true,
          category: true,
          details: true,
          evidenceSnapshot: true,
          evidenceCount: true,
          attachments: {
            select: {
              id: true,
              fileName: true,
              url: true,
              mimeType: true,
              sizeBytes: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
          status: true,
          adminNote: true,
          handledByUserId: true,
          handledAt: true,
          createdAt: true,
          updatedAt: true,
          reporter: { select: { email: true } },
          targetUser: { select: { email: true } },
          conversation: { select: { caseId: true, case: { select: { title: true } } } },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      filters: { status, category, q, page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/reports failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
