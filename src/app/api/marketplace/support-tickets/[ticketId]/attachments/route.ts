import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const BUCKET = "support-ticket-attachments";
const MAX_ATTACHMENTS = 8;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function buildStoragePath(ticketId: string, userId: string, fileName: string, index: number) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin";
  return `${ticketId}/${userId}/${Date.now()}-${index}.${ext}`;
}

async function getTicketAccess(ticketId: string) {
  const auth = await requireAuthContext().catch(() => null);
  if (!auth) return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) } as const;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, createdByUserId: true },
  });
  if (!ticket) return { error: NextResponse.json({ error: "Ticket not found." }, { status: 404 }) } as const;
  const isAdmin = auth.role === "ADMIN";
  const isOwner = ticket.createdByUserId === auth.authUserId;
  if (!isAdmin && !isOwner) return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) } as const;
  return { auth, ticket } as const;
}

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { ticketId } = await params;
    const access = await getTicketAccess(ticketId);
    if ("error" in access) return access.error;
    const { auth } = access;

    const formData = await request.formData();
    const files = formData.getAll("files").filter((v): v is File => v instanceof File);
    if (!files.length) return NextResponse.json({ error: "No files uploaded." }, { status: 400 });

    const existingPending = await prisma.supportTicketAttachment.count({
      where: { ticketId, uploaderUserId: auth.authUserId, messageId: null },
    });
    if (existingPending + files.length > MAX_ATTACHMENTS) {
      return NextResponse.json({ error: `Maximum ${MAX_ATTACHMENTS} pending files allowed.` }, { status: 400 });
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
      if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: `File "${file.name}" exceeds 15MB.` }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const uploaded: Array<{ fileName: string; storagePath: string; url: string; mimeType: string; sizeBytes: number }> = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const storagePath = buildStoragePath(ticketId, auth.authUserId, file.name, i);
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
      const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 604800);
      if (signError || !signed?.signedUrl) return NextResponse.json({ error: "Failed to sign attachment URL." }, { status: 500 });
      uploaded.push({ fileName: file.name, storagePath, url: signed.signedUrl, mimeType: file.type, sizeBytes: file.size });
    }

    const created = await Promise.all(uploaded.map((f) =>
      prisma.supportTicketAttachment.create({
        data: {
          ticketId,
          uploaderUserId: auth.authUserId,
          messageId: null,
          fileName: f.fileName,
          storagePath: f.storagePath,
          url: f.url,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
        },
        select: { id: true, fileName: true, url: true, mimeType: true, sizeBytes: true, createdAt: true },
      }),
    ));
    return NextResponse.json({ ok: true, items: created });
  } catch (error) {
    console.error("POST /api/marketplace/support-tickets/[ticketId]/attachments failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { ticketId } = await params;
    const access = await getTicketAccess(ticketId);
    if ("error" in access) return access.error;
    const { auth } = access;
    const body = (await request.json().catch(() => ({}))) as { attachmentId?: string };
    if (!body.attachmentId) return NextResponse.json({ error: "attachmentId is required." }, { status: 400 });

    const attachment = await prisma.supportTicketAttachment.findUnique({
      where: { id: body.attachmentId },
      select: { id: true, ticketId: true, uploaderUserId: true, messageId: true, storagePath: true },
    });
    if (!attachment || attachment.ticketId !== ticketId || attachment.uploaderUserId !== auth.authUserId) {
      return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    }
    if (attachment.messageId) return NextResponse.json({ error: "Cannot remove attachment already sent in a message." }, { status: 409 });

    const supabase = getSupabaseAdminClient();
    await supabase.storage.from(BUCKET).remove([attachment.storagePath]).catch(() => null);
    await prisma.supportTicketAttachment.delete({ where: { id: attachment.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/marketplace/support-tickets/[ticketId]/attachments failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

