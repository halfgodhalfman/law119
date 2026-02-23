import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const role = (url.searchParams.get("role") ?? "").trim();
    const statusFilter = (url.searchParams.get("status") ?? "").trim(); // active/disabled
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);

    const where = {
      ...(role ? { role: role as "CLIENT" | "ATTORNEY" | "ADMIN" } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" as const } },
              { id: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          clientProfile: { select: { id: true, firstName: true, lastName: true, phone: true } },
          attorneyProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              isVerified: true,
              barNumberVerified: true,
              barState: true,
              _count: { select: { bids: true, conversations: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const supabase = getSupabaseAdminClient();
    const { data: authPage } = await supabase.auth.admin.listUsers({ page, perPage: pageSize }).catch(() => ({ data: null }));
    const authMap = new Map(
      (authPage?.users ?? []).map((u) => [
        u.id,
        {
          lastSignInAt: u.last_sign_in_at ?? null,
          disabled: Boolean((u.user_metadata as Record<string, unknown> | null)?.admin_disabled),
        },
      ]),
    );

    const items = users
      .map((u) => {
        const auth = authMap.get(u.id);
        const status = auth?.disabled ? "DISABLED" : "ACTIVE";
        return {
          id: u.id,
          email: u.email,
          role: u.role,
          status,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          lastSignInAt: auth?.lastSignInAt ?? null,
          profileName:
            u.attorneyProfile
              ? [u.attorneyProfile.firstName, u.attorneyProfile.lastName].filter(Boolean).join(" ")
              : u.clientProfile
                ? [u.clientProfile.firstName, u.clientProfile.lastName].filter(Boolean).join(" ")
                : "",
          clientProfile: u.clientProfile,
          attorneyProfile: u.attorneyProfile,
        };
      })
      .filter((item) => (statusFilter ? item.status === statusFilter.toUpperCase() : true));

    return NextResponse.json({
      ok: true,
      items,
      filters: {
        q,
        role,
        status: statusFilter,
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/users failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

