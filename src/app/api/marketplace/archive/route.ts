export const dynamic = "force-dynamic";
// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";

export async function GET(req: Request) {
  let auth;
  try { auth = await requireAuthContext(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status"); // CLOSED, CANCELLED, or null for all
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = 20;

  const where: any = {};
  if (statusFilter === "CLOSED") where.status = "CLOSED";
  else if (statusFilter === "CANCELLED") where.status = "CANCELLED";
  else where.status = { in: ["CLOSED", "CANCELLED"] };

  if (auth.role === "CLIENT" && auth.clientProfileId) {
    where.clientProfileId = auth.clientProfileId;
  } else if (auth.role === "ATTORNEY" && auth.attorneyProfileId) {
    where.engagementConfirmations = { some: { attorneyProfileId: auth.attorneyProfileId } };
  } else if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, title: true, category: true, stateCode: true, status: true, createdAt: true, updatedAt: true,
        engagementConfirmations: {
          take: 1,
          where: { status: "ACTIVE" },
          select: { id: true, completionStatus: true, completionConfirmedAt: true, attorney: { select: { firstName: true, lastName: true } } },
        },
        paymentOrders: {
          select: { id: true, amountTotal: true, status: true },
        },
        attorneyClientReviews: {
          where: { status: "PUBLISHED" },
          select: { id: true, ratingOverall: true },
          take: 1,
        },
      },
    }),
    prisma.case.count({ where }),
  ]);

  return NextResponse.json({ ok: true, cases, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}
