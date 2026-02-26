export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { getTemplateForBoundary } from "@/lib/service-stage-templates";
import { createUserNotification } from "@/lib/user-notifications";

export async function GET(_request: Request, { params }: { params: Promise<{ engagementId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { engagementId } = await params;

    const eng = await prisma.engagementConfirmation.findUnique({
      where: { id: engagementId },
      select: { clientProfileId: true, attorneyProfileId: true },
    });
    if (!eng) return NextResponse.json({ error: "Engagement not found." }, { status: 404 });

    const isClient = auth.role === "CLIENT" && auth.clientProfileId && eng.clientProfileId === auth.clientProfileId;
    const isAttorney = auth.role === "ATTORNEY" && auth.attorneyProfileId && eng.attorneyProfileId === auth.attorneyProfileId;
    const isAdmin = auth.role === "ADMIN";
    if (!isClient && !isAttorney && !isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const stages = await prisma.serviceStage.findMany({
      where: { engagementId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ ok: true, stages });
  } catch (error) {
    console.error("GET /api/marketplace/engagements/[engagementId]/stages failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ engagementId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { engagementId } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    const eng = await prisma.engagementConfirmation.findUnique({
      where: { id: engagementId },
      select: { clientProfileId: true, attorneyProfileId: true, serviceBoundary: true, client: { select: { userId: true } } },
    });
    if (!eng) return NextResponse.json({ error: "Engagement not found." }, { status: 404 });

    const isAttorney = auth.role === "ATTORNEY" && auth.attorneyProfileId && eng.attorneyProfileId === auth.attorneyProfileId;
    const isAdmin = auth.role === "ADMIN";

    if (action === "init_from_template") {
      if (!isAttorney && !isAdmin) return NextResponse.json({ error: "Only attorney or admin can initialize stages." }, { status: 403 });

      const template = getTemplateForBoundary(eng.serviceBoundary);

      // Delete existing stages first
      await prisma.serviceStage.deleteMany({ where: { engagementId } });

      // Create stages from template
      const stages = await prisma.$transaction(
        template.map((t, i) =>
          prisma.serviceStage.create({
            data: {
              engagementId,
              sortOrder: i,
              title: t.title,
              description: t.description,
              status: "NOT_STARTED",
              updatedByUserId: auth.authUserId,
            },
          })
        )
      );

      return NextResponse.json({ ok: true, stages });
    }

    if (action === "add_stage") {
      if (!isAttorney) return NextResponse.json({ error: "Only attorney can add stages." }, { status: 403 });

      const title = typeof body?.title === "string" ? body.title.trim() : "";
      const description = typeof body?.description === "string" ? body.description.trim() : "";
      if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

      // Get current max sortOrder
      const lastStage = await prisma.serviceStage.findFirst({
        where: { engagementId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      const nextOrder = (lastStage?.sortOrder ?? -1) + 1;

      const stage = await prisma.serviceStage.create({
        data: {
          engagementId,
          sortOrder: nextOrder,
          title,
          description: description || null,
          status: "NOT_STARTED",
          updatedByUserId: auth.authUserId,
        },
      });

      return NextResponse.json({ ok: true, stage });
    }

    return NextResponse.json({ error: "Invalid action. Use 'init_from_template' or 'add_stage'." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/marketplace/engagements/[engagementId]/stages failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ engagementId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { engagementId } = await params;
    const body = await request.json().catch(() => ({}));

    const eng = await prisma.engagementConfirmation.findUnique({
      where: { id: engagementId },
      select: { attorneyProfileId: true, clientProfileId: true, client: { select: { userId: true } } },
    });
    if (!eng) return NextResponse.json({ error: "Engagement not found." }, { status: 404 });

    const isAttorney = auth.role === "ATTORNEY" && auth.attorneyProfileId && eng.attorneyProfileId === auth.attorneyProfileId;
    if (!isAttorney) return NextResponse.json({ error: "Only attorney can update stages." }, { status: 403 });

    const stageId = body?.stageId as string | undefined;
    if (!stageId) return NextResponse.json({ error: "stageId is required." }, { status: 400 });

    const stage = await prisma.serviceStage.findFirst({
      where: { id: stageId, engagementId },
    });
    if (!stage) return NextResponse.json({ error: "Stage not found." }, { status: 404 });

    const updateData: Record<string, unknown> = { updatedByUserId: auth.authUserId };
    const newStatus = body?.status as string | undefined;
    const note = body?.note as string | undefined;

    if (typeof note === "string") {
      updateData.note = note.trim() || null;
    }

    if (newStatus && newStatus !== stage.status) {
      updateData.status = newStatus;
      if (newStatus === "IN_PROGRESS") {
        updateData.startedAt = new Date();
      }
      if (newStatus === "COMPLETED") {
        updateData.completedAt = new Date();
      }
    }

    const updated = await prisma.serviceStage.update({
      where: { id: stageId },
      data: updateData,
    });

    // Send notification to client on status change
    if (newStatus && newStatus !== stage.status && eng.client?.userId) {
      const statusLabels: Record<string, string> = {
        NOT_STARTED: "未开始",
        IN_PROGRESS: "进行中",
        COMPLETED: "已完成",
        SKIPPED: "已跳过",
      };
      await createUserNotification({
        userId: eng.client.userId,
        type: "ENGAGEMENT_UPDATE",
        title: `服务阶段更新: ${stage.title}`,
        body: `阶段状态已更新为「${statusLabels[newStatus] || newStatus}」`,
        linkUrl: `/marketplace/engagements/${engagementId}/progress`,
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true, stage: updated });
  } catch (error) {
    console.error("PATCH /api/marketplace/engagements/[engagementId]/stages failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
