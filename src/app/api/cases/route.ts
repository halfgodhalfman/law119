export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { caseSubmissionSchema } from "../../../lib/validation";
import { notifyMatchedAttorneys } from "../../../lib/notifications";
import { requireAuthContext } from "../../../lib/auth-context";
import { zip3ProximityScore } from "../../../lib/matching/geo";

export async function POST(request: Request) {
  try {
    // Auth is optional — guests can submit cases anonymously
    const auth = await requireAuthContext().catch(() => null);
    // Attorneys cannot post cases
    if (auth && auth.role === "ATTORNEY") {
      return NextResponse.json({ error: "Attorneys cannot post cases." }, { status: 403 });
    }

    const json = await request.json();
    const parsed = caseSubmissionSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { category, stateCode, zipCode, description, urgency, preferredLanguage, title, contactPhone, contactEmail, budgetRange } = parsed.data;

    // Map budgetRange string to numeric budgetMin/budgetMax for DB storage
    const BUDGET_MAP: Record<string, { min: number | null; max: number | null }> = {
      under_1k: { min: 0,     max: 1000  },
      "1k_5k":  { min: 1000,  max: 5000  },
      "5k_10k": { min: 5000,  max: 10000 },
      "10k_30k":{ min: 10000, max: 30000 },
      over_30k: { min: 30000, max: null  },
    };
    const budget = budgetRange && budgetRange !== "any" ? BUDGET_MAP[budgetRange] : null;

    const newCase = await prisma.case.create({
      data: {
        clientProfileId: auth?.clientProfileId ?? null,
        category,
        stateCode,
        zipCode,
        description,
        urgency,
        preferredLanguage,
        title,
        contactPhone: contactPhone ?? null,
        contactEmail: contactEmail ?? null,
        budgetMin: budget?.min != null ? budget.min : null,
        budgetMax: budget?.max != null ? budget.max : null,
      },
    });

    const zipPrefix = zipCode.slice(0, 3);
    const matchedAttorneys = await prisma.attorneyProfile.findMany({
      where: {
        specialties: {
          some: { category },
        },
        serviceAreas: {
          some: {
            stateCode,
            OR: [{ zipCode }, { zipCode: { startsWith: zipPrefix } }, { zipCode: null }],
          },
        },
      },
      include: {
        user: true,
        serviceAreas: { select: { zipCode: true }, take: 1 },
      },
    });

    // Sort matched attorneys by proximity (nearest first) and cap at top 10 to avoid spam
    const prioritizedAttorneys = matchedAttorneys
      .filter((attorney) => Boolean(attorney.user.email))
      .sort((a, b) => {
        const scoreA = zip3ProximityScore(newCase.zipCode, a.serviceAreas[0]?.zipCode ?? "");
        const scoreB = zip3ProximityScore(newCase.zipCode, b.serviceAreas[0]?.zipCode ?? "");
        return scoreB - scoreA;
      })
      .slice(0, 10);

    await notifyMatchedAttorneys(
      prioritizedAttorneys.map((attorney) => ({
        attorneyEmail: attorney.user.email,
        attorneyName: `${attorney.firstName ?? ""} ${attorney.lastName ?? ""}`.trim() || "Attorney",
        caseId: newCase.id,
        category: newCase.category,
        zipCode: newCase.zipCode,
      })),
    );

    return NextResponse.json({
      ok: true,
      caseId: newCase.id,
      matchedAttorneyCount: matchedAttorneys.length,
    });
  } catch (error) {
    console.error("POST /api/cases failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
