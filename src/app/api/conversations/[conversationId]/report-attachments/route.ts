export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getConversationParticipants } from "@/lib/conversation-safety";

const BUCKET = "conversation-report-evidence";
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function buildStoragePath(conversationId: string, userId: string, fileName: string, index: number) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin";
  return `${conversationId}/${userId}/${Date.now()}-${index}.${ext}`;
}

async function requireConversationParticipant(conversationId: string) {
  const auth = await requireAuthContext().catch(() => null);
  if (!auth || (auth.role !== "CLIENT" && auth.role !== "ATTORNEY")) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) } as const;
  }
  const conversation = await getConversationParticipants(conversationId);
  if (!conversation) {
    return { error: NextResponse.json({ error: "Conversation not found." }, { status: 404 }) } as const;
  }
  const isClient = auth.role === "CLIENT" && conversation.client?.userId === auth.authUserId;
  const isAttorney = auth.role === "ATTORNEY" && conversation.attorney.userId === auth.authUserId;
  if (!isClient && !isAttorney) {
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) } as const;
  }
  return { auth, conversation } as const;
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const access = await requireConversationParticipant(conversationId);
    if ("error" in access) return access.error;
    const { auth } = access;

    const formData = await request.formData();
    const files = formData.getAll("files").filter((v): v is File => v instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    const existingPending = await prisma.conversationReportAttachment.count({
      where: { conversationId, uploaderUserId: auth.authUserId, reportId: null },
    });
    if (existingPending + files.length > MAX_ATTACHMENTS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ATTACHMENTS} pending evidence files allowed.` },
        { status: 400 },
      );
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File "${file.name}" exceeds 15MB.` }, { status: 400 });
      }
    }

    const supabase = getSupabaseAdminClient();
    const uploaded: Array<{
      fileName: string;
      storagePath: string;
      url: string;
      mimeType: string;
      sizeBytes: number;
    }> = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const storagePath = buildStoragePath(conversationId, auth.authUserId, file.name, i);
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) {
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
      }
      const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 604800);
      if (signError || !signed?.signedUrl) {
        return NextResponse.json({ error: "Failed to sign evidence URL." }, { status: 500 });
      }
      uploaded.push({
        fileName: file.name,
        storagePath,
        url: signed.signedUrl,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    }

    const created = await Promise.all(
      uploaded.map((f) =>
        prisma.conversationReportAttachment.create({
          data: {
            conversationId,
            uploaderUserId: auth.authUserId,
            reportId: null,
            fileName: f.fileName,
            storagePath: f.storagePath,
            url: f.url,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
          },
          select: { id: true, fileName: true, url: true, mimeType: true, sizeBytes: true, createdAt: true },
        }),
      ),
    );

    return NextResponse.json({ ok: true, items: created });
  } catch (error) {
    console.error("POST /api/conversations/[conversationId]/report-attachments failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const access = await requireConversationParticipant(conversationId);
    if ("error" in access) return access.error;
    const { auth } = access;
    const body = (await request.json().catch(() => ({}))) as { attachmentId?: string };
    if (!body.attachmentId) {
      return NextResponse.json({ error: "attachmentId is required." }, { status: 400 });
    }

    const attachment = await prisma.conversationReportAttachment.findUnique({
      where: { id: body.attachmentId },
      select: { id: true, uploaderUserId: true, conversationId: true, reportId: true, storagePath: true },
    });
    if (!attachment || attachment.conversationId !== conversationId || attachment.uploaderUserId !== auth.authUserId) {
      return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    }
    if (attachment.reportId) {
      return NextResponse.json({ error: "Attached evidence cannot be removed after report submission." }, { status: 409 });
    }

    const supabase = getSupabaseAdminClient();
    await supabase.storage.from(BUCKET).remove([attachment.storagePath]).catch(() => null);
    await prisma.conversationReportAttachment.delete({ where: { id: attachment.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/conversations/[conversationId]/report-attachments failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

