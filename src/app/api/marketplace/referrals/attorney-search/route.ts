export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/referrals/attorney-search?q=name&category=IMMIGRATION&stateCode=CA
 * 律师搜索（用于创建转介绍时选择接收方），排除自身
 */

import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { LegalCategory } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
    if (auth.role !== "ATTORNEY") return NextResponse.json({ ok: false, error: "仅限律师" }, { status: 403 });

    const me = await prisma.attorneyProfile.findUnique({
      where: { userId: auth.authUserId },
      select: { id: true },
    });

    const { searchParams } = new URL(request.url);
    const q         = searchParams.get("q")?.trim() ?? "";
    const category  = searchParams.get("category") as LegalCategory | null;
    const stateCode = searchParams.get("stateCode");

    if (q.length < 1) return NextResponse.json({ ok: true, attorneys: [] });

    const attorneys = await prisma.attorneyProfile.findMany({
      where: {
        id: { not: me?.id ?? "" },  // 排除自己
        isVerified: true,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { firmName: { contains: q, mode: "insensitive" } },
        ],
        ...(category ? {
          specialties: { some: { category } },
        } : {}),
        ...(stateCode ? {
          serviceAreas: { some: { stateCode } },
        } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        firmName: true,
        avatarUrl: true,
        barNumberVerified: true,
        isVerified: true,
        yearsExperience: true,
        specialties: { select: { category: true } },
        serviceAreas: { select: { stateCode: true }, take: 5 },
        languages: { select: { language: true } },
      },
      take: 10,
      orderBy: [
        { barNumberVerified: "desc" },
        { lastName: "asc" },
      ],
    });

    return NextResponse.json({ ok: true, attorneys });
  } catch (err) {
    console.error("GET /api/marketplace/referrals/attorney-search failed", err);
    return NextResponse.json({ ok: false, error: "搜索失败" }, { status: 500 });
  }
}
