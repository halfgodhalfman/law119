import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";

const schema = z.object({
  id: z.string().optional(),
  action: z.enum(["create", "update", "delete"]),
  caseType: z.string().trim().min(1).max(100).optional(),
  summaryMasked: z.string().trim().min(10).max(2000).optional(),
  serviceProvided: z.string().trim().min(5).max(1000).optional(),
  outcomeCategory: z.string().trim().min(1).max(200).optional(),
  jurisdiction: z.string().trim().max(100).optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  evidenceOptional: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export async function GET() {
  const auth = await requireAuthContext().catch(() => null);
  if (!auth || auth.role !== "ATTORNEY" || !auth.attorneyProfileId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const items = await prisma.attorneyCaseShowcase.findMany({
    where: { attorneyId: auth.attorneyProfileId },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ATTORNEY" || !auth.attorneyProfileId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    const data = parsed.data;
    if (data.action === "delete") {
      if (!data.id) return NextResponse.json({ error: "id required" }, { status: 400 });
      await prisma.attorneyCaseShowcase.deleteMany({ where: { id: data.id, attorneyId: auth.attorneyProfileId } });
      return NextResponse.json({ ok: true });
    }
    if (!data.caseType || !data.summaryMasked || !data.serviceProvided || !data.outcomeCategory) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (data.action === "create") {
      const item = await prisma.attorneyCaseShowcase.create({
        data: {
          attorneyId: auth.attorneyProfileId,
          caseType: data.caseType,
          summaryMasked: data.summaryMasked,
          serviceProvided: data.serviceProvided,
          outcomeCategory: data.outcomeCategory,
          jurisdiction: data.jurisdiction ?? null,
          year: data.year ?? null,
          evidenceOptional: data.evidenceOptional ?? null,
          status: data.status ?? "DRAFT",
          sortOrder: data.sortOrder ?? 0,
        },
      });
      return NextResponse.json({ ok: true, item });
    }
    if (!data.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const item = await prisma.attorneyCaseShowcase.updateMany({
      where: { id: data.id, attorneyId: auth.attorneyProfileId },
      data: {
        caseType: data.caseType,
        summaryMasked: data.summaryMasked,
        serviceProvided: data.serviceProvided,
        outcomeCategory: data.outcomeCategory,
        jurisdiction: data.jurisdiction ?? null,
        year: data.year ?? null,
        evidenceOptional: data.evidenceOptional ?? null,
        status: data.status ?? "DRAFT",
        sortOrder: data.sortOrder ?? 0,
      },
    });
    return NextResponse.json({ ok: true, count: item.count });
  } catch (e) {
    console.error("POST /api/attorney/showcases failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

