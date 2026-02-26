export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-action-log";

const intField = (min: number, max: number) => z.number().int().min(min).max(max);

const schema = z.object({
  enabled: z.boolean(),
  activeVariant: z.enum(["A", "B"]),
  abEnabled: z.boolean(),
  abRolloutPercent: intField(0, 100),

  weightUnquotedA: intField(-500, 500),
  weightUnquotedB: intField(-500, 500),
  weightQuoteableA: intField(-500, 500),
  weightQuoteableB: intField(-500, 500),
  weightSoonDeadlineA: intField(-500, 500),
  weightSoonDeadlineB: intField(-500, 500),
  weightUrgentA: intField(-500, 500),
  weightUrgentB: intField(-500, 500),
  weightHighA: intField(-500, 500),
  weightHighB: intField(-500, 500),
  weightCategoryMatchA: intField(-500, 500),
  weightCategoryMatchB: intField(-500, 500),
  weightStateMatchA: intField(-500, 500),
  weightStateMatchB: intField(-500, 500),
  weightRecencyMaxBoostA: intField(0, 500),
  weightRecencyMaxBoostB: intField(0, 500),
  weightBidCrowdingPenaltyA: intField(0, 100),
  weightBidCrowdingPenaltyB: intField(0, 100),
  bidCrowdingPenaltyCapA: intField(0, 500),
  bidCrowdingPenaltyCapB: intField(0, 500),

  categoryWhitelist: z.array(z.string().trim().min(1).max(40)).max(50),
  categoryBlacklist: z.array(z.string().trim().min(1).max(40)).max(50),
  nonWhitelistPenalty: intField(0, 500),
  blacklistPenalty: intField(0, 1000),
  whitelistBoost: intField(0, 500),

  attorneyExposureSoftCap: intField(0, 200),
  attorneyExposurePenaltyPerExtra: intField(0, 200),

  highRiskPenalty: intField(0, 1000),
  highRiskRuleHitThreshold: intField(0, 20),
  highRiskReportThreshold: intField(0, 20),
  highRiskDisputeThreshold: intField(0, 20),

  maxPerCategoryInTopN: intField(0, 50),
  categoryExposureWindow: intField(1, 100),
});

async function getOrCreate() {
  return prisma.recommendationConfig.upsert({
    where: { key: "case_hall" },
    create: {
      key: "case_hall",
      categoryWhitelist: [],
      categoryBlacklist: [],
    },
    update: {},
  });
}

export async function GET() {
  try {
    await requireAdminAuth();
    const config = await getOrCreate();
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("GET /api/marketplace/admin/recommendation-config failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const before = await getOrCreate();
    const body = await request.json().catch(() => ({}));
    const normalized = {
      ...body,
      categoryWhitelist: Array.isArray(body?.categoryWhitelist) ? body.categoryWhitelist : String(body?.categoryWhitelist ?? "").split(",").map((v) => v.trim()).filter(Boolean),
      categoryBlacklist: Array.isArray(body?.categoryBlacklist) ? body.categoryBlacklist : String(body?.categoryBlacklist ?? "").split(",").map((v) => v.trim()).filter(Boolean),
    };
    const parsed = schema.safeParse(normalized);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const config = await prisma.recommendationConfig.update({ where: { key: "case_hall" }, data: parsed.data });
    const diff = Object.fromEntries(
      Object.entries(parsed.data)
        .filter(([k, v]) => JSON.stringify((before as any)[k]) !== JSON.stringify(v))
        .map(([k, v]) => [k, { old: (before as any)[k] ?? null, new: v }])
    );
    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "CASE",
      entityId: config.key,
      action: "RECOMMENDATION_CONFIG_UPDATE",
      metadata: JSON.parse(JSON.stringify({ key: config.key, diff })),
    }).catch(() => null);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("PATCH /api/marketplace/admin/recommendation-config failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
