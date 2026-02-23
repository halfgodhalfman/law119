import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

function toCsv(rows: Record<string, unknown>[]) {
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "").trim();
    const reconciliationStatus = (url.searchParams.get("reconciliationStatus") ?? "").trim();
    const holdOnly = url.searchParams.get("holdOnly") === "1";
    const exportCsv = url.searchParams.get("format") === "csv";
    const q = (url.searchParams.get("q") ?? "").trim();
    const take = exportCsv ? 2000 : 200;

    const items = await prisma.paymentOrder.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(reconciliationStatus ? { reconciliationStatus: reconciliationStatus as never } : {}),
        ...(holdOnly ? { holdBlockedByDispute: true } : {}),
        ...(q
          ? {
              OR: [
                { id: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
                { caseId: { contains: q, mode: "insensitive" } },
                { conversationId: { contains: q, mode: "insensitive" } },
                { holdBlockedReason: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        milestones: { orderBy: { sortOrder: "asc" } },
        _count: { select: { events: true } },
      },
    });

    const summary = {
      total: items.length,
      holdBlocked: items.filter((i) => i.holdBlockedByDispute).length,
      refundPendingReview: items.filter((i) => i.refundReviewStatus === "PENDING_REVIEW").length,
      unreconciled: items.filter((i) => i.reconciliationStatus === "UNRECONCILED" || i.reconciliationStatus === "MANUAL_REVIEW" || i.reconciliationStatus === "MISMATCH").length,
      payoutReviewPending: items.flatMap((i) => i.milestones).filter((m) => m.releaseReviewStatus === "PENDING_REVIEW").length,
    };

    if (exportCsv) {
      const csvRows = items.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        reconciliationStatus: i.reconciliationStatus,
        refundReviewStatus: i.refundReviewStatus,
        currency: i.currency,
        amountTotal: i.amountTotal,
        amountHeld: i.amountHeld,
        amountReleased: i.amountReleased,
        amountRefunded: i.amountRefunded,
        holdBlockedByDispute: i.holdBlockedByDispute,
        holdReasonCode: i.holdReasonCode,
        holdBlockedReason: i.holdBlockedReason,
        caseId: i.caseId,
        conversationId: i.conversationId,
        milestoneCount: i.milestones.length,
        payoutReviewPendingCount: i.milestones.filter((m) => m.releaseReviewStatus === "PENDING_REVIEW").length,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      }));
      return new NextResponse(toCsv(csvRows), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="finance-ops.csv"' },
      });
    }

    return NextResponse.json({ ok: true, items, summary });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("GET /api/marketplace/admin/finance-ops failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
