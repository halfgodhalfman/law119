import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-action-log";

export async function POST(request: Request, { params }: { params: Promise<{ blacklistId: string }> }) {
  try {
    const auth = await requireAdminAuth();
    const { blacklistId } = await params;
    const body = (await request.json().catch(() => ({}))) as { action?: "deactivate" | "activate"; reason?: string };
    if (!body.action) return NextResponse.json({ error: "Missing action." }, { status: 400 });

    const existing = await prisma.userBlacklist.findUnique({
      where: { id: blacklistId },
      select: { id: true, active: true, blockerUserId: true, blockedUserId: true, conversationId: true, scope: true, expiresAt: true },
    });
    if (!existing) return NextResponse.json({ error: "Blacklist not found." }, { status: 404 });

    const updated = await prisma.userBlacklist.update({
      where: { id: blacklistId },
      data:
        body.action === "deactivate"
          ? { active: false, deactivatedAt: new Date(), deactivatedByUserId: auth.authUserId, reason: body.reason ?? undefined }
          : { active: true, deactivatedAt: null, deactivatedByUserId: null, expiresAt: null, reason: body.reason ?? undefined },
      select: { id: true, active: true, updatedAt: true, deactivatedAt: true, deactivatedByUserId: true, expiresAt: true },
    });
    await logAdminAction({
      adminUserId: auth.authUserId,
      entityType: "BLACKLIST",
      entityId: blacklistId,
      action: body.action,
      reason: body.reason ?? null,
      metadata: {
        previousActive: existing.active,
        nextActive: updated.active,
        blockerUserId: existing.blockerUserId,
        blockedUserId: existing.blockedUserId,
        conversationId: existing.conversationId,
        scope: existing.scope,
        previousExpiresAt: existing.expiresAt?.toISOString() ?? null,
        nextExpiresAt: updated.expiresAt?.toISOString() ?? null,
      },
    }).catch(() => null);
    return NextResponse.json({ ok: true, blacklist: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("POST /api/marketplace/admin/blacklists/[blacklistId]/actions failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
