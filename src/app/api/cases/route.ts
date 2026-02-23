import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { caseSubmissionSchema } from "../../../lib/validation";
import { notifyMatchedAttorneys } from "../../../lib/notifications";
import { requireAuthContext } from "../../../lib/auth-context";

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

    const { category, stateCode, zipCode, description, urgency, preferredLanguage, title, contactPhone, contactEmail } = parsed.data;

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
      },
    });

    await notifyMatchedAttorneys(
      matchedAttorneys
        .filter((attorney) => Boolean(attorney.user.email))
        .map((attorney) => ({
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
