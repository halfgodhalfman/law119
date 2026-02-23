import { NextResponse } from "next/server";
import { LegalNoticeStatus, LegalNoticeType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-action-log";

const createSchema = z.object({
  noticeType: z.nativeEnum(LegalNoticeType),
  title: z.string().trim().min(1).max(200),
  versionLabel: z.string().trim().min(1).max(60),
  bodyMarkdown: z.string().trim().min(1).max(100000),
  summary: z.string().trim().max(2000).optional().nullable(),
  status: z.nativeEnum(LegalNoticeStatus).optional(),
  effectiveAt: z.string().datetime().optional().nullable(),
  supersedesId: z.string().trim().min(1).optional().nullable(),
});

const updateSchema = createSchema.partial().extend({
  id: z.string().trim().min(1),
});

function toDateOrNull(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const noticeType = (url.searchParams.get("noticeType") ?? "").trim() as LegalNoticeType | "";
    const status = (url.searchParams.get("status") ?? "").trim() as LegalNoticeStatus | "";
    const q = (url.searchParams.get("q") ?? "").trim();
    const items = await prisma.legalNoticeVersion.findMany({
      where: {
        ...(noticeType ? { noticeType } : {}),
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { versionLabel: { contains: q, mode: "insensitive" } },
                { bodyMarkdown: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ noticeType: "asc" }, { createdAt: "desc" }],
      include: {
        supersedes: { select: { id: true, versionLabel: true, noticeType: true } },
      },
    });
    const currentPublished = Object.fromEntries(
      items.filter((i) => i.status === "PUBLISHED").map((i) => [i.noticeType, i.id])
    );
    return NextResponse.json({ ok: true, items, currentPublished });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("GET /api/marketplace/admin/legal-notices failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const effectiveAt = toDateOrNull(d.effectiveAt ?? null);
    const created = await prisma.$transaction(async (tx) => {
      if ((d.status ?? "DRAFT") === "PUBLISHED") {
        await tx.legalNoticeVersion.updateMany({
          where: { noticeType: d.noticeType, status: "PUBLISHED" },
          data: { status: "ARCHIVED" },
        });
      }
      return tx.legalNoticeVersion.create({
        data: {
          noticeType: d.noticeType,
          title: d.title,
          versionLabel: d.versionLabel,
          bodyMarkdown: d.bodyMarkdown,
          summary: d.summary ?? null,
          status: d.status ?? "DRAFT",
          effectiveAt,
          publishedAt: (d.status ?? "DRAFT") === "PUBLISHED" ? new Date() : null,
          supersedesId: d.supersedesId ?? null,
          createdByUserId: admin.authUserId,
          updatedByUserId: admin.authUserId,
        },
      });
    });
    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "CASE",
      entityId: created.id,
      action: "LEGAL_NOTICE_CREATE",
      metadata: { noticeType: created.noticeType, versionLabel: created.versionLabel, status: created.status },
    }).catch(() => null);
    return NextResponse.json({ ok: true, item: created });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("POST /api/marketplace/admin/legal-notices failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const { id, effectiveAt, ...rest } = parsed.data;
    const before = await prisma.legalNoticeVersion.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Notice version not found" }, { status: 404 });

    const nextEffectiveAt = effectiveAt !== undefined ? toDateOrNull(effectiveAt ?? null) : undefined;

    const item = await prisma.$transaction(async (tx) => {
      if (rest.status === "PUBLISHED") {
        await tx.legalNoticeVersion.updateMany({
          where: { noticeType: before.noticeType, status: "PUBLISHED", id: { not: before.id } },
          data: { status: "ARCHIVED" },
        });
      }
      return tx.legalNoticeVersion.update({
        where: { id },
        data: {
          ...rest,
          ...(nextEffectiveAt !== undefined ? { effectiveAt: nextEffectiveAt } : {}),
          ...(rest.status === "PUBLISHED" && before.status !== "PUBLISHED" ? { publishedAt: new Date() } : {}),
          updatedByUserId: admin.authUserId,
        },
      });
    });

    const changedKeys = [
      ...Object.keys(rest),
      ...(effectiveAt !== undefined ? ["effectiveAt"] : []),
    ];
    const diff = Object.fromEntries(
      changedKeys.map((k) => [k, { before: (before as any)[k], after: (item as any)[k] }])
    );

    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "CASE",
      entityId: item.id,
      action: "LEGAL_NOTICE_UPDATE",
      metadata: { noticeType: item.noticeType, versionLabel: item.versionLabel, diff },
    }).catch(() => null);

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("PATCH /api/marketplace/admin/legal-notices failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
