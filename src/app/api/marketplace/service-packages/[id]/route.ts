export const dynamic = "force-dynamic";

/**
 * GET    /api/marketplace/service-packages/[id]  — 获取单个服务包
 * PATCH  /api/marketplace/service-packages/[id]  — 更新服务包（律师本人）
 * DELETE /api/marketplace/service-packages/[id]  — 删除服务包（律师本人）
 */

import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { ServicePackageType, LegalCategory } from "@prisma/client";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET ────────────────────────────────────────────────────────────────────────

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const pkg = await prisma.servicePackage.findUnique({
      where: { id },
      include: {
        attorney: {
          select: {
            id: true, firstName: true, lastName: true, firmName: true,
            avatarUrl: true, barNumberVerified: true, isVerified: true,
            yearsExperience: true, bio: true,
            specialties: { select: { category: true } },
            serviceAreas: { select: { stateCode: true } },
            languages: { select: { language: true } },
            badges: { where: { active: true }, select: { badgeType: true } },
          },
        },
      },
    });
    if (!pkg) return NextResponse.json({ ok: false, error: "服务包未找到" }, { status: 404 });
    if (!pkg.isActive) return NextResponse.json({ ok: false, error: "服务包已下架" }, { status: 410 });
    return NextResponse.json({ ok: true, package: pkg });
  } catch (err) {
    console.error("GET /api/marketplace/service-packages/[id] failed", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────────

const UpdateSchema = z.object({
  title:              z.string().min(2).max(120).optional(),
  titleEn:            z.string().max(120).nullish(),
  category:           z.nativeEnum(LegalCategory).optional(),
  stateCode:          z.string().length(2).toUpperCase().nullish(),
  description:        z.string().min(10).max(2000).optional(),
  deliverables:       z.string().min(5).max(2000).optional(),
  packageType:        z.nativeEnum(ServicePackageType).optional(),
  price:              z.number().min(0).nullish(),
  priceLabel:         z.string().max(60).nullish(),
  incomeCapAnnual:    z.number().min(0).nullish(),
  eligibilityCriteria: z.string().max(500).nullish(),
  estimatedDays:      z.number().int().min(1).max(365).nullish(),
  maxCasesPerMonth:   z.number().int().min(1).max(100).nullish(),
  sessionCount:       z.number().int().min(1).max(20).nullish(),
  sessionMinutes:     z.number().int().min(15).max(240).nullish(),
  isActive:           z.boolean().optional(),
  sortOrder:          z.number().int().optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const pkg = await prisma.servicePackage.findUnique({
      where: { id },
      include: { attorney: { select: { id: true, userId: true } } },
    });
    if (!pkg) return NextResponse.json({ ok: false, error: "服务包未找到" }, { status: 404 });
    if (pkg.attorney.userId !== auth.authUserId && auth.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "无权限" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "参数有误", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const newType = data.packageType ?? pkg.packageType;
    const priceValue = (newType === "PRO_BONO" || newType === "FREE_CONSULT")
      ? null
      : data.price !== undefined ? data.price : pkg.price;

    const updated = await prisma.servicePackage.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.titleEn !== undefined && { titleEn: data.titleEn }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.stateCode !== undefined && { stateCode: data.stateCode }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.deliverables !== undefined && { deliverables: data.deliverables }),
        ...(data.packageType !== undefined && { packageType: data.packageType }),
        price: priceValue,
        ...(data.priceLabel !== undefined && { priceLabel: data.priceLabel }),
        ...(data.incomeCapAnnual !== undefined && { incomeCapAnnual: data.incomeCapAnnual }),
        ...(data.eligibilityCriteria !== undefined && { eligibilityCriteria: data.eligibilityCriteria }),
        ...(data.estimatedDays !== undefined && { estimatedDays: data.estimatedDays }),
        ...(data.maxCasesPerMonth !== undefined && { maxCasesPerMonth: data.maxCasesPerMonth }),
        ...(data.sessionCount !== undefined && { sessionCount: data.sessionCount }),
        ...(data.sessionMinutes !== undefined && { sessionMinutes: data.sessionMinutes }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
    return NextResponse.json({ ok: true, package: updated });
  } catch (err) {
    console.error("PATCH /api/marketplace/service-packages/[id] failed", err);
    return NextResponse.json({ ok: false, error: "更新失败" }, { status: 500 });
  }
}

// ─── DELETE ─────────────────────────────────────────────────────────────────────

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

    const { id } = await params;
    const pkg = await prisma.servicePackage.findUnique({
      where: { id },
      include: { attorney: { select: { id: true, userId: true } } },
    });
    if (!pkg) return NextResponse.json({ ok: false, error: "服务包未找到" }, { status: 404 });
    if (pkg.attorney.userId !== auth.authUserId && auth.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "无权限" }, { status: 403 });
    }

    await prisma.servicePackage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/marketplace/service-packages/[id] failed", err);
    return NextResponse.json({ ok: false, error: "删除失败" }, { status: 500 });
  }
}
