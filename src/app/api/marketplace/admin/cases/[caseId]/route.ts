import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuthContext } from "../../../../../../lib/auth-context";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { caseId } = await Promise.resolve(params);
    const item = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        bids: {
          orderBy: { updatedAt: "desc" },
          include: {
            _count: { select: { versions: true } },
          },
        },
        conversations: {
          orderBy: { updatedAt: "desc" },
        },
        statusLogs: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
        _count: { select: { bids: true, conversations: true } },
      },
    });

    if (!item) return NextResponse.json({ error: "Case not found." }, { status: 404 });

    return NextResponse.json({
      ok: true,
      case: item,
    });
  } catch (error) {
    console.error("GET /api/marketplace/admin/cases/[caseId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
