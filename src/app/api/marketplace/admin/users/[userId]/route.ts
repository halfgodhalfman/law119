export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await requireAdminAuth();
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        clientProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            zipCode: true,
            preferredLanguage: true,
            _count: { select: { cases: true, conversations: true } },
          },
        },
        attorneyProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            firmName: true,
            barLicenseNumber: true,
            barNumberVerified: true,
            barVerifiedAt: true,
            barState: true,
            lawSchool: true,
            yearsExperience: true,
            bio: true,
            isVerified: true,
            serviceAreas: { select: { stateCode: true, zipCode: true } },
            specialties: { select: { category: true } },
            languages: { select: { language: true } },
            _count: { select: { bids: true, conversations: true } },
          },
        },
      },
    });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const supabase = getSupabaseAdminClient();
    const { data: authRes } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: null }));
    const authUser = authRes?.user ?? null;
    const userMeta = (authUser?.user_metadata as Record<string, unknown> | null) ?? null;

    return NextResponse.json({
      ok: true,
      user: {
        ...user,
        auth: authUser
          ? {
              lastSignInAt: authUser.last_sign_in_at ?? null,
              createdAt: authUser.created_at ?? null,
              emailConfirmedAt: authUser.email_confirmed_at ?? null,
              disabled: Boolean(userMeta?.admin_disabled),
              userMeta,
            }
          : null,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("GET /api/marketplace/admin/users/[userId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

