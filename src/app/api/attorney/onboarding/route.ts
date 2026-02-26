export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuthContext } from "../../../../lib/auth-context";
import { z } from "zod";
import { buildAttorneyReviewChecklist, computeAttorneyProfileCompleteness } from "@/lib/admin-attorney-review";

const onboardingSchema = z.object({
  // Step 1 — Basic Info
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Valid phone number required").optional().or(z.literal("")),
  firmName: z.string().optional().or(z.literal("")),

  // Step 2 — Bar License
  barLicenseNumber: z.string().min(1, "Bar license number is required"),
  barState: z.string().length(2, "Must be a 2-letter state code"),
  registeredLegalName: z.string().optional().or(z.literal("")),
  barRegisteredName: z.string().optional().or(z.literal("")),
  identityDocumentType: z.enum(["PASSPORT", "DRIVER_LICENSE", "STATE_ID", "OTHER"]).optional().nullable(),
  identityDocumentFileName: z.string().max(255).optional().or(z.literal("")),
  lawSchool: z.string().optional().or(z.literal("")),
  yearsExperience: z.number().int().min(0).max(60).optional(),

  // Step 3 — Specialties
  specialties: z.array(z.enum([
    "IMMIGRATION", "CIVIL", "CRIMINAL", "FAMILY", "LABOR", "BUSINESS", "OTHER"
  ])).min(1, "Select at least one specialty"),

  // Step 4 — Service Areas
  serviceAreas: z.array(z.object({
    stateCode: z.string().length(2),
    zipCode: z.string().optional().or(z.literal("")),
  })).min(1, "Add at least one service area"),

  // Step 5 — Languages & Bio
  languages: z.array(z.enum(["MANDARIN", "ENGLISH"])).min(1, "Select at least one language"),
  bio: z.string().max(1000, "Bio must be under 1000 characters").optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (auth.role !== "ATTORNEY") {
      return NextResponse.json({ error: "Only attorneys can complete onboarding." }, { status: 403 });
    }

    const json = await request.json();
    const parsed = onboardingSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      firstName, lastName, phone, firmName,
      barLicenseNumber, barState, lawSchool, yearsExperience,
      registeredLegalName, barRegisteredName, identityDocumentType, identityDocumentFileName,
      specialties, serviceAreas, languages, bio,
    } = parsed.data;

    const existingProfile = await prisma.attorneyProfile.findUnique({
      where: { userId: auth.authUserId },
      select: {
        id: true,
        lastReviewedAt: true,
        reviewStatus: true,
      },
    });

    // Upsert the AttorneyProfile
    const profile = await prisma.attorneyProfile.upsert({
      where: { userId: auth.authUserId },
      create: {
        userId: auth.authUserId,
        firstName,
        lastName,
        phone: phone || null,
        firmName: firmName || null,
        barLicenseNumber,
        barState,
        registeredLegalName: registeredLegalName || null,
        barRegisteredName: barRegisteredName || null,
        identityDocumentType: identityDocumentType ?? null,
        identityDocumentFileName: identityDocumentFileName || null,
        lawSchool: lawSchool || null,
        yearsExperience: yearsExperience ?? null,
        bio: bio || null,
      },
      update: {
        firstName,
        lastName,
        phone: phone || null,
        firmName: firmName || null,
        barLicenseNumber,
        barState,
        registeredLegalName: registeredLegalName || null,
        barRegisteredName: barRegisteredName || null,
        identityDocumentType: identityDocumentType ?? null,
        identityDocumentFileName: identityDocumentFileName || null,
        lawSchool: lawSchool || null,
        yearsExperience: yearsExperience ?? null,
        bio: bio || null,
      },
    });

    // Replace specialties
    await prisma.attorneySpecialty.deleteMany({ where: { attorneyId: profile.id } });
    await prisma.attorneySpecialty.createMany({
      data: specialties.map((category) => ({ attorneyId: profile.id, category })),
    });

    // Replace service areas
    await prisma.attorneyServiceArea.deleteMany({ where: { attorneyId: profile.id } });
    await prisma.attorneyServiceArea.createMany({
      data: serviceAreas.map((area) => ({
        attorneyId: profile.id,
        stateCode: area.stateCode,
        zipCode: area.zipCode || null,
      })),
      skipDuplicates: true,
    });

    // Replace languages
    await prisma.attorneyLanguage.deleteMany({ where: { attorneyId: profile.id } });
    await prisma.attorneyLanguage.createMany({
      data: languages.map((language) => ({ attorneyId: profile.id, language })),
    });

    const refreshed = await prisma.attorneyProfile.findUnique({
      where: { id: profile.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        firmName: true,
        barLicenseNumber: true,
        barState: true,
        yearsExperience: true,
        avatarUrl: true,
        bio: true,
        specialties: { select: { id: true } },
        serviceAreas: { select: { id: true } },
        languages: { select: { id: true } },
      },
    });

    if (!refreshed) {
      return NextResponse.json({ error: "Attorney profile not found after onboarding save." }, { status: 500 });
    }

    const checklist = buildAttorneyReviewChecklist(refreshed);
    const completeness = computeAttorneyProfileCompleteness({
      ...refreshed,
      specialtiesCount: refreshed.specialties.length,
      serviceAreasCount: refreshed.serviceAreas.length,
      languagesCount: refreshed.languages.length,
    });
    const checklistSnapshot = {
      items: checklist.items,
      checklistScore: checklist.checklistScore,
      completeness,
      missingKeys: checklist.missingKeys,
    };
    const shouldMarkReReview = Boolean(existingProfile?.lastReviewedAt);

    await prisma.$transaction(async (tx) => {
      await tx.attorneyProfile.update({
        where: { id: profile.id },
        data: {
          reviewStatus: shouldMarkReReview ? "RE_REVIEW_REQUIRED" : "PENDING_REVIEW",
          reviewRequestedAt: new Date(),
          profileCompletenessScore: completeness,
          reviewChecklistSnapshot: checklistSnapshot,
          ...(shouldMarkReReview
            ? {
                reviewDecisionTemplate: null,
                reviewDecisionReason: "律师资料更新，已自动进入复审队列。",
              }
            : {}),
        },
      });

      if (shouldMarkReReview) {
        await tx.attorneyReviewLog.create({
          data: {
            attorneyId: profile.id,
            adminUserId: null,
            action: "MARK_RE_REVIEW",
            toStatus: "RE_REVIEW_REQUIRED",
            templateKey: "SYSTEM_PROFILE_UPDATE",
            reason: "律师资料更新触发复审（系统）",
            checklistSnapshot,
            completenessScore: completeness,
          },
        });
      }
    });

    return NextResponse.json({ ok: true, profileId: profile.id });
  } catch (error) {
    console.error("POST /api/attorney/onboarding failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
