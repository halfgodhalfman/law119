import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get("audience") as "GENERAL" | "CLIENT" | "ATTORNEY" | null;
    const featured = searchParams.get("featured");

    const where: {
      active: boolean;
      audience?: "GENERAL" | "CLIENT" | "ATTORNEY";
      featured?: boolean;
    } = { active: true };

    if (audience && ["GENERAL", "CLIENT", "ATTORNEY"].includes(audience)) {
      where.audience = audience;
    }
    if (featured === "true") {
      where.featured = true;
    }

    const faqs = await prisma.faqEntry.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        audience: true,
        category: true,
        question: true,
        answer: true,
        featured: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({ ok: true, faqs });
  } catch (error) {
    console.error("GET /api/faqs failed", error);
    return NextResponse.json({ ok: false, faqs: [], error: "Failed to load FAQs" }, { status: 500 });
  }
}
