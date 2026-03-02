// ─── DIY 法律文书类型定义 ─────────────────────────────────────────────────────

export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "number"
  | "select"
  | "email"
  | "phone"
  | "money"
  | "state";

export interface SelectOption {
  value: string;
  label: string;
  labelZh: string;
}

export interface FormField {
  /** 字段 ID，同时用于文书模板中的 {{field_id}} 占位符 */
  id: string;
  type: FieldType;
  label: string;
  labelZh: string;
  placeholder?: string;
  placeholderZh?: string;
  required?: boolean;
  options?: SelectOption[];      // 仅 select 类型使用
  helpText?: string;
  helpTextZh?: string;
  colSpan?: 1 | 2;               // 表单布局：1=半宽, 2=全宽 (default 1)
}

export interface FormStep {
  id: string;
  title: string;      // English step title
  titleZh: string;    // Chinese step title
  description?: string;
  descriptionZh?: string;
  fields: FormField[];
}

export interface FormDocument {
  title: string;      // English document title
  titleZh: string;    // Chinese document title
  /** HTML 文书模板，支持 {{field_id}} 和 {{current_date}} 占位符 */
  htmlContent: string;
  disclaimer?: string;
  disclaimerZh?: string;
}

/** 存储在 LegalFormTemplate.config (JSON) 中的完整配置 */
export interface FormConfig {
  steps: FormStep[];
  document: FormDocument;
}

/** API 返回的模板摘要（列表页） */
export interface FormTemplateSummary {
  id: string;
  slug: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  category: string;
  isPremium: boolean;
  isFeatured: boolean;
  estimatedMinutes: number;
  useCount: number;
}

/** API 返回的模板详情（包含 config） */
export interface FormTemplateDetail extends FormTemplateSummary {
  config: FormConfig;
}

/** 用户填写的表单数据 */
export type FormData = Record<string, string>;
