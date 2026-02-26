export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

const SENSITIVE_KEYWORDS = ["威胁", "诈骗", "洗钱", "suicide", "kill", "fraud"];
const DISPUTE_KEYWORDS = ["退款", "投诉", "争议", "起诉", "举报", "chargeback"];

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "").trim();
    const q = (url.searchParams.get("q") ?? "").trim();
    const flaggedOnly = url.searchParams.get("flaggedOnly") === "1";
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);

    const where = {
      ...(status ? { status: status as "OPEN" | "CLOSED" } : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" as const } },
              { bidId: { contains: q, mode: "insensitive" as const } },
              { case: { is: { title: { contains: q, mode: "insensitive" as const } } } },
              { messages: { some: { body: { contains: q, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        select: {
          id: true,
          bidId: true,
          caseId: true,
          clientProfileId: true,
          attorneyProfileId: true,
          status: true,
          consultationAcceptedAt: true,
          createdAt: true,
          updatedAt: true,
          case: { select: { title: true, category: true, status: true } },
          attorney: {
            select: { firstName: true, lastName: true, isVerified: true, user: { select: { email: true } } },
          },
          client: { select: { firstName: true, lastName: true, user: { select: { email: true } } } },
          _count: { select: { messages: true, disclaimerAcceptances: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 8,
            select: { id: true, body: true, senderRole: true, createdAt: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = rows
      .map((r) => {
        const texts = r.messages.map((m) => m.body.toLowerCase());
        const sensitiveHits = SENSITIVE_KEYWORDS.filter((kw) => texts.some((t) => t.includes(kw.toLowerCase())));
        const disputeHits = DISPUTE_KEYWORDS.filter((kw) => texts.some((t) => t.includes(kw.toLowerCase())));
        const complaintMarked = r.messages.some((m) => m.body.startsWith("[ADMIN_FLAG:COMPLAINT]"));
        const adminFlagCleared = r.messages.some((m) => m.body.startsWith("[ADMIN_FLAG:CLEARED]"));
        const flags = [
          ...(complaintMarked && !adminFlagCleared ? ["complaint_marked"] : []),
          ...(sensitiveHits.length ? ["sensitive_keyword"] : []),
          ...(disputeHits.length ? ["dispute_keyword"] : []),
        ];
        return {
          ...r,
          flags,
          sensitiveHits,
          disputeHits,
          attorneyName: [r.attorney.firstName, r.attorney.lastName].filter(Boolean).join(" "),
          clientName: r.client ? [r.client.firstName, r.client.lastName].filter(Boolean).join(" ") : "",
          latestMessage: r.messages[0] ?? null,
        };
      })
      .filter((r) => (flaggedOnly ? r.flags.length > 0 : true));

    return NextResponse.json({
      ok: true,
      items,
      filters: { status, q, flaggedOnly, page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/conversations failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

