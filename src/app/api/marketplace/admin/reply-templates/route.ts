import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-action-log";

const createSchema = z.object({
  scene: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(4000),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const updateSchema = createSchema.partial().extend({
  id: z.string().trim().min(1),
});

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const scene = (url.searchParams.get("scene") ?? "").trim();
    const active = (url.searchParams.get("active") ?? "").trim();
    const items = await prisma.replyTemplate.findMany({
      where: {
        ...(scene ? { scene } : {}),
        ...(active === "true" ? { active: true } : active === "false" ? { active: false } : {}),
      },
      orderBy: [{ scene: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        scene: true,
        title: true,
        body: true,
        active: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { email: true } },
        updatedBy: { select: { email: true } },
      },
    });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/reply-templates failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const item = await prisma.replyTemplate.create({
      data: {
        scene: d.scene,
        title: d.title,
        body: d.body,
        active: d.active ?? true,
        sortOrder: d.sortOrder ?? 0,
        createdByAdminUserId: admin.authUserId,
        updatedByAdminUserId: admin.authUserId,
      },
    });
    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "SUPPORT_TICKET",
      entityId: item.id,
      action: "REPLY_TEMPLATE_CREATE",
      metadata: { scene: item.scene, title: item.title },
    }).catch(() => null);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("POST /api/marketplace/admin/reply-templates failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminAuth();
    const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const { id, ...rest } = parsed.data;
    const before = await prisma.replyTemplate.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    const item = await prisma.replyTemplate.update({
      where: { id },
      data: {
        ...rest,
        updatedByAdminUserId: admin.authUserId,
      },
    });
    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "SUPPORT_TICKET",
      entityId: item.id,
      action: "REPLY_TEMPLATE_UPDATE",
      metadata: JSON.parse(JSON.stringify({
        diff: {
          scene: before.scene === item.scene ? undefined : { old: before.scene, new: item.scene },
          title: before.title === item.title ? undefined : { old: before.title, new: item.title },
          body: before.body === item.body ? undefined : { old: before.body, new: item.body },
          active: before.active === item.active ? undefined : { old: before.active, new: item.active },
          sortOrder: before.sortOrder === item.sortOrder ? undefined : { old: before.sortOrder, new: item.sortOrder },
        },
      })),
    }).catch(() => null);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("PATCH /api/marketplace/admin/reply-templates failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

