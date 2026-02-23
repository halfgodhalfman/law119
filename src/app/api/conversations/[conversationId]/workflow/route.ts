import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

const postSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("tag"),
    tag: z.enum(["HIGH_INTENT", "HIGH_RISK", "MISSING_MATERIALS", "NEEDS_FOLLOWUP", "DISPUTE_RISK"]),
    enabled: z.boolean().default(true),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    type: z.literal("reminder"),
    title: z.string().trim().min(2).max(200),
    note: z.string().trim().max(1000).optional(),
    dueAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal("checklist"),
    title: z.string().trim().min(2).max(200),
    note: z.string().trim().max(1000).optional(),
    required: z.boolean().default(true),
  }),
  z.object({
    type: z.literal("checklist_template"),
    category: z.string().trim().min(1).optional(),
    replaceExisting: z.boolean().default(false),
  }),
]);

const patchSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("reminder"),
    id: z.string(),
    status: z.enum(["OPEN", "DONE", "DISMISSED"]).optional(),
    dueAt: z.string().datetime().optional(),
    note: z.string().trim().max(1000).optional().nullable(),
  }),
  z.object({
    type: z.literal("checklist"),
    id: z.string(),
    completed: z.boolean().optional(),
    note: z.string().trim().max(1000).optional().nullable(),
  }),
]);

async function getConversationWithAuth(conversationId: string, authUserId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      caseId: true,
      clientProfileId: true,
      attorneyProfileId: true,
      case: { select: { category: true, subCategorySlug: true, stateCode: true } },
      client: { select: { userId: true } },
      attorney: { select: { userId: true } },
      tags: { orderBy: { updatedAt: "desc" } },
      followUpReminders: { orderBy: [{ status: "asc" }, { dueAt: "asc" }] },
      checklistItems: { orderBy: [{ completed: "asc" }, { updatedAt: "desc" }] },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, senderRole: true, createdAt: true, body: true },
      },
    },
  });
}

const CHECKLIST_TEMPLATES: Record<string, Array<{ title: string; required: boolean }>> = {
  IMMIGRATION: [
    { title: "护照首页扫描件 / Passport bio page", required: true },
    { title: "签证页或入境记录（I-94）", required: true },
    { title: "当前身份文件（I-20 / DS-2019 / EAD 等）", required: true },
    { title: "时间线说明（入境、签证、重要节点）", required: true },
    { title: "相关通知信件（RFE / NOID / NTA）", required: false },
  ],
  FAMILY: [
    { title: "结婚证/离婚判决/分居协议", required: true },
    { title: "子女出生证明（如涉及监护）", required: false },
    { title: "双方基本信息与联系方式", required: true },
    { title: "争议焦点时间线（家暴/财产/监护）", required: true },
    { title: "财产与负债清单", required: false },
  ],
  BUSINESS: [
    { title: "公司注册文件（Articles / Operating Agreement）", required: true },
    { title: "股东/成员结构说明", required: true },
    { title: "合同文本及补充协议", required: true },
    { title: "争议/交易时间线", required: true },
    { title: "关键往来邮件或聊天记录", required: false },
  ],
  LABOR: [
    { title: "劳动合同 / Offer Letter", required: true },
    { title: "工资单 / 工时记录", required: true },
    { title: "解雇/处分通知", required: false },
    { title: "与雇主沟通记录", required: true },
    { title: "事件时间线（入职、争议、离职）", required: true },
  ],
  CRIMINAL: [
    { title: "法院文件/出庭通知", required: true },
    { title: "警方文件（如有）", required: false },
    { title: "事件经过时间线", required: true },
    { title: "证人信息（如适用）", required: false },
    { title: "保释/限制令相关文件", required: false },
  ],
  DEFAULT: [
    { title: "案件基本事实时间线", required: true },
    { title: "关键文件/合同/通知", required: true },
    { title: "相关沟通记录（邮件/短信/聊天）", required: false },
    { title: "诉求与目标（希望律师帮助事项）", required: true },
  ],
};

function getChecklistTemplate(category?: string | null) {
  if (!category) return CHECKLIST_TEMPLATES.DEFAULT;
  return CHECKLIST_TEMPLATES[category] ?? CHECKLIST_TEMPLATES.DEFAULT;
}

function canView(auth: Awaited<ReturnType<typeof requireAuthContext>>, conv: Awaited<ReturnType<typeof getConversationWithAuth>>) {
  if (!conv) return false;
  if (auth.role === "ADMIN") return true;
  if (auth.role === "ATTORNEY" && auth.attorneyProfileId && conv.attorneyProfileId === auth.attorneyProfileId) return true;
  if (auth.role === "CLIENT" && auth.clientProfileId && conv.clientProfileId === auth.clientProfileId) return true;
  return false;
}

function canEditAsAttorney(auth: Awaited<ReturnType<typeof requireAuthContext>>, conv: NonNullable<Awaited<ReturnType<typeof getConversationWithAuth>>>) {
  return auth.role === "ADMIN" || (auth.role === "ATTORNEY" && auth.attorneyProfileId === conv.attorneyProfileId);
}

export async function GET(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { conversationId } = await params;
    const conv = await getConversationWithAuth(conversationId, auth.authUserId);
    if (!conv) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    if (!canView(auth, conv)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const stale24hCount = conv.followUpReminders.filter((r) => r.status === "OPEN" && r.dueAt.getTime() < Date.now()).length;
    const pendingChecklistRequired = conv.checklistItems.filter((c) => c.required && !c.completed).length;
    const suggestions: string[] = [];
    if (pendingChecklistRequired > 0) suggestions.push(`待补件清单未完成 ${pendingChecklistRequired} 项`);
    if (stale24hCount > 0) suggestions.push(`有 ${stale24hCount} 条跟进提醒已逾期`);
    if (conv.messages.some((m) => /passport|身份证|护照|birth certificate|address/i.test(m.body))) suggestions.push("会话中可能提及敏感证据，建议提醒附件脱敏");

    return NextResponse.json({
      ok: true,
      workflow: {
        conversationId: conv.id,
        caseId: conv.caseId,
        caseCategory: conv.case?.category ?? null,
        caseSubCategorySlug: conv.case?.subCategorySlug ?? null,
        caseStateCode: conv.case?.stateCode ?? null,
        tags: conv.tags,
        reminders: conv.followUpReminders,
        checklist: conv.checklistItems,
        summary: {
          overdueReminders: stale24hCount,
          pendingChecklistRequired,
        },
        suggestions,
      },
      viewer: {
        role: auth.role,
        canEditAttorneyTools: canEditAsAttorney(auth, conv),
      },
    });
  } catch (error) {
    console.error("GET /api/conversations/[conversationId]/workflow failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { conversationId } = await params;
    const conv = await getConversationWithAuth(conversationId, auth.authUserId);
    if (!conv) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    if (!canEditAsAttorney(auth, conv)) return NextResponse.json({ error: "Attorney workflow tools are attorney/admin only." }, { status: 403 });
    const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

    if (parsed.data.type === "tag") {
      if (parsed.data.enabled) {
        const tag = await prisma.conversationTag.upsert({
          where: {
            conversationId_attorneyProfileId_tag: {
              conversationId,
              attorneyProfileId: conv.attorneyProfileId,
              tag: parsed.data.tag,
            },
          },
          update: { note: parsed.data.note ?? null },
          create: {
            conversationId,
            attorneyProfileId: conv.attorneyProfileId,
            tag: parsed.data.tag,
            note: parsed.data.note ?? null,
          },
        });
        return NextResponse.json({ ok: true, item: tag });
      }
      await prisma.conversationTag.deleteMany({
        where: { conversationId, attorneyProfileId: conv.attorneyProfileId, tag: parsed.data.tag },
      });
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.type === "reminder") {
      const item = await prisma.attorneyFollowUpReminder.create({
        data: {
          conversationId,
          attorneyProfileId: conv.attorneyProfileId,
          createdByUserId: auth.authUserId,
          dueAt: new Date(parsed.data.dueAt),
          title: parsed.data.title,
          note: parsed.data.note ?? null,
        },
      });
      return NextResponse.json({ ok: true, item });
    }

    if (parsed.data.type === "checklist_template") {
      const category = parsed.data.category ?? conv.case?.category ?? undefined;
      const replaceExisting = parsed.data.replaceExisting;
      const template = getChecklistTemplate(category);
      const existingTitles = new Set(conv.checklistItems.map((c) => c.title.trim().toLowerCase()));

      await prisma.$transaction(async (tx) => {
        if (replaceExisting) {
          await tx.conversationChecklistItem.deleteMany({
            where: { conversationId, attorneyProfileId: conv.attorneyProfileId },
          });
        }
        const itemsToCreate = template.filter((item) =>
          replaceExisting ? true : !existingTitles.has(item.title.trim().toLowerCase()),
        );
        if (itemsToCreate.length) {
          await tx.conversationChecklistItem.createMany({
            data: itemsToCreate.map((item) => ({
              conversationId,
              attorneyProfileId: conv.attorneyProfileId,
              title: item.title,
              required: item.required,
            })),
          });
        }
      });

      return NextResponse.json({
        ok: true,
        generated: true,
        categoryUsed: category ?? "DEFAULT",
      });
    }

    const item = await prisma.conversationChecklistItem.create({
      data: {
        conversationId,
        attorneyProfileId: conv.attorneyProfileId,
        title: parsed.data.title,
        note: parsed.data.note ?? null,
        required: parsed.data.required,
      },
    });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("POST /api/conversations/[conversationId]/workflow failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { conversationId } = await params;
    const conv = await getConversationWithAuth(conversationId, auth.authUserId);
    if (!conv) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    if (!canEditAsAttorney(auth, conv)) return NextResponse.json({ error: "Attorney workflow tools are attorney/admin only." }, { status: 403 });
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

    if (parsed.data.type === "reminder") {
      const item = await prisma.attorneyFollowUpReminder.update({
        where: { id: parsed.data.id },
        data: {
          ...(parsed.data.status ? { status: parsed.data.status, completedAt: parsed.data.status === "DONE" ? new Date() : null } : {}),
          ...(parsed.data.dueAt ? { dueAt: new Date(parsed.data.dueAt) } : {}),
          ...("note" in parsed.data ? { note: parsed.data.note ?? null } : {}),
        },
      });
      return NextResponse.json({ ok: true, item });
    }

    const item = await prisma.conversationChecklistItem.update({
      where: { id: parsed.data.id },
      data: {
        ...(typeof parsed.data.completed === "boolean"
          ? { completed: parsed.data.completed, completedAt: parsed.data.completed ? new Date() : null }
          : {}),
        ...("note" in parsed.data ? { note: parsed.data.note ?? null } : {}),
      },
    });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("PATCH /api/conversations/[conversationId]/workflow failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
