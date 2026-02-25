// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";

export async function GET() {
  let auth;
  try { auth = await requireAuthContext(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  if (auth.role !== "ATTORNEY" || !auth.attorneyProfileId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const templates = await prisma.contractTemplate.findMany({
    where: { attorneyProfileId: auth.attorneyProfileId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ ok: true, templates });
}

export async function POST(req: Request) {
  let auth;
  try { auth = await requireAuthContext(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  if (auth.role !== "ATTORNEY" || !auth.attorneyProfileId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, serviceBoundary, serviceScopeSummary, stagePlanJson, feeMode, feeAmountMin, feeAmountMax, includesConsultation, includesCourtAppearance, includesTranslation, includesDocumentFiling, isDefault } = body;
  if (!title || !serviceScopeSummary) return NextResponse.json({ error: "标题和服务范围必填" }, { status: 400 });

  // If setting as default, unset other defaults
  if (isDefault) {
    await prisma.contractTemplate.updateMany({ where: { attorneyProfileId: auth.attorneyProfileId, isDefault: true }, data: { isDefault: false } });
  }

  const template = await prisma.contractTemplate.create({
    data: {
      attorneyProfileId: auth.attorneyProfileId,
      title, serviceBoundary: serviceBoundary || "CUSTOM", serviceScopeSummary,
      stagePlanJson: stagePlanJson || null, feeMode: feeMode || "CUSTOM",
      feeAmountMin: feeAmountMin ? Number(feeAmountMin) : null, feeAmountMax: feeAmountMax ? Number(feeAmountMax) : null,
      includesConsultation: !!includesConsultation, includesCourtAppearance: !!includesCourtAppearance,
      includesTranslation: !!includesTranslation, includesDocumentFiling: !!includesDocumentFiling,
      isDefault: !!isDefault,
    },
  });
  return NextResponse.json({ ok: true, template });
}
