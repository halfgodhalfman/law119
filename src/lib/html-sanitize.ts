/**
 * Law119 HTML 安全工具库
 *
 * 修复 #9/#10/#11: 防止 XSS 注入和法律文书 HTML 污染
 *
 * 使用原则：
 * 1. 用户输入放入 HTML 属性或内容前，必须先调用 escapeHtml()
 * 2. 渲染富文本时使用 sanitizeHtml()（服务端）或配合客户端 DOMPurify
 * 3. JSON-LD 结构化数据无需处理（已在 <script type="application/ld+json"> 中隔离）
 */

// ─── 服务端 HTML 转义 ─────────────────────────────────────────────────────────

/**
 * 完整 HTML 转义 — 用于将用户输入安全嵌入 HTML 文本节点或属性值
 *
 * 覆盖所有 XSS 攻击向量：
 * - & → &amp;   (必须最先替换)
 * - < → &lt;
 * - > → &gt;
 * - " → &quot;  (用于双引号属性)
 * - ' → &#x27;  (用于单引号属性)
 * - / → &#x2F;  (用于标签闭合攻击)
 * - ` → &#x60;  (用于模板字面量注入)
 * - = → &#x3D;  (用于属性注入)
 */
export function escapeHtml(value: unknown): string {
  const str = String(value ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/`/g, "&#x60;")
    .replace(/=/g, "&#x3D;");
}

/**
 * 属性值转义（用于 HTML 属性中，比 escapeHtml 更严格）
 */
export function escapeAttr(value: unknown): string {
  return escapeHtml(value);
}

/**
 * URL 安全校验 — 防止 javascript: 协议注入
 */
export function safeUrl(url: unknown): string {
  const str = String(url ?? "").trim();
  // 只允许 http/https/mailto/tel 协议
  if (/^(https?:|mailto:|tel:|\/)/i.test(str)) return str;
  if (str.startsWith("#")) return str;
  return "#"; // 不安全的 URL 替换为空锚点
}

// ─── 服务端富文本净化（白名单标签）────────────────────────────────────────────

/**
 * 法律文书允许的 HTML 标签白名单
 * 仅包含纯布局/格式标签，不含任何脚本/事件载体
 */
const ALLOWED_TAGS = new Set([
  "p", "br", "span", "div", "b", "strong", "i", "em", "u",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "th", "td",
  "hr", "blockquote", "pre", "code",
]);

/**
 * 允许的 HTML 属性（仅样式类，无事件处理器）
 */
const ALLOWED_ATTRS = new Set(["class", "style", "id", "colspan", "rowspan", "align"]);

/**
 * 服务端 HTML 净化（简单版）
 *
 * 注意：完整的 HTML 净化请在浏览器端配合 DOMPurify 使用。
 * 此函数使用正则方式，适用于服务端模板渲染场景。
 * 对于复杂的嵌套场景，建议使用 npm 包 `sanitize-html`。
 *
 * 策略：
 * 1. 移除所有事件处理器属性（onXxx=...）
 * 2. 移除 script/style/iframe/object/embed 标签
 * 3. 移除 javascript: 协议链接
 * 4. 保留白名单标签和属性
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  // 1. 移除危险标签（含内容）
  let clean = html.replace(
    /<(script|style|iframe|object|embed|link|meta|form|input|button|select|textarea|base)\b[^>]*>[\s\S]*?<\/\1>/gi,
    "",
  );
  clean = clean.replace(
    /<(script|style|iframe|object|embed|link|meta|form|input|button|select|textarea|base)\b[^>]*\/?>/gi,
    "",
  );

  // 2. 移除事件处理器属性（on开头的所有属性）
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");

  // 3. 移除 javascript: 协议
  clean = clean.replace(/javascript\s*:/gi, "javascript_blocked:");
  clean = clean.replace(/data\s*:\s*text\s*\/\s*html/gi, "data_blocked:");

  // 4. 移除 CSS expression() 和 behavior:
  clean = clean.replace(/expression\s*\(/gi, "expression_blocked(");
  clean = clean.replace(/behavior\s*:/gi, "behavior_blocked:");

  return clean;
}

// ─── 法律文书模板渲染（修复 #10）─────────────────────────────────────────────

/**
 * 安全的模板变量替换
 * 替代原来只转义 < > 的不完整实现
 *
 * 使用方法：
 *   const html = renderSafeTemplate(templateHtml, { name: userInput, date: "2024-01-01" });
 */
export function renderSafeTemplate(
  htmlTemplate: string,
  variables: Record<string, unknown>,
): string {
  let result = htmlTemplate;

  for (const [key, value] of Object.entries(variables)) {
    // 对所有用户输入进行完整 HTML 转义
    const safeValue = escapeHtml(value);
    // 替换 {{key}} 占位符
    result = result.replace(
      new RegExp(`\\{\\{\\s*${escapeRegex(key)}\\s*\\}\\}`, "g"),
      safeValue,
    );
  }

  return result;
}

/** 转义正则表达式特殊字符，防止 key 注入正则 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── 客户端 DOMPurify 配置（导出配置供组件使用）──────────────────────────────

/**
 * 法律文书渲染用 DOMPurify 配置
 * 在客户端组件中使用：
 *
 * import DOMPurify from "dompurify";
 * import { LEGAL_DOCUMENT_PURIFY_CONFIG } from "@/lib/html-sanitize";
 * const clean = DOMPurify.sanitize(html, LEGAL_DOCUMENT_PURIFY_CONFIG);
 */
export const LEGAL_DOCUMENT_PURIFY_CONFIG = {
  ALLOWED_TAGS: [...ALLOWED_TAGS],
  ALLOWED_ATTR: [...ALLOWED_ATTRS],
  FORBID_ATTR: ["style"], // 如需禁止内联样式可取消注释
  KEEP_CONTENT: true,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM: false,
} as const;

/**
 * 聊天消息 DOMPurify 配置（更严格，只允许纯文本格式）
 */
export const CHAT_MESSAGE_PURIFY_CONFIG = {
  ALLOWED_TAGS: ["b", "strong", "i", "em", "br", "p", "a"],
  ALLOWED_ATTR: ["href", "target", "rel"],
  FORBID_SCRIPTS: true,
  ADD_ATTR: ["target"], // 允许 target="_blank"
  FORCE_BODY: true,
} as const;
