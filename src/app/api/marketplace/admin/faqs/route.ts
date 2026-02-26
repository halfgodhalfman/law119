export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { FaqAudience } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-action-log";

const createSchema = z.object({
  audience: z.nativeEnum(FaqAudience),
  category: z.string().trim().max(120).optional().nullable(),
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(10000),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

const updateSchema = createSchema.partial().extend({ id: z.string().trim().min(1) });

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const audience = (url.searchParams.get("audience") ?? "").trim() as FaqAudience | "";
    const active = (url.searchParams.get("active") ?? "").trim();
    const q = (url.searchParams.get("q") ?? "").trim();
    const items = await prisma.faqEntry.findMany({
      where: {
        ...(audience ? { audience } : {}),
        ...(active === "true" ? { active: true } : active === "false" ? { active: false } : {}),
        ...(q
          ? {
              OR: [
                { question: { contains: q, mode: "insensitive" } },
                { answer: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("GET /api/marketplace/admin/faqs failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const item = await prisma.faqEntry.create({
      data: {
        audience: d.audience,
        category: d.category ?? null,
        question: d.question,
        answer: d.answer,
        active: d.active ?? true,
        featured: d.featured ?? false,
        sortOrder: d.sortOrder ?? 0,
        createdByUserId: admin.authUserId,
        updatedByUserId: admin.authUserId,
      },
    });
    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "CASE",
      entityId: item.id,
      action: "FAQ_CREATE",
      metadata: { audience: item.audience, category: item.category },
    }).catch(() => null);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("POST /api/marketplace/admin/faqs failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const { id, ...rest } = parsed.data;
    const before = await prisma.faqEntry.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    const item = await prisma.faqEntry.update({ where: { id }, data: { ...rest, updatedByUserId: admin.authUserId } });
    const diff = Object.fromEntries(Object.keys(rest).map((k) => [k, { before: (before as any)[k], after: (item as any)[k] }]));
    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "CASE",
      entityId: item.id,
      action: "FAQ_UPDATE",
      metadata: { diff },
    }).catch(() => null);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") return NextResponse.json({ error: "Admin required." }, { status: 403 });
    console.error("PATCH /api/marketplace/admin/faqs failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
