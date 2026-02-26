import { z } from "zod";
import { LANGUAGES, LEGAL_CATEGORIES, URGENCY_LEVELS } from "../types/case-form";

export const BUDGET_RANGES = ["any", "under_1k", "1k_5k", "5k_10k", "10k_30k", "over_30k"] as const;
export type BudgetRange = (typeof BUDGET_RANGES)[number];

export const caseSubmissionSchema = z.object({
  category: z.enum(LEGAL_CATEGORIES),
  stateCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Please enter a valid 2-letter US state code.")
    .transform((value) => value.toUpperCase()),
  zipCode: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid US ZIP code / 请输入5位邮政编码。"),
  description: z
    .string()
    .trim()
    .min(10, "Please provide at least 10 characters / 请至少输入10个字符。"),
  urgency: z.enum(URGENCY_LEVELS),
  preferredLanguage: z.enum(LANGUAGES),
  title: z.string().trim().min(2, "Please provide a case title / 请输入案件标题。"),
  contactPhone: z
    .string()
    .trim()
    .min(7, "请填写手机号（至少7位）/ Phone number required (min 7 digits)."),
  contactEmail: z
    .string()
    .trim()
    .min(1, "请填写联系邮箱 / Contact email is required.")
    .email("请填写有效邮箱 / Please enter a valid email address."),
  budgetRange: z.enum(BUDGET_RANGES).optional(),
});

export type CaseSubmissionValues = z.infer<typeof caseSubmissionSchema>;
