// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";

export async function PATCH(req: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  let auth;
  try { auth = await requireAuthContext(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  if (auth.role !== "ATTORNEY" || !auth.attorneyProfileId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.contractTemplate.findUnique({ where: { id: templateId } });
  if (!existing || existing.attorneyProfileId !== auth.attorneyProfileId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, serviceBoundary, serviceScopeSummary, stagePlanJson, feeMode, feeAmountMin, feeAmountMax, includesConsultation, includesCourtAppearance, includesTranslation, includesDocumentFiling, isDefault } = body;

  if (isDefault) {
    await prisma.contractTemplate.updateMany({ where: { attorneyProfileId: auth.attorneyProfileId, isDefault: true, id: { not: templateId } }, data: { isDefault: false } });
  }

  const updated = await prisma.contractTemplate.update({
    where: { id: templateId },
    data: {
      ...(title !== undefined && { title }),
      ...(serviceBoundary !== undefined && { serviceBoundary }),
      ...(serviceScopeSummary !== undefined && { serviceScopeSummary }),
      ...(stagePlanJson !== undefined && { stagePlanJson }),
      ...(feeMode !== undefined && { feeMode }),
      ...(feeAmountMin !== undefined && { feeAmountMin: feeAmountMin ? Number(feeAmountMin) : null }),
      ...(feeAmountMax !== undefined && { feeAmountMax: feeAmountMax ? Number(feeAmountMax) : null }),
      ...(includesConsultation !== undefined && { includesConsultation }),
      ...(includesCourtAppearance !== undefined && { includesCourtAppearance }),
      ...(includesTranslation !== undefined && { includesTranslation }),
      ...(includesDocumentFiling !== undefined && { includesDocumentFiling }),
      ...(isDefault !== undefined && { isDefault }),
    },
  });
  return NextResponse.json({ ok: true, template: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  let auth;
  try { auth = await requireAuthContext(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  if (auth.role !== "ATTORNEY" || !auth.attorneyProfileId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.contractTemplate.findUnique({ where: { id: templateId } });
  if (!existing || existing.attorneyProfileId !== auth.attorneyProfileId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contractTemplate.delete({ where: { id: templateId } });
  return NextResponse.json({ ok: true });
}
