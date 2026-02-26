/**
 * AI Attorney Bio Summary Generator
 *
 * Generates a concise professional bio for an attorney using Claude or GPT-4.
 * Falls back to a structured mock when no API key is configured.
 *
 * Integration points:
 *   - Set ANTHROPIC_API_KEY to use Anthropic Claude (recommended)
 *   - Set OPENAI_API_KEY to use OpenAI GPT-4 as fallback
 *   - Neither key → returns formatted placeholder text
 */

export type BioSummaryParams = {
  specialties: string[];
  yearsExperience: number;
  barState: string;
  languages: string[];
  existingBio?: string;
};

export async function generateAttorneyBioSummary(
  params: BioSummaryParams,
): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const prompt = buildPrompt(params);

  // ── Anthropic Claude (primary) ────────────────────────────────────────────
  if (anthropicKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as {
          content: Array<{ type: string; text: string }>;
        };
        const text = data.content.find((b) => b.type === "text")?.text;
        if (text && text.trim().length > 20) return text.trim();
      }
    } catch (e) {
      console.warn("[bio-summary] Anthropic API call failed, trying fallback:", e);
    }
  }

  // ── OpenAI GPT-4 (secondary) ──────────────────────────────────────────────
  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 300,
          messages: [
            {
              role: "system",
              content:
                "You are a professional legal copywriter. Write concise, accurate attorney bios. No exaggeration. Bilingual (Chinese first, then English).",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as {
          choices: Array<{ message: { content: string } }>;
        };
        const text = data.choices[0]?.message?.content;
        if (text && text.trim().length > 20) return text.trim();
      }
    } catch (e) {
      console.warn("[bio-summary] OpenAI API call failed, using mock:", e);
    }
  }

  // ── Mock fallback ─────────────────────────────────────────────────────────
  return buildMockBio(params);
}

function buildPrompt(params: BioSummaryParams): string {
  const specStr = params.specialties.slice(0, 3).join("、") || "法律事务";
  const langStr = params.languages.join("、") || "英语";
  return [
    `请为以下律师生成一段简洁的职业简介（中英双语，150字以内）：`,
    `执照州：${params.barState}`,
    `执业年限：${params.yearsExperience} 年`,
    `专业领域：${specStr}`,
    `语言能力：${langStr}`,
    params.existingBio ? `现有简介（参考）：${params.existingBio.slice(0, 200)}` : "",
    ``,
    `要求：语气专业，客观准确，不夸大，强调对华人客户的服务能力。`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildMockBio(params: BioSummaryParams): string {
  const specStr = params.specialties.slice(0, 3).join("、") || "法律事务";
  const langStr = params.languages.join("、") || "英语";
  return [
    `【AI 简介预览 — 待配置 API Key 后生成正式内容】`,
    ``,
    `执业 ${params.yearsExperience} 年 · ${params.barState} 州执照 · 专注 ${specStr}。`,
    `语言：${langStr}。`,
    `提供专业法律服务，帮助华人客户以母语沟通、高效解决法律问题。`,
    ``,
    `[AI Summary Preview — Configure ANTHROPIC_API_KEY or OPENAI_API_KEY to generate real content]`,
    `${params.yearsExperience}+ years of experience · Licensed in ${params.barState}`,
    `Focus: ${params.specialties.join(", ")}`,
    `Languages: ${langStr}`,
  ].join("\n");
}
