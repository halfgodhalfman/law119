import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  action: z.enum(["mark_read", "mark_all_read", "archive"]),
  id: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "").trim();
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);

    const where = {
      userId: auth.authUserId,
      ...(status ? { status: status as never } : {}),
    };

    const [total, unreadCount, items] = await Promise.all([
      prisma.userNotification.count({ where }),
      prisma.userNotification.count({ where: { userId: auth.authUserId, status: "UNREAD" } }),
      prisma.userNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      summary: { unreadCount, totalAllStatuses: total },
      filters: { status, page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  } catch (error) {
    console.error("GET /api/marketplace/notifications failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const { action, id } = parsed.data;

    if (action === "mark_all_read") {
      await prisma.userNotification.updateMany({
        where: { userId: auth.authUserId, status: "UNREAD" },
        data: { status: "READ", readAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
    const notification = await prisma.userNotification.findUnique({ where: { id } });
    if (!notification || notification.userId !== auth.authUserId) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }

    const updated = await prisma.userNotification.update({
      where: { id },
      data:
        action === "archive"
          ? { status: "ARCHIVED" }
          : { status: "READ", readAt: notification.readAt ?? new Date() },
    });
    return NextResponse.json({ ok: true, item: updated });
  } catch (error) {
    console.error("PATCH /api/marketplace/notifications failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

