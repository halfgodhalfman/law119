import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  emailInstantHighPriority: z.boolean(),
  emailInstantNewMessages: z.boolean(),
  emailInstantCaseMatches: z.boolean(),
  emailDailyDigest: z.boolean(),
  emailWeeklyDigest: z.boolean(),
  inAppP0: z.boolean(),
  inAppP1: z.boolean(),
  inAppP2: z.boolean(),
  inAppP3: z.boolean(),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  preferredCaseCategories: z.array(z.string()).max(20).default([]),
  preferredBudgetMin: z.union([z.number(), z.string()]).optional().nullable(),
  preferredBudgetMax: z.union([z.number(), z.string()]).optional().nullable(),
  preferredFeeModes: z.array(z.string()).max(10).default([]),
});

function decimalInput(v: string | number | null | undefined) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

export async function GET() {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ATTORNEY") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const pref = await prisma.attorneyNotificationPreference.upsert({
      where: { userId: auth.authUserId },
      create: { userId: auth.authUserId },
      update: {},
    });
    return NextResponse.json({
      ok: true,
      preferences: {
        ...pref,
        preferredBudgetMin: pref.preferredBudgetMin?.toString() ?? "",
        preferredBudgetMax: pref.preferredBudgetMax?.toString() ?? "",
      },
    });
  } catch (e) {
    console.error("GET /api/attorney/notification-preferences failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ATTORNEY") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const updated = await prisma.attorneyNotificationPreference.upsert({
      where: { userId: auth.authUserId },
      create: {
        userId: auth.authUserId,
        ...d,
        quietHoursStart: d.quietHoursEnabled ? d.quietHoursStart ?? null : null,
        quietHoursEnd: d.quietHoursEnabled ? d.quietHoursEnd ?? null : null,
        preferredBudgetMin: decimalInput(d.preferredBudgetMin),
        preferredBudgetMax: decimalInput(d.preferredBudgetMax),
      },
      update: {
        ...d,
        quietHoursStart: d.quietHoursEnabled ? d.quietHoursStart ?? null : null,
        quietHoursEnd: d.quietHoursEnabled ? d.quietHoursEnd ?? null : null,
        preferredBudgetMin: decimalInput(d.preferredBudgetMin),
        preferredBudgetMax: decimalInput(d.preferredBudgetMax),
      },
    });
    return NextResponse.json({
      ok: true,
      preferences: {
        ...updated,
        preferredBudgetMin: updated.preferredBudgetMin?.toString() ?? "",
        preferredBudgetMax: updated.preferredBudgetMax?.toString() ?? "",
      },
    });
  } catch (e) {
    console.error("PATCH /api/attorney/notification-preferences failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

