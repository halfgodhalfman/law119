// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { createUserNotification } from "@/lib/user-notifications";

// GET deliverables for a milestone
export async function GET(req: Request, { params }: { params: Promise<{ paymentOrderId: string; milestoneId: string }> }) {
  const { paymentOrderId, milestoneId } = await params;
  let auth;
  try { auth = await requireAuthContext(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const milestone = await prisma.paymentMilestone.findUnique({
    where: { id: milestoneId },
    include: { paymentOrder: { select: { payerUserId: true, payeeUserId: true } }, deliverables: { orderBy: { createdAt: "asc" } } },
  });
  if (!milestone || milestone.paymentOrderId !== paymentOrderId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canView = auth.role === "ADMIN" || milestone.paymentOrder.payerUserId === auth.authUserId || milestone.paymentOrder.payeeUserId === auth.authUserId;
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ ok: true, deliverables: milestone.deliverables });
}

// POST - attorney uploads deliverable metadata (file already uploaded to storage)
export async function POST(req: Request, { params }: { params: Promise<{ paymentOrderId: string; milestoneId: string }> }) {
  const { paymentOrderId, milestoneId } = await params;
  let auth;
  try { auth = await requireAuthContext(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const milestone = await prisma.paymentMilestone.findUnique({
    where: { id: milestoneId },
    include: { paymentOrder: { select: { payerUserId: true, payeeUserId: true } } },
  });
  if (!milestone || milestone.paymentOrderId !== paymentOrderId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (milestone.paymentOrder.payeeUserId !== auth.authUserId && auth.role !== "ADMIN") return NextResponse.json({ error: "Only attorney can upload deliverables" }, { status: 403 });

  const body = await req.json();
  const { fileName, storagePath, url, mimeType, sizeBytes } = body;
  if (!storagePath || !url) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const deliverable = await prisma.milestoneDeliverable.create({
    data: { milestoneId, uploaderUserId: auth.authUserId, fileName, storagePath, url, mimeType, sizeBytes },
  });

  // Notify client
  if (milestone.paymentOrder.payerUserId) {
    await createUserNotification({
      userId: milestone.paymentOrder.payerUserId,
      type: "PAYMENT_UPDATE",
      title: "律师已上传交付物",
      body: `里程碑"${milestone.title}"有新的交付物，请查看确认`,
      linkUrl: `/marketplace/payments/${paymentOrderId}`,
    });
  }

  return NextResponse.json({ ok: true, deliverable });
}
