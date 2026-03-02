export const dynamic = "force-dynamic";

/**
 * GET  /api/marketplace/service-packages  — 公开查询服务包列表
 * POST /api/marketplace/service-packages  — 律师创建服务包（需 ATTORNEY 角色）
 */

import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { LegalCategory, ServicePackageType } from "@prisma/client";
import { z } from "zod";

// ─── GET （公开 + 律师自查）──────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category   = searchParams.get("category") as LegalCategory | null;
  const stateCode  = searchParams.get("stateCode");
  const type       = searchParams.get("type") as ServicePackageType | null;
  const maxPrice   = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null;
  const myOwn      = searchParams.get("myOwn") === "1";   // 律师查看自己的服务包
  const page       = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize   = Math.min(40, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

  try {
    // 律师查看自己的服务包时，需要验证身份并获取 attorneyProfileId
    let myAttorneyId: string | null = null;
    if (myOwn) {
      const auth = await requireAuthContext().catch(() => null);
      if (auth?.role === "ATTORNEY") {
        const atty = await prisma.attorneyProfile.findUnique({
          where: { userId: auth.authUserId },
          select: { id: true },
        });
        myAttorneyId = atty?.id ?? null;
      }
    }

    const where = {
      // 公开查询只显示已激活的；律师查看自己的则不过滤 isActive（可看到已下架的）
      ...(myAttorneyId ? { attorneyProfileId: myAttorneyId } : { isActive: true }),
      ...(category ? { category } : {}),
      ...(stateCode ? { OR: [{ stateCode }, { stateCode: null }] } : {}),
      ...(type ? { packageType: type } : {}),
      ...(maxPrice != null && !myAttorneyId ? {
        OR: [
          { price: { lte: maxPrice } },
          { price: null },                // 免费 / 待协商
        ],
      } : {}),
    };

    const [total, packages] = await Promise.all([
      prisma.servicePackage.count({ where }),
      prisma.servicePackage.findMany({
        where,
        // 律师查看自己的服务包时不 include attorney（节省查询）
        ...(myAttorneyId ? {} : {
          include: {
            attorney: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                firmName: true,
                avatarUrl: true,
                barNumberVerified: true,
                isVerified: true,
                yearsExperience: true,
                proBonoAvailable: true,
                slidingScaleAvailable: true,
                legalAidPartner: true,
                specialties: { select: { category: true } },
                serviceAreas: { select: { stateCode: true }, take: 10 },
                languages: { select: { language: true } },
                badges: { where: { active: true }, select: { badgeType: true } },
                clientReviews: {
                  where: { status: "PUBLISHED" },
                  select: { ratingOverall: true },
                  take: 200,
                },
              },
            },
          },
        }),
        orderBy: [
          { packageType: "asc" },   // PRO_BONO 排前
          { sortOrder: "asc" },
          { totalBooked: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // 律师查看自己服务包时直接返回（不需要 attorney 信息）
    if (myAttorneyId) {
      return NextResponse.json({ ok: true, packages, total, page, pageSize });
    }

    // 公开查询：计算律师平均评分
    const publicPkgs = packages as (typeof packages[0] & {
      attorney: { clientReviews: { ratingOverall: number }[] };
    })[];
    const result = publicPkgs.map((pkg) => {
      const reviews = pkg.attorney.clientReviews;
      const avgRating = reviews.length
        ? Math.round((reviews.reduce((s, r) => s + r.ratingOverall, 0) / reviews.length) * 10) / 10
        : null;
      return {
        ...pkg,
        attorney: {
          ...pkg.attorney,
          avgRating,
          reviewCount: reviews.length,
          clientReviews: undefined,
        },
      };
    });

    return NextResponse.json({ ok: true, packages: result, total, page, pageSize });
  } catch (err) {
    console.error("GET /api/marketplace/service-packages failed", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST （律师创建）────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  title:              z.string().min(2).max(120),
  titleEn:            z.string().max(120).optional(),
  category:           z.nativeEnum(LegalCategory),
  stateCode:          z.string().length(2).toUpperCase().optional().nullable(),
  description:        z.string().min(10).max(2000),
  deliverables:       z.string().min(5).max(2000),
  packageType:        z.nativeEnum(ServicePackageType).default("FIXED_PRICE"),
  price:              z.number().min(0).optional().nullable(),
  priceLabel:         z.string().max(60).optional().nullable(),
  incomeCapAnnual:    z.number().min(0).optional().nullable(),
  eligibilityCriteria: z.string().max(500).optional().nullable(),
  estimatedDays:      z.number().int().min(1).max(365).optional().nullable(),
  maxCasesPerMonth:   z.number().int().min(1).max(100).optional().nullable(),
  sessionCount:       z.number().int().min(1).max(20).optional().nullable(),
  sessionMinutes:     z.number().int().min(15).max(240).optional().nullable(),
  sortOrder:          z.number().int().default(0),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
    if (auth.role !== "ATTORNEY") return NextResponse.json({ ok: false, error: "仅律师可创建服务包" }, { status: 403 });

    const attorney = await prisma.attorneyProfile.findUnique({
      where: { userId: auth.authUserId },
      select: { id: true },
    });
    if (!attorney) return NextResponse.json({ ok: false, error: "律师档案未找到" }, { status: 404 });

    // 限制每位律师最多 20 个服务包
    const existing = await prisma.servicePackage.count({ where: { attorneyProfileId: attorney.id } });
    if (existing >= 20) {
      return NextResponse.json({ ok: false, error: "服务包数量已达上限（20个）" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "参数有误", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    // PRO_BONO 和 FREE_CONSULT 强制 price = null
    const priceValue = (data.packageType === "PRO_BONO" || data.packageType === "FREE_CONSULT")
      ? null
      : data.price ?? null;
    const priceLabel = data.priceLabel ??
      (data.packageType === "PRO_BONO" ? "免费" :
       data.packageType === "FREE_CONSULT" ? "免费咨询" :
       data.packageType === "SLIDING_SCALE" ? "按收入定价" :
       priceValue != null ? `$${priceValue}` : null);

    const pkg = await prisma.servicePackage.create({
      data: {
        attorneyProfileId: attorney.id,
        title:             data.title,
        titleEn:           data.titleEn ?? null,
        category:          data.category,
        stateCode:         data.stateCode ?? null,
        description:       data.description,
        deliverables:      data.deliverables,
        packageType:       data.packageType,
        price:             priceValue,
        priceLabel,
        incomeCapAnnual:   data.incomeCapAnnual ?? null,
        eligibilityCriteria: data.eligibilityCriteria ?? null,
        estimatedDays:     data.estimatedDays ?? null,
        maxCasesPerMonth:  data.maxCasesPerMonth ?? null,
        sessionCount:      data.sessionCount ?? null,
        sessionMinutes:    data.sessionMinutes ?? null,
        sortOrder:         data.sortOrder,
      },
    });

    // 如果律师发布了免费或滑动收费服务，自动更新 profile 标志
    if (data.packageType === "PRO_BONO" && !auth) {
      // 由后面逻辑处理
    }
    if (["PRO_BONO", "FREE_CONSULT"].includes(data.packageType)) {
      await prisma.attorneyProfile.update({
        where: { id: attorney.id },
        data: { proBonoAvailable: true },
      });
    }
    if (data.packageType === "SLIDING_SCALE") {
      await prisma.attorneyProfile.update({
        where: { id: attorney.id },
        data: { slidingScaleAvailable: true },
      });
    }

    return NextResponse.json({ ok: true, package: pkg }, { status: 201 });
  } catch (err) {
    console.error("POST /api/marketplace/service-packages failed", err);
    return NextResponse.json({ ok: false, error: "创建失败，请稍后重试" }, { status: 500 });
  }
}
