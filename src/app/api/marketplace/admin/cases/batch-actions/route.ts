import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuthContext } from "../../../../../../lib/auth-context";

const batchSchema = z.object({
  action: z.enum(["close", "restore"]),
  caseIds: z.array(z.string().trim().min(1)).min(1).max(100),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const ids = Array.from(new Set(parsed.data.caseIds));
    const targetStatus = parsed.data.action === "close" ? "CLOSED" : "OPEN";
    const reason = parsed.data.reason ?? `Admin batch action: ${parsed.data.action}`;

    const existingCases = await prisma.case.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });
    const existingMap = new Map(existingCases.map((c) => [c.id, c]));

    const results = await prisma.$transaction(async (tx) => {
      const updates: Array<{ id: string; status: string; updatedAt: Date }> = [];
      const missing: string[] = [];

      for (const caseId of ids) {
        const current = existingMap.get(caseId);
        if (!current) {
          missing.push(caseId);
          continue;
        }
        const updated = await tx.case.update({
          where: { id: caseId },
          data: { status: targetStatus },
          select: { id: true, status: true, updatedAt: true },
        });
        await tx.caseStatusLog.create({
          data: {
            caseId,
            fromStatus: current.status,
            toStatus: targetStatus,
            operatorId: auth.authUserId,
            reason,
          },
        });
        updates.push(updated);
      }

      return { updates, missing };
    });

    return NextResponse.json({
      ok: true,
      action: parsed.data.action,
      appliedCount: results.updates.length,
      missingCount: results.missing.length,
      cases: results.updates,
      missingCaseIds: results.missing,
    });
  } catch (error) {
    console.error("POST /api/marketplace/admin/cases/batch-actions failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
