export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../../../../lib/prisma";
import { requireAuthContext } from "../../../../lib/auth-context";

const MAX_IMAGES = 9;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const BUCKET = "case-images";

function inferSensitiveHint(fileName: string) {
  const lower = fileName.toLowerCase();
  const keywords = [
    "passport",
    "id",
    "ssn",
    "license",
    "driver",
    "bank",
    "statement",
    "minor",
    "child",
    "birth",
    "address",
    "证件",
    "身份证",
    "护照",
    "户口",
    "银行卡",
    "住址",
    "孩子",
  ];
  const hit = keywords.find((k) => lower.includes(k));
  return hit ? `可能包含敏感信息（命中文件名关键词: ${hit}）` : null;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase env vars");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "CLIENT" || !auth.clientProfileId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const caseId = formData.get("caseId") as string | null;
    const files = formData.getAll("images") as File[];

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required." }, { status: 400 });
    }

    // Verify case belongs to this client
    const existingCase = await prisma.case.findUnique({
      where: { id: caseId },
      select: { clientProfileId: true },
    });
    if (!existingCase || existingCase.clientProfileId !== auth.clientProfileId) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    // Check existing image count
    const existingCount = await prisma.caseImage.count({ where: { caseId } });
    if (existingCount + files.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `最多允许 ${MAX_IMAGES} 个附件，当前已有 ${existingCount} 个。` },
        { status: 400 },
      );
    }

    // Validate each file
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `不支持的附件类型: ${file.type}。支持: JPEG, PNG, WEBP, HEIC, PDF, DOC, DOCX。` },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `附件 "${file.name}" 超过 10MB 大小限制。` },
          { status: 400 },
        );
      }
    }

    const supabase = getServiceClient();
    const uploadedImages: { storagePath: string; url: string; mimeType: string; sizeBytes: number; sortOrder: number; isSensitive: boolean; sensitiveHint: string | null }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const storagePath = `${caseId}/${Date.now()}-${i}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: `Upload failed: ${uploadError.message}` },
          { status: 500 },
        );
      }

      // Generate signed URL valid for 7 days (604800 seconds)
      const { data: signedData, error: signedError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 604800);

      if (signedError || !signedData?.signedUrl) {
        return NextResponse.json({ error: "Failed to generate image URL." }, { status: 500 });
      }

      uploadedImages.push({
        storagePath,
        url: signedData.signedUrl,
        mimeType: file.type,
        sizeBytes: file.size,
        sortOrder: existingCount + i,
        isSensitive: Boolean(inferSensitiveHint(file.name)),
        sensitiveHint: inferSensitiveHint(file.name),
      });
    }

    // Save all image records to DB
    await prisma.caseImage.createMany({
      data: uploadedImages.map((img) => ({ caseId, ...img })),
    });

    return NextResponse.json({
      ok: true,
      count: uploadedImages.length,
      privacyHints: uploadedImages
        .map((img) => img.sensitiveHint)
        .filter((v): v is string => Boolean(v)),
    });
  } catch (error) {
    console.error("POST /api/cases/upload-images failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "CLIENT" || !auth.clientProfileId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { imageId } = await request.json();
    if (!imageId) {
      return NextResponse.json({ error: "imageId is required." }, { status: 400 });
    }

    const image = await prisma.caseImage.findUnique({
      where: { id: imageId },
      include: { case: { select: { clientProfileId: true } } },
    });

    if (!image || image.case.clientProfileId !== auth.clientProfileId) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }

    const supabase = getServiceClient();
    await supabase.storage.from(BUCKET).remove([image.storagePath]);
    await prisma.caseImage.delete({ where: { id: imageId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/cases/upload-images failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
