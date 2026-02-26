export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { logAdminAction } from "@/lib/admin-action-log";

type UserAction = "enable" | "disable" | "set_role";

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requireAdminAuth();
    const { userId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: UserAction;
      role?: "CLIENT" | "ATTORNEY" | "ADMIN";
    };
    const action = body.action;
    if (!action) return NextResponse.json({ error: "Missing action." }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, email: true } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    if (action === "set_role") {
      if (!body.role) return NextResponse.json({ error: "Missing role." }, { status: 400 });
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role: body.role },
        select: { id: true, role: true, email: true },
      });
      await logAdminAction({
        adminUserId: admin.authUserId,
        entityType: "USER",
        entityId: userId,
        action: "USER_ROLE_UPDATE",
        metadata: { diff: { role: { old: user.role, new: updated.role } }, email: updated.email },
      }).catch(() => null);
      return NextResponse.json({ ok: true, user: updated });
    }

    const supabase = getSupabaseAdminClient();
    const { data: getRes, error: getErr } = await supabase.auth.admin.getUserById(userId);
    if (getErr || !getRes.user) {
      return NextResponse.json({ error: getErr?.message || "Auth user not found." }, { status: 404 });
    }
    const currentMeta = (getRes.user.user_metadata as Record<string, unknown> | null) ?? {};
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...currentMeta,
        admin_disabled: action === "disable",
      },
    });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }
    const nextStatus = action === "disable" ? "DISABLED" : "ACTIVE";
    await logAdminAction({
      adminUserId: admin.authUserId,
      entityType: "USER",
      entityId: userId,
      action: action === "disable" ? "USER_DISABLE" : "USER_ENABLE",
      metadata: { email: user.email, diff: { admin_disabled: { old: currentMeta.admin_disabled ?? false, new: action === "disable" } } },
    }).catch(() => null);
    return NextResponse.json({ ok: true, user: { id: userId, role: user.role, status: nextStatus } });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("POST /api/marketplace/admin/users/[userId]/actions failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
