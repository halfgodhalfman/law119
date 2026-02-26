export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultContentRuleConfigs } from "@/lib/content-rules";
import { logAdminAction } from "@/lib/admin-action-log";

const upsertSchema = z.object({
  id: z.string().optional(),
  scope: z.enum(["CASE_POST", "BID_SUBMISSION", "CHAT_MESSAGE"]),
  ruleCode: z.string().trim().min(2).max(80),
  enabled: z.boolean(),
  action: z.enum(["ALLOW", "WARN", "REVIEW", "BLOCK"]),
  severity: z.string().trim().min(1).max(20),
  pattern: z.string().trim().min(1).max(500),
  patternType: z.enum(["regex", "contains"]).default("regex"),
  description: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    await ensureDefaultContentRuleConfigs();
    const url = new URL(request.url);
    const scope = (url.searchParams.get("scope") ?? "").trim();

    const [items, stats] = await Promise.all([
      prisma.contentRuleConfig.findMany({
        where: scope ? { scope: scope as never } : undefined,
        orderBy: [{ scope: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.contentRuleEvent.groupBy({
        by: ["scope", "ruleCode", "action"],
        _count: { _all: true },
        orderBy: { _count: { ruleCode: "desc" } },
        take: 50,
      }).catch(() => [] as any[]),
    ]);

    return NextResponse.json({ ok: true, items, stats });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("GET /api/marketplace/admin/content-rules failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const parsed = upsertSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const before = d.id ? await prisma.contentRuleConfig.findUnique({ where: { id: d.id } }) : null;
    const item = d.id
      ? await prisma.contentRuleConfig.update({
          where: { id: d.id },
          data: {
            scope: d.scope,
            ruleCode: d.ruleCode,
            enabled: d.enabled,
            action: d.action,
            severity: d.severity,
            pattern: d.pattern,
            patternType: d.patternType,
            description: d.description ?? null,
            sortOrder: d.sortOrder,
          },
        })
      : await prisma.contentRuleConfig.create({
          data: {
            scope: d.scope,
            ruleCode: d.ruleCode,
            enabled: d.enabled,
            action: d.action,
            severity: d.severity,
            pattern: d.pattern,
            patternType: d.patternType,
            description: d.description ?? null,
            sortOrder: d.sortOrder,
          },
        });
    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "CASE",
      entityId: item.id,
      action: d.id ? "CONTENT_RULE_UPDATE" : "CONTENT_RULE_CREATE",
      metadata: {
        scope: item.scope,
        ruleCode: item.ruleCode,
        diff: d.id
          ? {
              enabled: before?.enabled === item.enabled ? undefined : { old: before?.enabled, new: item.enabled },
              action: before?.action === item.action ? undefined : { old: before?.action, new: item.action },
              severity: before?.severity === item.severity ? undefined : { old: before?.severity, new: item.severity },
              pattern: before?.pattern === item.pattern ? undefined : { old: before?.pattern, new: item.pattern },
              patternType: before?.patternType === item.patternType ? undefined : { old: before?.patternType, new: item.patternType },
              sortOrder: before?.sortOrder === item.sortOrder ? undefined : { old: before?.sortOrder, new: item.sortOrder },
            }
          : null,
      },
    }).catch(() => null);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("POST /api/marketplace/admin/content-rules failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const body = (await request.json().catch(() => ({}))) as { id?: string };
    if (!body.id) return NextResponse.json({ error: "id is required." }, { status: 400 });
    const before = await prisma.contentRuleConfig.findUnique({ where: { id: body.id } });
    await prisma.contentRuleConfig.delete({ where: { id: body.id } });
    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "CASE",
      entityId: body.id,
      action: "CONTENT_RULE_DELETE",
      metadata: { scope: before?.scope ?? null, ruleCode: before?.ruleCode ?? null },
    }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("DELETE /api/marketplace/admin/content-rules failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
