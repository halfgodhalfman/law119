import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../../../lib/prisma";
import { requireAuthContext } from "../../../../../../../lib/auth-context";
import { logAdminAction } from "../../../../../../../lib/admin-action-log";

const actionSchema = z.object({
  action: z.enum(["close", "restore"]),
  reason: z.string().trim().max(500).optional(),
});

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { caseId } = await Promise.resolve(params);
    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const targetStatus = parsed.data.action === "close" ? "CLOSED" : "OPEN";

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.case.findUnique({
        where: { id: caseId },
        select: { id: true, status: true },
      });
      if (!current) throw new Error("CASE_NOT_FOUND");

      const updated = await tx.case.update({
        where: { id: caseId },
        data: { status: targetStatus },
        select: { id: true, status: true, updatedAt: true, title: true },
      });

      await tx.caseStatusLog.create({
        data: {
          caseId,
          fromStatus: current.status,
          toStatus: targetStatus,
          operatorId: auth.authUserId,
          reason: parsed.data.reason ?? `Admin action: ${parsed.data.action}`,
        },
      });

      return updated;
    });

    await logAdminAction({
      adminUserId: auth.authUserId,
      entityType: "CASE",
      entityId: caseId,
      action: parsed.data.action === "close" ? "CASE_CLOSE" : "CASE_RESTORE",
      reason: parsed.data.reason ?? null,
      metadata: {
        diff: { status: { old: parsed.data.action === "close" ? "OPEN_OR_MATCHING" : "CLOSED", new: result.status } },
        title: (result as any).title ?? null,
      },
    }).catch(() => null);

    return NextResponse.json({ ok: true, case: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "CASE_NOT_FOUND") {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }
    console.error("POST /api/marketplace/admin/cases/[caseId]/actions failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
