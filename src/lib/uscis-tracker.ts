/**
 * USCIS 案件追踪核心库
 *
 * 功能：
 *   - 收据号格式校验（13~15 位，3 字母 + 数字）
 *   - 通过 USCIS eGov 门户查询案件状态（服务端 fetch）
 *   - 状态分类（PENDING / ACTION / ALERT / APPROVED / COMPLETE）
 *   - 状态中英互译标题
 */

export type USCISStatusCategory = "PENDING" | "ACTION" | "ALERT" | "APPROVED" | "COMPLETE";

export interface USCISStatusResult {
  receiptNumber: string;
  status: string;          // 英文状态标题，如 "Case Was Received"
  statusZh: string;        // 中文状态标题
  statusBody: string;      // USCIS 原始说明文本
  category: USCISStatusCategory;
  checkedAt: string;       // ISO 时间戳
  error?: string;          // 抓取失败时的错误信息
}

// ─── 收据号校验 ────────────────────────────────────────────────────────────────

const RECEIPT_REGEX = /^[A-Za-z]{3}\d{10,11}$/;

const VALID_CENTERS = new Set([
  "LIN", "SRC", "EAC", "WAC", "IOE", "MSC", "NBC", "VSC", "TSC",
  // 特殊中心
  "YSC", "ZLA",
]);

export function validateReceiptNumber(receipt: string): { valid: boolean; error?: string } {
  const clean = receipt.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!RECEIPT_REGEX.test(clean)) {
    return {
      valid: false,
      error: "收据号格式错误。正确格式：3 个字母 + 10~11 位数字，如 LIN2401234567",
    };
  }
  const center = clean.slice(0, 3);
  if (!VALID_CENTERS.has(center)) {
    return {
      valid: false,
      error: `未知的服务中心代码"${center}"，请核实收据号`,
    };
  }
  return { valid: true };
}

export function normalizeReceiptNumber(receipt: string): string {
  return receipt.trim().toUpperCase().replace(/[\s-]/g, "");
}

/** 根据收据号前缀推断服务中心名称 */
export function getServiceCenter(receipt: string): string {
  const center = normalizeReceiptNumber(receipt).slice(0, 3);
  const centers: Record<string, string> = {
    LIN: "Nebraska Service Center",
    SRC: "Texas Service Center",
    EAC: "Vermont Service Center",
    WAC: "California Service Center",
    IOE: "USCIS Online (Potomac)",
    MSC: "National Benefits Center",
    NBC: "National Benefits Center",
    VSC: "Vermont Service Center",
    TSC: "Texas Service Center",
  };
  return centers[center] ?? center;
}

// ─── 状态分类 ──────────────────────────────────────────────────────────────────

/**
 * 常见状态标题 → 分类 + 中文翻译
 *
 * USCIS 实际状态文本每次可能略有变化，使用关键词匹配而非完全相等
 */
interface StatusMapping {
  keywords: string[];       // 全小写关键词
  category: USCISStatusCategory;
  zh: string;
}

const STATUS_MAPPINGS: StatusMapping[] = [
  // ALERT - 需要立即关注
  { keywords: ["request for evidence"],               category: "ALERT",    zh: "收到补件通知（RFE）" },
  { keywords: ["notice of intent to deny"],           category: "ALERT",    zh: "收到拟拒绝通知（NOID）" },
  { keywords: ["denied"],                             category: "ALERT",    zh: "案件被拒绝" },
  { keywords: ["rejected"],                           category: "ALERT",    zh: "案件被退回" },
  { keywords: ["terminated"],                         category: "ALERT",    zh: "案件已终止" },
  { keywords: ["revoked"],                            category: "ALERT",    zh: "批准已撤销" },
  { keywords: ["abandoned"],                          category: "ALERT",    zh: "案件已视为放弃" },
  { keywords: ["referred to national security"],      category: "ALERT",    zh: "转至国家安全部门审查" },

  // ACTION - 需要行动
  { keywords: ["interview was scheduled"],            category: "ACTION",   zh: "面谈已安排" },
  { keywords: ["biometrics appointment"],             category: "ACTION",   zh: "指纹预约通知已寄出" },
  { keywords: ["rfe response"],                       category: "ACTION",   zh: "已收到补件回复" },
  { keywords: ["noid response"],                      category: "ACTION",   zh: "已收到 NOID 回复" },
  { keywords: ["ready to be scheduled"],              category: "ACTION",   zh: "待安排面谈" },

  // APPROVED - 批准
  { keywords: ["approved"],                           category: "APPROVED", zh: "案件已批准 ✅" },
  { keywords: ["oath ceremony"],                      category: "APPROVED", zh: "宣誓仪式已安排（入籍即将完成）" },
  { keywords: ["naturalized"],                        category: "APPROVED", zh: "归化完成 🎉" },

  // COMPLETE - 已完成
  { keywords: ["card was mailed"],                    category: "COMPLETE", zh: "证件已邮寄" },
  { keywords: ["card was delivered"],                 category: "COMPLETE", zh: "证件已送达" },
  { keywords: ["card was produced"],                  category: "COMPLETE", zh: "证件正在制作" },
  { keywords: ["document was mailed"],                category: "COMPLETE", zh: "文件已邮寄" },
  { keywords: ["travel document"],                    category: "COMPLETE", zh: "旅行证件已寄出" },
  { keywords: ["case closed"],                        category: "COMPLETE", zh: "案件已关闭" },

  // ACTION - 转移状态
  { keywords: ["transferred"],                        category: "ACTION",   zh: "案件已转移至其他办公室" },
  { keywords: ["reopened"],                           category: "PENDING",  zh: "案件已重新开启" },
  { keywords: ["reopen"],                             category: "PENDING",  zh: "案件已重新开启" },

  // PENDING - 正常处理
  { keywords: ["received"],                           category: "PENDING",  zh: "案件已收到" },
  { keywords: ["under review"],                       category: "PENDING",  zh: "案件审查中" },
  { keywords: ["pending"],                            category: "PENDING",  zh: "案件处理中" },
  { keywords: ["being processed"],                    category: "PENDING",  zh: "案件处理中" },
];

export function classifyUSCISStatus(statusTitle: string): { category: USCISStatusCategory; zh: string } {
  const lower = statusTitle.toLowerCase();
  for (const mapping of STATUS_MAPPINGS) {
    if (mapping.keywords.some((kw) => lower.includes(kw))) {
      return { category: mapping.category, zh: mapping.zh };
    }
  }
  return { category: "PENDING", zh: statusTitle }; // 无法识别时返回原文
}

// ─── USCIS 状态抓取 ────────────────────────────────────────────────────────────

/**
 * 从 USCIS eGov 门户查询案件状态
 *
 * 使用官方公开的状态查询端点（与 uscis.gov 网页相同）
 * 注意：USCIS 可能对高频请求进行限流，生产环境建议增加缓存
 */
export async function fetchUSCISStatus(receiptNumber: string): Promise<USCISStatusResult> {
  const receipt = normalizeReceiptNumber(receiptNumber);
  const checkedAt = new Date().toISOString();

  try {
    const res = await fetch("https://egov.uscis.gov/casestatus/mycasestatus.do", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://egov.uscis.gov/casestatus/landing.do",
        "Origin": "https://egov.uscis.gov",
      },
      body: `appReceiptNum=${encodeURIComponent(receipt)}&initCaseSearch=CHECK+STATUS`,
      // 10 秒超时
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`USCIS 返回 HTTP ${res.status}`);
    }

    const html = await res.text();
    const parsed = parseUSCISHtml(html);

    if (!parsed) {
      // 解析失败 - 可能是 IP 被限流或页面结构变化
      return {
        receiptNumber: receipt,
        status: "Unable to fetch",
        statusZh: "无法自动获取状态",
        statusBody: "USCIS 网站暂时无法访问，请直接访问 uscis.gov 查询，或稍后再试。",
        category: "PENDING",
        checkedAt,
        error: "parse_failed",
      };
    }

    const { category, zh } = classifyUSCISStatus(parsed.status);
    return {
      receiptNumber: receipt,
      status: parsed.status,
      statusZh: zh,
      statusBody: parsed.body,
      category,
      checkedAt,
    };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    return {
      receiptNumber: receipt,
      status: "Unable to fetch",
      statusZh: "网络请求失败",
      statusBody: isTimeout
        ? "请求超时，USCIS 网站可能繁忙，请稍后再试或直接访问 uscis.gov 查询。"
        : "无法连接 USCIS 网站，请直接访问 uscis.gov 查询，或稍后重试。",
      category: "PENDING",
      checkedAt,
      error: isTimeout ? "timeout" : "network_error",
    };
  }
}

/** 解析 USCIS 返回的 HTML，提取状态标题和说明 */
function parseUSCISHtml(html: string): { status: string; body: string } | null {
  try {
    // 状态标题：<h4 class="text-center case-status-header">...</h4>
    const headerMatch = html.match(
      /<h4[^>]*class="[^"]*case-status-header[^"]*"[^>]*>([\s\S]*?)<\/h4>/i
    ) || html.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);

    if (!headerMatch) {
      // 收据号无效
      if (html.includes("Invalid receipt number")) {
        return { status: "Invalid Receipt Number", body: "收据号无效，请检查后重新输入。" };
      }
      return null;
    }

    const status = headerMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .trim();

    // 状态说明：状态头之后的 <p> 标签内容
    const bodyMatch = html.match(
      /<p[^>]*>\s*(On\s[\s\S]*?|We\s[\s\S]*?|Your\s[\s\S]*?)<\/p>/i
    ) || html.match(/case-status-header[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);

    let body = "";
    if (bodyMatch) {
      body = bodyMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    if (!status) return null;
    return { status, body };
  } catch {
    return null;
  }
}

// ─── 类型辅助 ──────────────────────────────────────────────────────────────────

/** 状态分类对应的 UI 标签和颜色 */
export const STATUS_CATEGORY_UI: Record<
  USCISStatusCategory,
  { label: string; labelEn: string; color: string; dot: string; bg: string; border: string }
> = {
  PENDING:  { label: "处理中",   labelEn: "Processing",   color: "text-slate-400",  dot: "bg-slate-400",   bg: "bg-slate-800/50",   border: "border-slate-600/40" },
  ACTION:   { label: "需关注",   labelEn: "Action",       color: "text-amber-400",  dot: "bg-amber-400",   bg: "bg-amber-900/20",   border: "border-amber-600/40" },
  ALERT:    { label: "需立即处理", labelEn: "Alert",      color: "text-red-400",    dot: "bg-red-400",     bg: "bg-red-900/20",     border: "border-red-600/40" },
  APPROVED: { label: "已批准",   labelEn: "Approved",     color: "text-green-400",  dot: "bg-green-400",   bg: "bg-green-900/20",   border: "border-green-600/40" },
  COMPLETE: { label: "已完成",   labelEn: "Complete",     color: "text-blue-400",   dot: "bg-blue-400",    bg: "bg-blue-900/20",    border: "border-blue-600/40" },
};

/** 应否立即通知（ALERT/ACTION 需要） */
export function isUrgentStatus(category: USCISStatusCategory): boolean {
  return category === "ALERT" || category === "ACTION";
}

/** 根据状态分类给出律师咨询建议 */
export function getAttorneyRecommendation(category: USCISStatusCategory): {
  show: boolean;
  message: string;
  caseCategory: string;
} {
  if (category === "ALERT") {
    return {
      show: true,
      message: "案件出现需立即关注的状态（如 RFE、拒绝通知），建议立即咨询移民律师",
      caseCategory: "IMMIGRATION",
    };
  }
  if (category === "ACTION") {
    return {
      show: true,
      message: "案件有新进展（面谈/指纹预约等），如有疑问可咨询移民律师",
      caseCategory: "IMMIGRATION",
    };
  }
  return { show: false, message: "", caseCategory: "IMMIGRATION" };
}
