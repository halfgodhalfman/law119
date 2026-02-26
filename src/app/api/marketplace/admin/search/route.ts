export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (!q) return NextResponse.json({ ok: true, q, results: { cases: [], users: [], attorneys: [], bids: [], conversations: [] } });

    const [cases, users, attorneys, bids, conversations] = await Promise.all([
      prisma.case.findMany({
        where: { OR: [{ id: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }] },
        select: { id: true, title: true, status: true, category: true, stateCode: true, createdAt: true },
        take: 10,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            ...(q.includes("-") ? [{ id: { equals: q } }] : []),
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, email: true, role: true, createdAt: true },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      prisma.attorneyProfile.findMany({
        where: {
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { firmName: { contains: q, mode: "insensitive" } },
            { user: { is: { email: { contains: q, mode: "insensitive" } } } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, firmName: true, isVerified: true, user: { select: { email: true } } },
        take: 10,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.bid.findMany({
        where: { OR: [{ id: { contains: q, mode: "insensitive" } }, { message: { contains: q, mode: "insensitive" } }] },
        select: { id: true, status: true, caseId: true, attorneyProfileId: true, updatedAt: true, case: { select: { title: true } } },
        take: 10,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.conversation.findMany({
        where: {
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            { bidId: { contains: q, mode: "insensitive" } },
            { case: { is: { title: { contains: q, mode: "insensitive" } } } },
            { messages: { some: { body: { contains: q, mode: "insensitive" } } } },
          ],
        },
        select: { id: true, status: true, caseId: true, bidId: true, updatedAt: true, case: { select: { title: true } } },
        take: 10,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return NextResponse.json({ ok: true, q, results: { cases, users, attorneys, bids, conversations } });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/search failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
