/**
 * Docuseal API 封装
 * 文档：https://www.docuseal.com/docs/api
 *
 * 使用 Docuseal Cloud（https://api.docuseal.com）或自托管实例。
 * 通过 DOCUSEAL_API_URL 环境变量切换。
 * 注意：api.docuseal.com 的路径不带 /api 前缀（如 /templates、/submissions）
 */

import crypto from "crypto";

const API_BASE = process.env.DOCUSEAL_API_URL ?? "https://api.docuseal.com";
const API_KEY = process.env.DOCUSEAL_API_KEY ?? "";

/** 通用请求封装 */
async function docusealFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "X-Auth-Token": API_KEY,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Docuseal ${options.method ?? "GET"} ${path} failed [${res.status}]: ${text}`);
  }

  // 二进制响应（下载 PDF）
  if ((options as { _raw?: boolean })._raw) {
    return res as unknown as T;
  }

  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocusealSubmitter {
  email: string;
  name: string;
  role: string;         // 需与 template 中的 role 名称对应
  send_email?: boolean; // false = 只用 embed token，不发邮件
}

interface CreateSubmissionResult {
  submissionId: number;
  /** attorney（第一个 submitter）的 embed token */
  attorneyToken: string;
  attorneySubmitterId: string;
  /** client（第二个 submitter）的 embed token */
  clientToken: string;
  clientSubmitterId: string;
}

/**
 * Docuseal POST /submissions 返回的是 submitter 对象数组，
 * 每个元素包含 submission_id（所有元素相同）以及各自的签名 token。
 */
type DocusealSubmissionResponse = Array<{
  id: number;              // submitter ID
  submission_id: number;  // submission ID（所有 submitter 相同）
  slug: string;           // embed token（用于内嵌签名界面）
  embed_src: string;      // 完整 embed URL，如 https://docuseal.com/s/{slug}
  role: string;
  name: string;
  email: string;
  status: string;
  completed_at?: string | null;
}>;

interface DocusealTemplateResponse {
  id: number;
  name: string;
  slug: string;
}

// ─── Template ─────────────────────────────────────────────────────────────────

/**
 * 将 HTML 内容上传为 Docuseal Template
 * 返回 templateId（字符串形式的 number）
 *
 * Docuseal API: POST /templates/html
 */
export async function createTemplateFromHtml(
  html: string,
  name: string
): Promise<string> {
  const data = await docusealFetch<DocusealTemplateResponse>(
    "/templates/html",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        html,
        // 不定义 schema 字段时 Docuseal 自动识别 {{role:field}} 标记
      }),
    }
  );
  return String(data.id);
}

// ─── Submission ───────────────────────────────────────────────────────────────

/**
 * 创建签名请求（Submission）
 * 两个 submitter：律师先签（attorney），客户后签（client），顺序签署
 *
 * Docuseal API: POST /submissions
 */
export async function createSubmission(
  templateId: string,
  attorney: { name: string; email: string },
  client: { name: string; email: string }
): Promise<CreateSubmissionResult> {
  const submitters: DocusealSubmitter[] = [
    {
      role: "Attorney",
      name: attorney.name,
      email: attorney.email,
      send_email: false, // 使用 embed token，不发系统邮件
    },
    {
      role: "Client",
      name: client.name,
      email: client.email,
      send_email: false,
    },
  ];

  // POST /submissions 返回 submitter 数组（每个 submitter 一条）
  const data = await docusealFetch<DocusealSubmissionResponse>(
    "/submissions",
    {
      method: "POST",
      body: JSON.stringify({
        template_id: Number(templateId),
        send_email: false,
        submitters,
        // 顺序签署：按 submitters 数组顺序
        order: "preserved",
      }),
    }
  );

  // 按 role 查找对应的 submitter（大小写不敏感）
  const atty = data.find((s) => s.role.toLowerCase() === "attorney");
  const cli  = data.find((s) => s.role.toLowerCase() === "client");

  if (!atty || !cli) {
    throw new Error(
      `Docuseal submission missing expected submitters. Got roles: ${data.map((s) => s.role).join(", ")}`
    );
  }

  return {
    submissionId: atty.submission_id,   // 所有 submitter 的 submission_id 相同
    attorneyToken: atty.slug,
    attorneySubmitterId: String(atty.id),
    clientToken: cli.slug,
    clientSubmitterId: String(cli.id),
  };
}

// ─── Void ─────────────────────────────────────────────────────────────────────

/**
 * 作废签名请求
 * Docuseal API: DELETE /submissions/:id
 */
export async function voidSubmission(submissionId: string): Promise<void> {
  await docusealFetch(`/submissions/${submissionId}`, {
    method: "DELETE",
  });
}

// ─── Download PDF ─────────────────────────────────────────────────────────────

/**
 * 下载签名完成后的 PDF（ArrayBuffer）
 * Docuseal API: GET /submissions/:id/download
 */
export async function downloadSignedPdf(submissionId: string): Promise<Buffer> {
  const res = await fetch(
    `${API_BASE}/submissions/${submissionId}/download`,
    {
      headers: { "X-Auth-Token": API_KEY },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to download PDF for submission ${submissionId}: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── Embed URL ────────────────────────────────────────────────────────────────

/**
 * 生成 Docuseal 嵌入式签名 URL
 * 前端 <DocusealForm> 直接用 token（slug）即可
 */
export function getEmbedSrc(token: string): string {
  return `${API_BASE}/s/${token}`;
}

// ─── Webhook Verification ─────────────────────────────────────────────────────

/**
 * 验证 Docuseal Webhook 签名（HMAC-SHA256）
 * Header: x-docuseal-signature
 */
export function verifyWebhookSignature(
  rawBody: string,
  secret: string,
  headerSignature: string
): boolean {
  if (!secret || !headerSignature) return false;
  try {
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(hmac, "hex"),
      Buffer.from(headerSignature, "hex")
    );
  } catch {
    return false;
  }
}

// ─── Docuseal Event Types ─────────────────────────────────────────────────────

export interface DocusealWebhookEvent {
  event_type: "form.completed" | "submission.completed" | "form.viewed" | string;
  timestamp: string;
  data: {
    id: number;                    // submission ID (for submission events) or submitter ID
    submission_id?: number;        // for form events
    status: string;
    email?: string;
    name?: string;
    role?: string;
    slug?: string;
    completed_at?: string;
    submitters?: Array<{
      id: number;
      email: string;
      name: string;
      role: string;
      slug: string;
      status: string;
      completed_at?: string;
    }>;
    documents?: Array<{
      url: string;
      name: string;
    }>;
  };
}
