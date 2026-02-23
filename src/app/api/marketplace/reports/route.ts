import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || (auth.role !== "CLIENT" && auth.role !== "ATTORNEY" && auth.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "").trim();
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);

    const where =
      auth.role === "ADMIN"
        ? { ...(status ? { status: status as never } : {}) }
        : {
            reporterUserId: auth.authUserId,
            ...(status ? { status: status as never } : {}),
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
          category: true,
          status: true,
          details: true,
          reportedMessageId: true,
          reportedMessageExcerpt: true,
          targetRole: true,
          targetUserId: true,
          adminNote: true,
          handledAt: true,
          createdAt: true,
          updatedAt: true,
          conversation: {
            select: {
              caseId: true,
              case: { select: { title: true } },
            },
          },
          targetUser: { select: { email: true } },
          attachments: {
            orderBy: { createdAt: "asc" },
            take: 5,
            select: { id: true, fileName: true, url: true, mimeType: true, sizeBytes: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      filters: {
        status,
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    });
  } catch (error) {
    console.error("GET /api/marketplace/reports failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
