import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const patchSchema = z.object({
  visibility: z.enum(["CLIENT_ONLY", "SELECTED_ATTORNEY", "ADMINS_ONLY"]).optional(),
  isSensitive: z.boolean().optional(),
  sensitiveHint: z.string().trim().max(500).nullable().optional(),
});

async function resolveAttachmentAccess(caseId: string, imageId: string, auth: Awaited<ReturnType<typeof requireAuthContext>>) {
  const image = await prisma.caseImage.findFirst({
    where: { id: imageId, caseId },
    select: {
      id: true,
      caseId: true,
      storagePath: true,
      mimeType: true,
      sizeBytes: true,
      visibility: true,
      isSensitive: true,
      sensitiveHint: true,
      case: {
        select: {
          id: true,
          clientProfileId: true,
          selectedBidId: true,
          bids: { select: { id: true, attorneyProfileId: true } },
        },
      },
    },
  });
  if (!image) return { image: null, allowed: false, reason: "ATTACHMENT_NOT_FOUND" } as const;

  const isAdmin = auth.role === "ADMIN";
  const isOwnerClient = auth.role === "CLIENT" && auth.clientProfileId && image.case.clientProfileId === auth.clientProfileId;
  const selectedBid = image.case.selectedBidId
    ? image.case.bids.find((b) => b.id === image.case.selectedBidId) ?? null
    : null;
  const isSelectedAttorney =
    auth.role === "ATTORNEY" &&
    auth.attorneyProfileId &&
    selectedBid?.attorneyProfileId === auth.attorneyProfileId;

  let allowed = false;
  if (isAdmin || isOwnerClient) {
    allowed = true;
  } else if (image.visibility === "SELECTED_ATTORNEY" && isSelectedAttorney) {
    allowed = true;
  } else if (image.visibility === "ADMINS_ONLY" && isAdmin) {
    allowed = true;
  }

  return {
    image,
    allowed,
    reason: allowed ? null : "FORBIDDEN_BY_VISIBILITY",
    isOwnerClient,
    isSelectedAttorney,
    isAdmin,
  } as const;
}

async function logAccess(params: {
  caseId: string;
  caseImageId: string;
  auth: Awaited<ReturnType<typeof requireAuthContext>>;
  accessType: "VIEW" | "DOWNLOAD" | "DENIED";
  reason?: string | null;
}) {
  await prisma.caseImageAccessLog.create({
    data: {
      caseId: params.caseId,
      caseImageId: params.caseImageId,
      viewerUserId: params.auth.authUserId,
      viewerRole: params.auth.role,
      attorneyProfileId: params.auth.attorneyProfileId,
      clientProfileId: params.auth.clientProfileId,
      accessType: params.accessType,
      reason: params.reason ?? null,
    },
  }).catch(() => null);
}

export async function GET(request: Request, { params }: { params: Promise<{ caseId: string; imageId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { caseId, imageId } = await params;
    const mode = new URL(request.url).searchParams.get("mode") === "download" ? "DOWNLOAD" : "VIEW";

    const access = await resolveAttachmentAccess(caseId, imageId, auth);
    if (!access.image) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    if (!access.allowed) {
      await logAccess({ caseId, caseImageId: imageId, auth, accessType: "DENIED", reason: access.reason });
      return NextResponse.json({ error: "No permission to access this attachment." }, { status: 403 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: signed, error } = await supabase.storage.from("case-images").createSignedUrl(access.image.storagePath, 600);
    if (error || !signed?.signedUrl) {
      return NextResponse.json({ error: "Failed to create signed URL." }, { status: 500 });
    }
    await logAccess({ caseId, caseImageId: imageId, auth, accessType: mode });

    return NextResponse.json({
      ok: true,
      attachment: {
        id: access.image.id,
        mimeType: access.image.mimeType,
        sizeBytes: access.image.sizeBytes,
        visibility: access.image.visibility,
        isSensitive: access.image.isSensitive,
        sensitiveHint: access.image.sensitiveHint,
      },
      signedUrl: signed.signedUrl,
      expiresInSeconds: 600,
    });
  } catch (error) {
    console.error("GET /api/marketplace/cases/[caseId]/attachments/[imageId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ caseId: string; imageId: string }> }) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { caseId, imageId } = await params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

    const existing = await prisma.caseImage.findFirst({
      where: { id: imageId, caseId },
      select: { id: true, caseId: true, case: { select: { clientProfileId: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });

    const isAdmin = auth.role === "ADMIN";
    const isOwnerClient = auth.role === "CLIENT" && auth.clientProfileId && existing.case.clientProfileId === auth.clientProfileId;
    if (!isAdmin && !isOwnerClient) return NextResponse.json({ error: "Only case owner or admin can update attachment permissions." }, { status: 403 });

    const updated = await prisma.caseImage.update({
      where: { id: imageId },
      data: {
        ...(parsed.data.visibility ? { visibility: parsed.data.visibility } : {}),
        ...(typeof parsed.data.isSensitive === "boolean" ? { isSensitive: parsed.data.isSensitive } : {}),
        ...("sensitiveHint" in parsed.data ? { sensitiveHint: parsed.data.sensitiveHint ?? null } : {}),
      },
      select: { id: true, visibility: true, isSensitive: true, sensitiveHint: true },
    });
    return NextResponse.json({ ok: true, attachment: updated });
  } catch (error) {
    console.error("PATCH /api/marketplace/cases/[caseId]/attachments/[imageId] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
