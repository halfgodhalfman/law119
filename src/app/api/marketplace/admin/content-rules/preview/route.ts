import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
import { evaluateContentRulesConfigured, summarizeRuleHits } from "@/lib/content-rules";

const previewSchema = z.object({
  scope: z.enum(["CASE_POST", "BID_SUBMISSION", "CHAT_MESSAGE"]),
  text: z.string().max(20000),
});

export async function POST(request: Request) {
  try {
    await requireAdminAuth();
    const parsed = previewSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const hits = await evaluateContentRulesConfigured({
      scope: parsed.data.scope,
      text: parsed.data.text,
    });
    const summary = summarizeRuleHits(hits);

    return NextResponse.json({
      ok: true,
      scope: parsed.data.scope,
      summary,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Admin required." }, { status: 403 });
    }
    console.error("POST /api/marketplace/admin/content-rules/preview failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

