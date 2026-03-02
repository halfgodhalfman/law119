/**
 * 聘用协议（Engagement Letter）HTML 生成器
 *
 * 根据 EngagementConfirmation 数据渲染双语（中英文）法律聘用协议。
 * 输出的 HTML 将被上传到 Docuseal 作为签名文件模板。
 *
 * Docuseal 签名字段标记：{{Attorney:signature}} {{Client:signature}}
 * 这告诉 Docuseal 在哪里插入签名控件。
 */

import type { Decimal } from "@prisma/client/runtime/library";

// 与 Prisma EngagementConfirmation 字段对齐的轻量 DTO
export interface EngagementLetterData {
  id: string;
  createdAt: Date;
  serviceScopeSummary: string;
  stagePlan?: string | null;
  serviceBoundary: string;
  feeMode: string;
  feeAmountMin?: Decimal | null;
  feeAmountMax?: Decimal | null;
  includesConsultation: boolean;
  includesCourtAppearance: boolean;
  includesTranslation: boolean;
  includesDocumentFiling: boolean;
  nonLegalAdviceAck: boolean;
  noAttorneyClientRelationshipAck: boolean;
  attorneyConflictChecked: boolean;
  attorneyConflictCheckNote?: string | null;
  // 律师信息
  attorney: {
    firstName?: string | null;
    lastName?: string | null;
    firmName?: string | null;
    barState?: string | null;
    barNumber?: string | null;
    email?: string | null;
  };
  // 客户信息
  client: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  /**
   * 修复 #13: Referral Fee 披露
   * 若本案涉及律师转介绍费，必须以书面形式告知客户（各州律师职业行为规则要求）。
   * 例如 CA Rules of Professional Conduct Rule 1.5.1，ABA Model Rule 1.5(e)。
   * 当 feeMode !== "NONE" 时此字段应存在。
   */
  referralFee?: {
    /** 来源律师姓名（referrer attorney name） */
    referrerAttorneyName: string;
    /** 费用模式：PERCENTAGE | FIXED | NONE */
    feeMode: string;
    /** 百分比（feeMode === "PERCENTAGE" 时使用） */
    feePercent?: number | null;
    /** 固定金额（feeMode === "FIXED" 时使用） */
    feeAmount?: number | null;
    /** 其他说明 */
    feeNote?: string | null;
    /** 客户已被告知（attorney attestation） */
    clientDisclosureAck: boolean;
    /** 利益冲突核查已完成 */
    conflictCheckDone: boolean;
    /** 律师已确认符合所在州律师行规 */
    barRuleAck: boolean;
  } | null;
}

// ─── 辅助函数 ─────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatFee(engagement: EngagementLetterData): string {
  const { feeMode, feeAmountMin, feeAmountMax } = engagement;
  const min = feeAmountMin ? Number(feeAmountMin).toLocaleString("en-US", { style: "currency", currency: "USD" }) : null;
  const max = feeAmountMax ? Number(feeAmountMax).toLocaleString("en-US", { style: "currency", currency: "USD" }) : null;

  switch (feeMode) {
    case "HOURLY":
      return min ? `${min}/hour (Hourly · 按小时计费)` : "Hourly rate (to be agreed)";
    case "FLAT":
      return min ? `${min} flat fee (Fixed · 固定费用)` : "Flat fee (to be agreed)";
    case "CONTINGENCY":
      return "Contingency fee (按结果收费 · 胜诉分成)";
    case "RETAINER":
      return min ? `${min} retainer (Retainer · 预付顾问费)` : "Retainer fee (to be agreed)";
    case "CUSTOM":
    default:
      if (min && max) return `${min} – ${max} (Estimated range · 预估区间)`;
      if (min) return `${min} (Estimated · 预估)`;
      return "Fee to be discussed (待商议)";
  }
}

function serviceBoundaryLabel(boundary: string): string {
  const map: Record<string, string> = {
    CONSULTATION: "Legal Consultation · 法律咨询",
    DOCUMENT_PREP: "Document Preparation · 文件准备",
    COURT_APPEARANCE: "Court Appearance · 出庭代理",
    FULL_REPRESENTATION: "Full Legal Representation · 全程代理",
    CUSTOM: "Custom Services · 定制服务",
  };
  return map[boundary] ?? boundary;
}

/**
 * 修复 #13: 渲染 Referral Fee 披露条款 HTML
 *
 * 当本案涉及律师转介绍费（referral fee）时，生成完整的书面披露条款。
 * 这是 ABA Model Rule 1.5(e) 和各州律师职业行为规则的强制要求：
 *   - 转介绍费必须书面告知客户
 *   - 客户须同意此安排
 *   - 总费用不得因转介绍而增加
 *
 * 此函数生成插入到 Engagement Letter 第 3 节（收费）之后的独立章节。
 */
function generateReferralFeeSection(referralFee: NonNullable<EngagementLetterData["referralFee"]>): string {
  let feeDescription = "";
  if (referralFee.feeMode === "PERCENTAGE" && referralFee.feePercent != null) {
    feeDescription = `${referralFee.feePercent}% of total attorney fees earned (总律师费的 ${referralFee.feePercent}%)`;
  } else if (referralFee.feeMode === "FIXED" && referralFee.feeAmount != null) {
    const formatted = referralFee.feeAmount.toLocaleString("en-US", { style: "currency", currency: "USD" });
    feeDescription = `Fixed amount: ${formatted} (固定金额：${formatted})`;
  } else {
    feeDescription = "Amount to be agreed between attorneys (金额由双方律师另行约定)";
  }

  const noteHtml = referralFee.feeNote
    ? `<tr><td>Additional Notes · 补充说明</td><td>${escapeHtml(referralFee.feeNote)}</td></tr>`
    : "";

  const complianceItems: string[] = [];
  if (referralFee.clientDisclosureAck) {
    complianceItems.push("Client has been notified of this referral fee arrangement as required by applicable Rules of Professional Conduct. (客户已依律师职业行为规则被告知此转介绍费安排。)");
  }
  if (referralFee.conflictCheckDone) {
    complianceItems.push("Both attorneys have completed a conflict-of-interest check. (双方律师均已完成利益冲突核查。)");
  }
  if (referralFee.barRuleAck) {
    complianceItems.push("Both attorneys confirm compliance with their respective state bar referral fee rules. (双方律师确认遵守各自所在州律师协会关于转介绍费的规定。)");
  }

  return `
<h2>3b. Referral Fee Disclosure · 转介绍费披露</h2>
<div class="disclaimer" style="background:#fff3e0;border-color:#ffb74d;color:#5d4037;">
  <strong>⚠ Mandatory Disclosure · 法定披露义务：</strong><br>
  Pursuant to ABA Model Rule 1.5(e) and applicable state bar rules, the Client is hereby notified that
  a referral fee arrangement exists between the attorneys involved in this matter.
  This fee is paid between attorneys and does NOT increase the total fees charged to the Client.
  依据美国律师协会职业行为示范规则第 1.5(e) 条及相关州律师协会规定，现特此告知客户：
  本案涉及律师间转介绍费安排。该费用由律师双方承担，<strong>不增加</strong>客户所支付的总费用。
</div>
<table>
  <tr>
    <td>Referring Attorney · 来源律师</td>
    <td>${escapeHtml(referralFee.referrerAttorneyName)}</td>
  </tr>
  <tr>
    <td>Referral Fee Amount · 转介绍费金额</td>
    <td>${feeDescription}</td>
  </tr>
  <tr>
    <td>Fee Arrangement Type · 费用类型</td>
    <td>${referralFee.feeMode === "PERCENTAGE" ? "Percentage of earned fees · 按律师费比例" : referralFee.feeMode === "FIXED" ? "Fixed amount · 固定金额" : "None / Not applicable · 无"}</td>
  </tr>
  ${noteHtml}
</table>

${complianceItems.length > 0 ? `
<h3>Attorney Compliance Attestation · 律师合规声明</h3>
<ul>
  ${complianceItems.map((item) => `<li>${item}</li>`).join("\n")}
</ul>` : ""}

<p style="font-size:12px;color:#777;">
  <em>
    By signing this Engagement Letter, the Client acknowledges receipt of this Referral Fee Disclosure
    and consents to the referral fee arrangement described above, as required by applicable professional
    conduct rules. The total fees payable by the Client remain as stated in Section 3 above.
    客户签署本协议即表示已收到并理解上述转介绍费披露信息，并同意前述转介绍费安排，
    客户应付的总费用仍以第 3 节所述金额为准，不因转介绍费而增加。
  </em>
</p>`;
}

// ─── HTML 生成 ────────────────────────────────────────────────────────────────

export function generateEngagementLetterHtml(data: EngagementLetterData): string {
  const attorneyName = [data.attorney.firstName, data.attorney.lastName]
    .filter(Boolean).join(" ") || "Attorney";
  const clientName = [data.client.firstName, data.client.lastName]
    .filter(Boolean).join(" ") || "Client";
  const firmName = data.attorney.firmName || "";
  const dateStr = formatDate(data.createdAt);
  const feeStr = formatFee(data);
  const serviceLabel = serviceBoundaryLabel(data.serviceBoundary);

  // 修复 #13: 有转介绍费时插入独立的 referral fee 披露章节
  const referralFeeHtml = (data.referralFee && data.referralFee.feeMode !== "NONE")
    ? generateReferralFeeSection(data.referralFee)
    : "";

  const includes: string[] = [];
  if (data.includesConsultation) includes.push("Legal consultation (法律咨询)");
  if (data.includesCourtAppearance) includes.push("Court appearance (出庭代理)");
  if (data.includesTranslation) includes.push("Translation/interpretation (翻译服务)");
  if (data.includesDocumentFiling) includes.push("Document filing (文件递交)");

  const conflictNote = data.attorneyConflictChecked
    ? `Attorney has reviewed for conflicts of interest and confirmed none exist.${data.attorneyConflictCheckNote ? ` Note: ${data.attorneyConflictCheckNote}` : ""}`
    : "Conflict of interest check pending.";

  const stagePlanHtml = data.stagePlan
    ? `<h3 style="margin:16px 0 8px;">Service Stages · 服务阶段</h3>
       <pre style="background:#f8f9fa;padding:12px;border-radius:4px;font-size:13px;white-space:pre-wrap;">${escapeHtml(data.stagePlan)}</pre>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attorney-Client Engagement Letter · 律师聘用协议</title>
  <style>
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 14px;
      line-height: 1.8;
      color: #1a1a1a;
      max-width: 780px;
      margin: 0 auto;
      padding: 40px 50px;
    }
    h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
    .subtitle { text-align: center; font-size: 13px; color: #555; margin-bottom: 32px; }
    h2 { font-size: 15px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin: 24px 0 12px; }
    h3 { font-size: 14px; margin: 16px 0 8px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    td { padding: 6px 10px; vertical-align: top; }
    td:first-child { width: 38%; font-weight: bold; color: #444; }
    .disclaimer {
      background: #fff8e1;
      border: 1px solid #ffe082;
      border-radius: 4px;
      padding: 12px 16px;
      font-size: 12px;
      color: #5f4c00;
      margin: 20px 0;
    }
    .signature-section {
      margin-top: 40px;
      display: flex;
      gap: 40px;
    }
    .sig-block {
      flex: 1;
      border-top: 1px solid #333;
      padding-top: 8px;
    }
    .sig-block p { margin: 4px 0; font-size: 13px; color: #444; }
    ul { margin: 8px 0; padding-left: 20px; }
    li { margin-bottom: 4px; }
    .page-footer {
      margin-top: 40px;
      text-align: center;
      font-size: 11px;
      color: #999;
      border-top: 1px solid #eee;
      padding-top: 12px;
    }
  </style>
</head>
<body>

<h1>Attorney-Client Engagement Letter</h1>
<p class="subtitle">律师-客户聘用协议 &nbsp;|&nbsp; Law119 &nbsp;|&nbsp; ${dateStr}</p>

<h2>1. Parties · 协议各方</h2>
<table>
  <tr>
    <td>Attorney · 律师</td>
    <td>${escapeHtml(attorneyName)}${firmName ? ` (${escapeHtml(firmName)})` : ""}</td>
  </tr>
  ${data.attorney.barState && data.attorney.barNumber ? `
  <tr>
    <td>Bar License · 执照号</td>
    <td>${escapeHtml(data.attorney.barState)} Bar #${escapeHtml(data.attorney.barNumber)}</td>
  </tr>` : ""}
  ${data.attorney.email ? `
  <tr>
    <td>Attorney Email · 律师邮箱</td>
    <td>${escapeHtml(data.attorney.email)}</td>
  </tr>` : ""}
  <tr>
    <td>Client · 客户</td>
    <td>${escapeHtml(clientName)}</td>
  </tr>
  ${data.client.email ? `
  <tr>
    <td>Client Email · 客户邮箱</td>
    <td>${escapeHtml(data.client.email)}</td>
  </tr>` : ""}
  <tr>
    <td>Agreement Date · 签署日期</td>
    <td>${dateStr}</td>
  </tr>
  <tr>
    <td>Reference ID · 案件编号</td>
    <td>${data.id}</td>
  </tr>
</table>

<h2>2. Scope of Services · 服务范围</h2>
<table>
  <tr>
    <td>Service Type · 服务类型</td>
    <td>${serviceLabel}</td>
  </tr>
  <tr>
    <td>Description · 详细说明</td>
    <td>${escapeHtml(data.serviceScopeSummary)}</td>
  </tr>
</table>

${stagePlanHtml}

${includes.length > 0 ? `
<h3>Included Services · 服务包含项</h3>
<ul>
  ${includes.map((i) => `<li>${i}</li>`).join("\n")}
</ul>` : ""}

<h2>3. Fee Arrangement · 收费方式</h2>
<table>
  <tr>
    <td>Fee Structure · 收费结构</td>
    <td>${feeStr}</td>
  </tr>
  <tr>
    <td>Payment Platform · 付款平台</td>
    <td>Law119 escrow (平台托管，按阶段释放)</td>
  </tr>
</table>

${referralFeeHtml}

<h2>4. Conflict of Interest · 利益冲突</h2>
<p>${conflictNote} · 律师已完成利益冲突核查。</p>

<h2>5. Important Disclaimers · 重要免责声明</h2>
<div class="disclaimer">
  <strong>⚠ Platform Notice · 平台声明：</strong><br>
  (1) Law119 is a legal services marketplace platform and is NOT a law firm. Law119 是法律服务市场平台，并非律师事务所。<br>
  (2) This agreement is between the Client and the Attorney only. Law119 is not a party to this engagement. 本协议仅约束客户与律师双方，Law119 不是本协议当事方。<br>
  (3) The services described herein do not constitute legal advice from Law119. 本协议所述服务不构成 Law119 提供的法律意见。<br>
  (4) All communications and payments are facilitated through Law119's platform for convenience only. 所有通讯和付款均通过 Law119 平台进行，仅为便利双方。<br>
  ${data.nonLegalAdviceAck ? "(5) Attorney acknowledges these services do not involve unauthorized practice of law. 律师确认本服务符合相关执业规定。<br>" : ""}
</div>

<h2>6. Electronic Signature Agreement · 电子签名协议</h2>
<p>
  By signing below, both parties agree that this electronic signature has the same legal force and effect as a handwritten signature under the Electronic Signatures in Global and National Commerce Act (ESIGN Act) and the Uniform Electronic Transactions Act (UETA).
  双方签名即表示同意本电子签名依据美国《全球及国家商业电子签名法》（ESIGN Act）及《统一电子交易法》（UETA）具有与手写签名同等的法律效力。
</p>

<h2>7. Signatures · 签名</h2>

<div class="signature-section">
  <div class="sig-block">
    <p><strong>Attorney · 律师方</strong></p>
    <p>${escapeHtml(attorneyName)}</p>
    ${firmName ? `<p>${escapeHtml(firmName)}</p>` : ""}
    <br>
    <signature-field name="Signature" role="Attorney" required="true" style="width: 220px; height: 60px; display: block; margin: 8px 0;"></signature-field>
    <date-field name="Date" role="Attorney" required="true" style="width: 160px; height: 20px; display: inline-block; margin-top: 4px;"></date-field>
  </div>
  <div class="sig-block">
    <p><strong>Client · 客户方</strong></p>
    <p>${escapeHtml(clientName)}</p>
    <br>
    <signature-field name="Signature" role="Client" required="true" style="width: 220px; height: 60px; display: block; margin: 8px 0;"></signature-field>
    <date-field name="Date" role="Client" required="true" style="width: 160px; height: 20px; display: inline-block; margin-top: 4px;"></date-field>
  </div>
</div>

<div class="page-footer">
  Generated by Law119 · ${new Date().toISOString()} · Engagement ID: ${data.id}<br>
  This document is legally binding. 本文件具有法律约束力。
</div>

</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
