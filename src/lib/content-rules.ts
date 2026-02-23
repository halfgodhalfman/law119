import { ContentRuleAction, ContentRuleScope } from "@prisma/client";
import { prisma } from "./prisma";

type RuleHit = {
  ruleCode: string;
  action: ContentRuleAction;
  severity: "LOW" | "MEDIUM" | "HIGH";
  matchedText?: string;
  note: string;
};

type EvaluateInput = {
  scope: ContentRuleScope;
  text: string;
  actorUserId?: string | null;
  caseId?: string | null;
  bidId?: string | null;
  conversationId?: string | null;
};

const OFF_PLATFORM_PATTERNS = [
  /wechat|vx|v信|微信|whatsapp|telegram|tg\b|line\s?id/i,
  /@[\w.-]+\.(com|net|org)/i,
  /\b(?:call me|text me|contact me directly|dm me)\b/i,
];

const ILLEGAL_DEMAND_PATTERNS = [
  /fake (document|visa|paper|marriage)/i,
  /forge|forged|forgery/i,
  /bribe|贿赂|行贿/i,
  /逃税|tax evasion/i,
  /伪造|假材料|假身份/i,
];

const HARASSMENT_PATTERNS = [
  /idiot|stupid|垃圾|傻[逼比]/i,
  /threat|kill you|弄死你/i,
];

const DEFAULT_RULE_CONFIGS = {
  CASE_POST: [
    { ruleCode: "OFF_PLATFORM_CONTACT", action: "WARN", severity: "MEDIUM", pattern: "wechat|vx|v信|微信|whatsapp|telegram|@\\\\w+\\\\.(com|net|org)", patternType: "regex", description: "疑似站外导流/联系方式交换", sortOrder: 10 },
    { ruleCode: "ILLEGAL_DEMAND", action: "BLOCK", severity: "HIGH", pattern: "fake (document|visa|paper|marriage)|forge|forgery|贿赂|行贿|伪造|假材料|假身份", patternType: "regex", description: "违法需求/违法建议", sortOrder: 20 },
  ],
  BID_SUBMISSION: [
    { ruleCode: "OFF_PLATFORM_CONTACT", action: "WARN", severity: "MEDIUM", pattern: "wechat|vx|微信|whatsapp|telegram|call me|contact me directly", patternType: "regex", description: "疑似站外导流", sortOrder: 10 },
    { ruleCode: "ILLEGAL_DEMAND", action: "BLOCK", severity: "HIGH", pattern: "bribe|贿赂|forge|伪造", patternType: "regex", description: "违法建议", sortOrder: 20 },
  ],
  CHAT_MESSAGE: [
    { ruleCode: "OFF_PLATFORM_CONTACT", action: "REVIEW", severity: "MEDIUM", pattern: "wechat|vx|微信|whatsapp|telegram|line id|dm me", patternType: "regex", description: "站外导流", sortOrder: 10 },
    { ruleCode: "HARASSMENT_LANGUAGE", action: "REVIEW", severity: "MEDIUM", pattern: "idiot|stupid|垃圾|傻[逼比]|threat|kill you|弄死你", patternType: "regex", description: "辱骂/威胁表达", sortOrder: 20 },
    { ruleCode: "ILLEGAL_DEMAND", action: "BLOCK", severity: "HIGH", pattern: "fake (document|visa)|forge|伪造|假材料", patternType: "regex", description: "违法需求", sortOrder: 30 },
  ],
} as const;

function getRuleConfigDelegate() {
  const p = prisma as unknown as {
    contentRuleConfig?: {
      upsert: (...args: any[]) => Promise<any>;
      findMany: (...args: any[]) => Promise<any[]>;
    };
  };
  return p.contentRuleConfig;
}

function getRuleEventDelegate() {
  const p = prisma as unknown as {
    contentRuleEvent?: {
      createMany: (...args: any[]) => Promise<any>;
    };
  };
  return p.contentRuleEvent;
}

export function evaluateContentRules(input: EvaluateInput): RuleHit[] {
  const text = input.text || "";
  const hits: RuleHit[] = [];

  for (const p of OFF_PLATFORM_PATTERNS) {
    const m = text.match(p);
    if (m) {
      hits.push({
        ruleCode: "OFF_PLATFORM_CONTACT",
        action: input.scope === "CHAT_MESSAGE" ? "REVIEW" : "WARN",
        severity: "MEDIUM",
        matchedText: m[0],
        note: "检测到疑似站外导流/联系方式交换",
      });
      break;
    }
  }

  for (const p of ILLEGAL_DEMAND_PATTERNS) {
    const m = text.match(p);
    if (m) {
      hits.push({
        ruleCode: "ILLEGAL_DEMAND",
        action: "BLOCK",
        severity: "HIGH",
        matchedText: m[0],
        note: "检测到疑似违法需求/违法建议",
      });
      break;
    }
  }

  if (input.scope === "CHAT_MESSAGE") {
    for (const p of HARASSMENT_PATTERNS) {
      const m = text.match(p);
      if (m) {
        hits.push({
          ruleCode: "HARASSMENT_LANGUAGE",
          action: "REVIEW",
          severity: "MEDIUM",
          matchedText: m[0],
          note: "检测到疑似辱骂/威胁表达",
        });
        break;
      }
    }
  }

  return hits;
}

function safeMatch(pattern: string, patternType: string, text: string) {
  if (patternType === "contains") {
    const idx = text.toLowerCase().indexOf(pattern.toLowerCase());
    return idx >= 0 ? text.slice(idx, idx + pattern.length) : null;
  }
  try {
    const regex = new RegExp(pattern, "i");
    const m = text.match(regex);
    return m?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function ensureDefaultContentRuleConfigs() {
  const delegate = getRuleConfigDelegate();
  if (!delegate) return;
  const scopes = Object.keys(DEFAULT_RULE_CONFIGS) as Array<keyof typeof DEFAULT_RULE_CONFIGS>;
  for (const scope of scopes) {
    for (const rule of DEFAULT_RULE_CONFIGS[scope]) {
      await delegate.upsert({
        where: { scope_ruleCode: { scope, ruleCode: rule.ruleCode } },
        update: {},
        create: {
          scope,
          ruleCode: rule.ruleCode,
          enabled: true,
          action: rule.action as ContentRuleAction,
          severity: rule.severity,
          pattern: rule.pattern,
          patternType: rule.patternType,
          description: rule.description,
          sortOrder: rule.sortOrder,
        },
      }).catch(() => null);
    }
  }
}

export async function evaluateContentRulesConfigured(input: EvaluateInput): Promise<RuleHit[]> {
  const delegate = getRuleConfigDelegate();
  if (!delegate) return evaluateContentRules(input);

  try {
    await ensureDefaultContentRuleConfigs();
    const configs = await delegate.findMany({
      where: { scope: input.scope, enabled: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { ruleCode: true, action: true, severity: true, pattern: true, patternType: true, description: true },
    });
    if (configs.length === 0) return evaluateContentRules(input);

    const text = input.text || "";
    const hits: RuleHit[] = [];
    for (const rule of configs) {
      const matchedText = safeMatch(rule.pattern, rule.patternType, text);
      if (!matchedText) continue;
      hits.push({
        ruleCode: rule.ruleCode,
        action: rule.action,
        severity: (rule.severity as RuleHit["severity"]) || "MEDIUM",
        matchedText,
        note: rule.description || `规则命中：${rule.ruleCode}`,
      });
    }
    return hits;
  } catch (error) {
    console.warn("Content rule config fallback to default rules", error);
    return evaluateContentRules(input);
  }
}

export async function persistContentRuleHits(input: EvaluateInput, hits: RuleHit[]) {
  if (!hits.length) return;
  const delegate = getRuleEventDelegate();
  if (!delegate) return;
  await delegate.createMany({
    data: hits.map((h) => ({
      scope: input.scope,
      action: h.action,
      ruleCode: h.ruleCode,
      severity: h.severity,
      matchedText: h.matchedText ?? null,
      note: h.note,
      actorUserId: input.actorUserId ?? null,
      caseId: input.caseId ?? null,
      bidId: input.bidId ?? null,
      conversationId: input.conversationId ?? null,
    })),
  }).catch((error) => {
    console.warn("Content rule event persistence skipped", error);
  });
}

export function summarizeRuleHits(hits: RuleHit[]) {
  return {
    hasBlock: hits.some((h) => h.action === "BLOCK"),
    hasReview: hits.some((h) => h.action === "REVIEW"),
    warnings: hits.filter((h) => h.action === "WARN" || h.action === "REVIEW").map((h) => h.note),
    hits,
  };
}
