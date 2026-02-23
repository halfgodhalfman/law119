import { NextResponse } from "next/server";
import { LegalCategory } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-action-log";

const createSchema = z.object({
  category: z.nativeEnum(LegalCategory),
  slug: z.string().trim().min(1).max(120),
  nameZh: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  group: z.string().trim().max(120).optional().nullable(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  hot: z.boolean().optional(),
  homepageFeatured: z.boolean().optional(),
  homepageFeaturedOrder: z.number().int().min(0).max(9999).optional(),
});

const updateSchema = createSchema.partial().extend({
  id: z.string().trim().min(1),
});

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const category = (url.searchParams.get("category") ?? "").trim() as LegalCategory | "";
    const enabled = (url.searchParams.get("enabled") ?? "").trim();
    const homepageOnly = (url.searchParams.get("homepageOnly") ?? "").trim() === "1";
    const hotOnly = (url.searchParams.get("hotOnly") ?? "").trim() === "1";
    const q = (url.searchParams.get("q") ?? "").trim();

    const items = await prisma.legalSubCategory.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(enabled === "true" ? { enabled: true } : enabled === "false" ? { enabled: false } : {}),
        ...(homepageOnly ? { homepageFeatured: true } : {}),
        ...(hotOnly ? { hot: true } : {}),
        ...(q
          ? {
              OR: [
                { slug: { contains: q, mode: "insensitive" } },
                { nameZh: { contains: q, mode: "insensitive" } },
                { nameEn: { contains: q, mode: "insensitive" } },
                { group: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [
        { category: "asc" },
        { homepageFeatured: "desc" },
        { homepageFeaturedOrder: "asc" },
        { hot: "desc" },
        { sortOrder: "asc" },
        { nameZh: "asc" },
      ],
    });

    const summary = {
      total: items.length,
      enabled: items.filter((i) => i.enabled).length,
      homepageFeatured: items.filter((i) => i.homepageFeatured).length,
      hot: items.filter((i) => i.hot).length,
    };

    return NextResponse.json({ ok: true, items, summary });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/legal-categories failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const item = await prisma.legalSubCategory.create({
      data: {
        category: d.category,
        slug: d.slug,
        nameZh: d.nameZh,
        nameEn: d.nameEn,
        group: d.group ?? null,
        enabled: d.enabled ?? true,
        sortOrder: d.sortOrder ?? 0,
        hot: d.hot ?? false,
        homepageFeatured: d.homepageFeatured ?? false,
        homepageFeaturedOrder: d.homepageFeaturedOrder ?? 0,
      },
    });
    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "CASE",
      entityId: item.id,
      action: "LEGAL_SUBCATEGORY_CREATE",
      metadata: { slug: item.slug, category: item.category },
    }).catch(() => null);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("POST /api/marketplace/admin/legal-categories failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const { id, ...rest } = parsed.data;
    const before = await prisma.legalSubCategory.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
    const item = await prisma.legalSubCategory.update({ where: { id }, data: { ...rest } });

    const diff = Object.fromEntries(
      Object.entries(rest).map(([k]) => [k, { before: (before as any)[k], after: (item as any)[k] }])
    );

    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "CASE",
      entityId: item.id,
      action: "LEGAL_SUBCATEGORY_UPDATE",
      metadata: { slug: item.slug, diff },
    }).catch(() => null);

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("PATCH /api/marketplace/admin/legal-categories failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
