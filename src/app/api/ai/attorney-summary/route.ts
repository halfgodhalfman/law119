import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { generateAttorneyBioSummary } from "@/lib/ai/bio-summary";

const requestSchema = z.object({
  /** The attorney profile ID to generate a bio summary for. */
  attorneyProfileId: z.string().min(1),
});

/**
 * POST /api/ai/attorney-summary
 *
 * Generates an AI-written professional bio summary for an attorney.
 * Only the attorney themselves (or an admin) can call this.
 *
 * Body: { attorneyProfileId: string }
 * Response: { ok: true, summary: string, isMock: boolean }
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { attorneyProfileId } = parsed.data;

    // Access control: only the attorney themselves or admins
    const isAdmin = auth.role === "ADMIN";
    const isOwnProfile =
      auth.role === "ATTORNEY" && auth.attorneyProfileId === attorneyProfileId;

    if (!isOwnProfile && !isAdmin) {
      return NextResponse.json(
        { error: "Only the attorney or an admin can generate a bio summary." },
        { status: 403 },
      );
    }

    // Fetch attorney profile data for the prompt
    const attorney = await prisma.attorneyProfile.findUnique({
      where: { id: attorneyProfileId },
      select: {
        yearsExperience: true,
        barState: true,
        bio: true,
        specialties: { select: { category: true } },
        languages: { select: { language: true } },
      },
    });

    if (!attorney) {
      return NextResponse.json({ error: "Attorney profile not found." }, { status: 404 });
    }

    const summary = await generateAttorneyBioSummary({
      specialties: attorney.specialties.map((s) => s.category),
      yearsExperience: attorney.yearsExperience ?? 1,
      barState: attorney.barState ?? "N/A",
      languages: attorney.languages.map((l) => l.language),
      existingBio: attorney.bio ?? undefined,
    });

    // Detect if this is a mock result (no API key configured)
    const isMock = summary.includes("[AI 简介预览") || summary.includes("[AI Summary Preview");

    return NextResponse.json({ ok: true, summary, isMock });
  } catch (error) {
    console.error("POST /api/ai/attorney-summary failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
