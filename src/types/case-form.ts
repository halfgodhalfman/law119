export const LEGAL_CATEGORIES = [
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
] as const;

export const LANGUAGES = ["MANDARIN", "ENGLISH"] as const;
export const URGENCY_LEVELS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export type LegalCategory = (typeof LEGAL_CATEGORIES)[number];
export type Language = (typeof LANGUAGES)[number];
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export type CreateCaseInput = {
  category: LegalCategory;
  stateCode: string;
  zipCode: string;
  description: string;
  urgency: UrgencyLevel;
  preferredLanguage: Language;
  title: string;
};
