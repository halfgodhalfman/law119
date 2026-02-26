export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-action-log";

const schema = z.object({
  highValueBaseWeight: z.number().int().min(0).max(200),
  highValueReasonWeight: z.number().int().min(0).max(50),
  firstBidOverduePublishedWeight: z.number().int().min(0).max(200),
  firstMessageOverdueWeight: z.number().int().min(0).max(200),
  quotedNotSelectedWeight: z.number().int().min(0).max(200),
  selectedNoConversationWeight: z.number().int().min(0).max(200),
  urgentWeight: z.number().int().min(0).max(100),
});

export async function GET() {
  try {
    await requireAdminAuth();
    const settings = await prisma.opsPrioritySetting.upsert({
      where: { key: "default" },
      create: { key: "default" },
      update: {},
    });
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/ops-priority-settings failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const before = await prisma.opsPrioritySetting.findUnique({ where: { key: "default" } });
    const settings = await prisma.opsPrioritySetting.upsert({
      where: { key: "default" },
      create: { key: "default", ...parsed.data },
      update: parsed.data,
    });
    const diff = Object.fromEntries(
      Object.entries(parsed.data)
        .filter(([k, v]) => (before as any)?.[k] !== v)
        .map(([k, v]) => [k, { old: (before as any)?.[k] ?? null, new: v }]),
    );
    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "CASE",
      entityId: settings.id,
      action: "OPS_PRIORITY_SETTINGS_UPDATE",
      metadata: JSON.parse(JSON.stringify({ key: settings.key, diff })),
    }).catch(() => null);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("PATCH /api/marketplace/admin/ops-priority-settings failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
