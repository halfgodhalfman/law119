import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { requireAuthContext } from "../../../../lib/auth-context";
import { redactSensitiveText, summarizeCaseDescription } from "../../../../lib/case-redaction";
import { evaluateContentRulesConfigured, persistContentRuleHits, summarizeRuleHits } from "../../../../lib/content-rules";

const createMarketplaceCaseSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.enum([
    "IMMIGRATION",
    "CRIMINAL",
    "CIVIL",
    "REAL_ESTATE",
    "FAMILY",
    "BUSINESS",
    "ESTATE_PLAN",
    "LABOR",
    "TAX",
    "OTHER",
  ]),
  subCategorySlug: z.string().trim().max(120).optional(),
  stateCode: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((v) => v.toUpperCase()),
  city: z.string().trim().max(80).optional(),
  zipCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
  description: z.string().trim().min(20).max(5000),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  preferredLanguage: z.enum(["MANDARIN", "CANTONESE", "ENGLISH"]).default("MANDARIN"),
  contactPhone: z.string().trim().min(7).max(30).optional(),
  contactEmail: z.string().trim().email().optional(),
  // Marketplace fields are accepted now for API stability. They will persist after Prisma migrate/generate.
  budgetMin: z.coerce.number().nonnegative().optional(),
  budgetMax: z.coerce.number().nonnegative().optional(),
  feeMode: z.enum(["CONSULTATION", "AGENCY", "STAGED", "HOURLY", "CUSTOM"]).optional(),
  quoteDeadline: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);

    if (auth?.role === "ATTORNEY") {
      return NextResponse.json({ error: "Attorneys cannot publish cases." }, { status: 403 });
    }

    const json = await request.json();
    const parsed = createMarketplaceCaseSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const ruleInputText = `${data.title}\n${data.description}\n${data.contactPhone ?? ""}\n${data.contactEmail ?? ""}`;
    const ruleHits = await evaluateContentRulesConfigured({
      scope: "CASE_POST",
      text: ruleInputText,
      actorUserId: auth?.authUserId ?? null,
    });
    const ruleSummary = summarizeRuleHits(ruleHits);
    if (ruleSummary.hasBlock) {
      await persistContentRuleHits({ scope: "CASE_POST", text: ruleInputText, actorUserId: auth?.authUserId ?? null }, ruleHits).catch(() => null);
      return NextResponse.json({ error: "内容触发平台规则，无法发布。", ruleWarnings: ruleSummary.warnings, ruleHits }, { status: 409 });
    }

    const safeDescription = redactSensitiveText(data.description);
    const descriptionMasked = summarizeCaseDescription(safeDescription, 240);

    const created = await prisma.case.create({
      data: {
        clientProfileId: auth?.clientProfileId ?? null,
        title: data.title,
        category: data.category,
        subCategorySlug: data.subCategorySlug ?? null,
        stateCode: data.stateCode,
        city: data.city ?? null,
        zipCode: data.zipCode,
        description: data.description,
        descriptionMasked,
        urgency: data.urgency,
        preferredLanguage: data.preferredLanguage,
        feeMode: data.feeMode ?? "CUSTOM",
        budgetMin: data.budgetMin ?? null,
        budgetMax: data.budgetMax ?? null,
        quoteDeadline: data.quoteDeadline ? new Date(data.quoteDeadline) : null,
        contactPhone: data.contactPhone ?? null,
        contactEmail: data.contactEmail ?? null,
        status: "OPEN",
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });
    if (ruleHits.length) {
      await persistContentRuleHits({ scope: "CASE_POST", text: ruleInputText, actorUserId: auth?.authUserId ?? null, caseId: created.id }, ruleHits).catch(() => null);
    }

    return NextResponse.json({
      ok: true,
      case: created,
      hallPreview: {
        title: data.title,
        category: data.category,
        stateCode: data.stateCode,
        city: data.city ?? null,
        budgetMin: data.budgetMin ?? null,
        budgetMax: data.budgetMax ?? null,
        feeMode: data.feeMode ?? "CUSTOM",
        quoteDeadline: data.quoteDeadline ?? null,
        descriptionMasked,
      },
      notes: [
        "Marketplace extension fields are persisted (requires migrated DB schema).",
      ],
      ruleWarnings: ruleSummary.warnings,
    });
  } catch (error) {
    console.error("POST /api/marketplace/cases failed", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        ...(process.env.NODE_ENV !== "production"
          ? {
              debug:
                error instanceof Error
                  ? { message: error.message, stack: error.stack }
                  : { message: String(error) },
            }
          : {}),
      },
      { status: 500 },
    );
  }
}
