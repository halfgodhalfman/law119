import type { FormConfig } from "@/types/legal-form";

// ─── 美国各州列表 ─────────────────────────────────────────────────────────────
const US_STATES = [
  { value: "AL", label: "Alabama", labelZh: "阿拉巴马" },
  { value: "AK", label: "Alaska", labelZh: "阿拉斯加" },
  { value: "AZ", label: "Arizona", labelZh: "亚利桑那" },
  { value: "AR", label: "Arkansas", labelZh: "阿肯色" },
  { value: "CA", label: "California", labelZh: "加利福尼亚" },
  { value: "CO", label: "Colorado", labelZh: "科罗拉多" },
  { value: "CT", label: "Connecticut", labelZh: "康涅狄格" },
  { value: "DE", label: "Delaware", labelZh: "特拉华" },
  { value: "FL", label: "Florida", labelZh: "佛罗里达" },
  { value: "GA", label: "Georgia", labelZh: "乔治亚" },
  { value: "HI", label: "Hawaii", labelZh: "夏威夷" },
  { value: "ID", label: "Idaho", labelZh: "爱达荷" },
  { value: "IL", label: "Illinois", labelZh: "伊利诺伊" },
  { value: "IN", label: "Indiana", labelZh: "印第安纳" },
  { value: "IA", label: "Iowa", labelZh: "艾奥瓦" },
  { value: "KS", label: "Kansas", labelZh: "堪萨斯" },
  { value: "KY", label: "Kentucky", labelZh: "肯塔基" },
  { value: "LA", label: "Louisiana", labelZh: "路易斯安那" },
  { value: "ME", label: "Maine", labelZh: "缅因" },
  { value: "MD", label: "Maryland", labelZh: "马里兰" },
  { value: "MA", label: "Massachusetts", labelZh: "马萨诸塞" },
  { value: "MI", label: "Michigan", labelZh: "密歇根" },
  { value: "MN", label: "Minnesota", labelZh: "明尼苏达" },
  { value: "MS", label: "Mississippi", labelZh: "密西西比" },
  { value: "MO", label: "Missouri", labelZh: "密苏里" },
  { value: "MT", label: "Montana", labelZh: "蒙大拿" },
  { value: "NE", label: "Nebraska", labelZh: "内布拉斯加" },
  { value: "NV", label: "Nevada", labelZh: "内华达" },
  { value: "NH", label: "New Hampshire", labelZh: "新罕布什尔" },
  { value: "NJ", label: "New Jersey", labelZh: "新泽西" },
  { value: "NM", label: "New Mexico", labelZh: "新墨西哥" },
  { value: "NY", label: "New York", labelZh: "纽约" },
  { value: "NC", label: "North Carolina", labelZh: "北卡罗来纳" },
  { value: "ND", label: "North Dakota", labelZh: "北达科他" },
  { value: "OH", label: "Ohio", labelZh: "俄亥俄" },
  { value: "OK", label: "Oklahoma", labelZh: "俄克拉荷马" },
  { value: "OR", label: "Oregon", labelZh: "俄勒冈" },
  { value: "PA", label: "Pennsylvania", labelZh: "宾夕法尼亚" },
  { value: "RI", label: "Rhode Island", labelZh: "罗德岛" },
  { value: "SC", label: "South Carolina", labelZh: "南卡罗来纳" },
  { value: "SD", label: "South Dakota", labelZh: "南达科他" },
  { value: "TN", label: "Tennessee", labelZh: "田纳西" },
  { value: "TX", label: "Texas", labelZh: "得克萨斯" },
  { value: "UT", label: "Utah", labelZh: "犹他" },
  { value: "VT", label: "Vermont", labelZh: "佛蒙特" },
  { value: "VA", label: "Virginia", labelZh: "弗吉尼亚" },
  { value: "WA", label: "Washington", labelZh: "华盛顿" },
  { value: "WV", label: "West Virginia", labelZh: "西弗吉尼亚" },
  { value: "WI", label: "Wisconsin", labelZh: "威斯康星" },
  { value: "WY", label: "Wyoming", labelZh: "怀俄明" },
];

// ─── 模板 1：车辆买卖协议 ─────────────────────────────────────────────────────
const vehicleBillOfSaleConfig: FormConfig = {
  steps: [
    {
      id: "seller",
      title: "Seller Information",
      titleZh: "卖方信息",
      descriptionZh: "请填写车辆卖方（出售方）的基本信息",
      fields: [
        { id: "seller_name", type: "text", label: "Seller Full Name", labelZh: "卖方姓名", required: true, colSpan: 2 },
        { id: "seller_address", type: "text", label: "Seller Address", labelZh: "卖方地址", required: true, colSpan: 2 },
        { id: "seller_phone", type: "phone", label: "Seller Phone", labelZh: "卖方电话", required: true },
        { id: "seller_email", type: "email", label: "Seller Email (Optional)", labelZh: "卖方邮箱（选填）" },
      ],
    },
    {
      id: "buyer",
      title: "Buyer Information",
      titleZh: "买方信息",
      descriptionZh: "请填写车辆买方（购买方）的基本信息",
      fields: [
        { id: "buyer_name", type: "text", label: "Buyer Full Name", labelZh: "买方姓名", required: true, colSpan: 2 },
        { id: "buyer_address", type: "text", label: "Buyer Address", labelZh: "买方地址", required: true, colSpan: 2 },
        { id: "buyer_phone", type: "phone", label: "Buyer Phone", labelZh: "买方电话", required: true },
        { id: "buyer_email", type: "email", label: "Buyer Email (Optional)", labelZh: "买方邮箱（选填）" },
      ],
    },
    {
      id: "vehicle",
      title: "Vehicle Details",
      titleZh: "车辆信息",
      descriptionZh: "请填写被出售车辆的详细信息",
      fields: [
        { id: "vehicle_year", type: "number", label: "Year", labelZh: "年款", required: true, placeholder: "2020" },
        { id: "vehicle_make", type: "text", label: "Make", labelZh: "品牌", required: true, placeholder: "Toyota" },
        { id: "vehicle_model", type: "text", label: "Model", labelZh: "型号", required: true, placeholder: "Camry" },
        { id: "vehicle_color", type: "text", label: "Color", labelZh: "颜色", required: true },
        { id: "vehicle_vin", type: "text", label: "VIN Number", labelZh: "VIN 车架号", required: true, colSpan: 2 },
        { id: "vehicle_mileage", type: "number", label: "Odometer Reading (miles)", labelZh: "当前里程（英里）", required: true },
        { id: "vehicle_plate", type: "text", label: "License Plate", labelZh: "车牌号", placeholder: "Optional" },
      ],
    },
    {
      id: "sale",
      title: "Sale Terms",
      titleZh: "交易条款",
      descriptionZh: "请填写本次交易的价格和相关条款",
      fields: [
        { id: "sale_price", type: "money", label: "Sale Price (USD)", labelZh: "成交价格（美元）", required: true },
        { id: "sale_date", type: "date", label: "Date of Sale", labelZh: "交易日期", required: true },
        {
          id: "payment_method",
          type: "select",
          label: "Payment Method",
          labelZh: "付款方式",
          required: true,
          options: [
            { value: "Cash", label: "Cash", labelZh: "现金" },
            { value: "Cashier's Check", label: "Cashier's Check", labelZh: "银行本票" },
            { value: "Bank Transfer", label: "Bank Transfer", labelZh: "银行转账" },
            { value: "Zelle / Venmo / PayPal", label: "Zelle / Venmo / PayPal", labelZh: "Zelle / Venmo / PayPal" },
            { value: "Other", label: "Other", labelZh: "其他" },
          ],
        },
        { id: "state", type: "state", label: "State", labelZh: "所在州", required: true, options: US_STATES },
        {
          id: "vehicle_condition",
          type: "select",
          label: "Vehicle Condition",
          labelZh: "车辆状况",
          required: true,
          options: [
            { value: "As Is", label: "As Is (no warranty)", labelZh: "现状出售（不含质保）" },
            { value: "With Warranty", label: "With Warranty", labelZh: "含质保" },
          ],
        },
      ],
    },
  ],
  document: {
    title: "Vehicle Bill of Sale",
    titleZh: "车辆买卖协议",
    htmlContent: `
<div class="doc-header">
  <h1>VEHICLE BILL OF SALE<br><span class="zh">车辆买卖协议</span></h1>
  <p class="doc-date">Date / 日期：{{sale_date}}</p>
</div>

<p>This Vehicle Bill of Sale ("Agreement") is entered into on <strong>{{sale_date}}</strong>, by and between:</p>

<div class="party-block">
  <h3>SELLER / 卖方</h3>
  <p><strong>Name / 姓名：</strong> {{seller_name}}</p>
  <p><strong>Address / 地址：</strong> {{seller_address}}</p>
  <p><strong>Phone / 电话：</strong> {{seller_phone}}</p>
  {{#seller_email}}<p><strong>Email / 邮箱：</strong> {{seller_email}}</p>{{/seller_email}}
</div>

<div class="party-block">
  <h3>BUYER / 买方</h3>
  <p><strong>Name / 姓名：</strong> {{buyer_name}}</p>
  <p><strong>Address / 地址：</strong> {{buyer_address}}</p>
  <p><strong>Phone / 电话：</strong> {{buyer_phone}}</p>
  {{#buyer_email}}<p><strong>Email / 邮箱：</strong> {{buyer_email}}</p>{{/buyer_email}}
</div>

<h2>VEHICLE DESCRIPTION / 车辆描述</h2>
<table class="doc-table">
  <tr><td><strong>Year / 年款</strong></td><td>{{vehicle_year}}</td><td><strong>Make / 品牌</strong></td><td>{{vehicle_make}}</td></tr>
  <tr><td><strong>Model / 型号</strong></td><td>{{vehicle_model}}</td><td><strong>Color / 颜色</strong></td><td>{{vehicle_color}}</td></tr>
  <tr><td><strong>VIN / 车架号</strong></td><td colspan="3">{{vehicle_vin}}</td></tr>
  <tr><td><strong>Odometer / 里程</strong></td><td>{{vehicle_mileage}} miles</td><td><strong>Plate / 车牌</strong></td><td>{{vehicle_plate}}</td></tr>
</table>

<h2>TERMS OF SALE / 交易条款</h2>
<p>The Seller agrees to sell and the Buyer agrees to purchase the above-described vehicle for the total purchase price of <strong>USD \${{sale_price}}</strong>, paid via <strong>{{payment_method}}</strong>.</p>
<p>卖方同意将上述车辆以 <strong>\${{sale_price}} 美元</strong>的价格出售给买方，付款方式为 <strong>{{payment_method}}</strong>。</p>

<p>The vehicle is sold <strong>{{vehicle_condition}}</strong>. The Seller represents that they have legal title to the vehicle and the right to sell it, and that the vehicle is free from all liens and encumbrances unless otherwise stated herein.</p>
<p>车辆按 <strong>{{vehicle_condition}}</strong> 方式出售。卖方声明对该车辆拥有合法产权，有权出售，且该车辆无任何留置权或其他权利负担（另有说明者除外）。</p>

<div class="signature-section">
  <div class="sig-block">
    <div class="sig-line"></div>
    <p><strong>Seller Signature / 卖方签名</strong></p>
    <p>{{seller_name}}</p>
    <p>Date / 日期：________________</p>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <p><strong>Buyer Signature / 买方签名</strong></p>
    <p>{{buyer_name}}</p>
    <p>Date / 日期：________________</p>
  </div>
</div>
`,
    disclaimerZh: "本文书模板仅供参考，不构成法律建议。各州法律不同，建议在使用前咨询持牌律师。",
    disclaimer: "This template is for informational purposes only and does not constitute legal advice. Laws vary by state. Consult a licensed attorney before use.",
  },
};

// ─── 模板 2：借据 / 欠条 (Promissory Note) ────────────────────────────────────
const promissoryNoteConfig: FormConfig = {
  steps: [
    {
      id: "parties",
      title: "Parties",
      titleZh: "借贷双方",
      descriptionZh: "请填写出借人和借款人的基本信息",
      fields: [
        { id: "lender_name", type: "text", label: "Lender (Creditor) Name", labelZh: "出借人（债权人）姓名", required: true },
        { id: "lender_address", type: "text", label: "Lender Address", labelZh: "出借人地址", required: true },
        { id: "borrower_name", type: "text", label: "Borrower (Debtor) Name", labelZh: "借款人（债务人）姓名", required: true },
        { id: "borrower_address", type: "text", label: "Borrower Address", labelZh: "借款人地址", required: true },
      ],
    },
    {
      id: "loan",
      title: "Loan Terms",
      titleZh: "借款条款",
      descriptionZh: "请填写借款金额、日期和还款方式",
      fields: [
        { id: "loan_amount", type: "money", label: "Loan Amount (USD)", labelZh: "借款金额（美元）", required: true, colSpan: 2 },
        { id: "loan_date", type: "date", label: "Date of Loan", labelZh: "借款日期", required: true },
        { id: "due_date", type: "date", label: "Repayment Due Date", labelZh: "还款截止日期", required: true },
        {
          id: "interest",
          type: "select",
          label: "Interest",
          labelZh: "利息约定",
          required: true,
          options: [
            { value: "无息（Interest-Free）", label: "No Interest (Interest-Free)", labelZh: "无息" },
            { value: "年利率 3%", label: "3% Annual Interest", labelZh: "年利率 3%" },
            { value: "年利率 5%", label: "5% Annual Interest", labelZh: "年利率 5%" },
            { value: "年利率 8%", label: "8% Annual Interest", labelZh: "年利率 8%" },
            { value: "年利率 10%", label: "10% Annual Interest", labelZh: "年利率 10%" },
          ],
        },
        {
          id: "repayment_method",
          type: "select",
          label: "Repayment Method",
          labelZh: "还款方式",
          required: true,
          options: [
            { value: "一次性全额偿还", label: "Lump Sum on Due Date", labelZh: "到期一次性全额偿还" },
            { value: "分期付款", label: "Installments", labelZh: "分期付款" },
          ],
        },
        { id: "state", type: "state", label: "State (Governing Law)", labelZh: "所在州（适用法律）", required: true, options: US_STATES },
      ],
    },
  ],
  document: {
    title: "Promissory Note",
    titleZh: "借据 / 欠条",
    htmlContent: `
<div class="doc-header">
  <h1>PROMISSORY NOTE<br><span class="zh">借据 / 欠条</span></h1>
  <p class="doc-date">Date / 日期：{{loan_date}}</p>
</div>

<p>FOR VALUE RECEIVED, <strong>{{borrower_name}}</strong> ("Borrower / 借款人"), residing at {{borrower_address}}, promises to pay to the order of <strong>{{lender_name}}</strong> ("Lender / 出借人"), residing at {{lender_address}}, the principal sum of <strong>USD \${{loan_amount}}</strong>.</p>

<p>借款人 <strong>{{borrower_name}}</strong>（地址：{{borrower_address}}）承诺向出借人 <strong>{{lender_name}}</strong>（地址：{{lender_address}}）偿还借款本金 <strong>\${{loan_amount}} 美元</strong>。</p>

<h2>TERMS / 条款</h2>
<table class="doc-table">
  <tr><td><strong>Loan Date / 借款日期</strong></td><td>{{loan_date}}</td></tr>
  <tr><td><strong>Due Date / 还款截止日</strong></td><td>{{due_date}}</td></tr>
  <tr><td><strong>Interest / 利息</strong></td><td>{{interest}}</td></tr>
  <tr><td><strong>Repayment / 还款方式</strong></td><td>{{repayment_method}}</td></tr>
  <tr><td><strong>Governing Law / 适用法律</strong></td><td>State of {{state}}</td></tr>
</table>

<p>If the Borrower fails to make payment by the due date, the Lender shall be entitled to pursue all legal remedies available.</p>
<p>若借款人未能于到期日前还款，出借人有权寻求法律救济。</p>

<div class="signature-section">
  <div class="sig-block">
    <div class="sig-line"></div>
    <p><strong>Borrower Signature / 借款人签名</strong></p>
    <p>{{borrower_name}}</p>
    <p>Date / 日期：________________</p>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <p><strong>Lender Signature / 出借人签名（见证）</strong></p>
    <p>{{lender_name}}</p>
    <p>Date / 日期：________________</p>
  </div>
</div>
`,
    disclaimerZh: "本借据模板仅供参考。各州高利贷法律不同，请确认利率合法。建议咨询律师后使用。",
    disclaimer: "This template is for informational purposes only. Usury laws vary by state. Consult an attorney before use.",
  },
};

// ─── 模板 3：催款函 (Demand Letter) ──────────────────────────────────────────
const demandLetterConfig: FormConfig = {
  steps: [
    {
      id: "sender",
      title: "Your Information",
      titleZh: "寄信人信息",
      fields: [
        { id: "sender_name", type: "text", label: "Your Full Name", labelZh: "您的姓名", required: true, colSpan: 2 },
        { id: "sender_address", type: "text", label: "Your Address", labelZh: "您的地址", required: true, colSpan: 2 },
        { id: "sender_phone", type: "phone", label: "Your Phone", labelZh: "您的电话", required: true },
        { id: "sender_email", type: "email", label: "Your Email", labelZh: "您的邮箱", required: true },
      ],
    },
    {
      id: "recipient",
      title: "Recipient Information",
      titleZh: "收信人信息",
      fields: [
        { id: "recipient_name", type: "text", label: "Recipient's Full Name / Company", labelZh: "收信人姓名 / 公司名", required: true, colSpan: 2 },
        { id: "recipient_address", type: "text", label: "Recipient's Address", labelZh: "收信人地址", required: true, colSpan: 2 },
      ],
    },
    {
      id: "claim",
      title: "Claim Details",
      titleZh: "欠款详情",
      fields: [
        { id: "amount_owed", type: "money", label: "Amount Owed (USD)", labelZh: "欠款金额（美元）", required: true },
        { id: "demand_date", type: "date", label: "Letter Date", labelZh: "发函日期", required: true },
        { id: "payment_deadline", type: "date", label: "Payment Deadline", labelZh: "付款截止日期", required: true },
        {
          id: "reason",
          type: "textarea",
          label: "Reason for Debt / Background",
          labelZh: "欠款原因 / 背景说明",
          required: true,
          colSpan: 2,
          placeholder: "Describe the reason why money is owed (e.g., unpaid invoice, loan, damage, etc.)",
        },
        { id: "state", type: "state", label: "State", labelZh: "所在州", required: true, options: US_STATES },
      ],
    },
  ],
  document: {
    title: "Demand Letter",
    titleZh: "催款函",
    htmlContent: `
<div class="doc-header">
  <h1>DEMAND LETTER / 催款函</h1>
</div>

<p class="letter-date">{{demand_date}}</p>

<p>
  {{recipient_name}}<br>
  {{recipient_address}}
</p>

<p><strong>RE: Formal Demand for Payment of \${{amount_owed}} / 正式催款通知</strong></p>

<p>Dear {{recipient_name}},</p>

<p>I am writing to formally demand payment of <strong>USD \${{amount_owed}}</strong> that you owe me. The basis for this debt is as follows:</p>
<p>本函旨在正式要求您偿还所欠 <strong>\${{amount_owed}} 美元</strong>。债务产生原因如下：</p>

<blockquote>{{reason}}</blockquote>

<p>Despite previous requests, this amount remains unpaid. You are hereby demanded to remit full payment of <strong>USD \${{amount_owed}}</strong> no later than <strong>{{payment_deadline}}</strong>.</p>
<p>尽管本人此前已多次催告，上述款项至今仍未支付。请您务必于 <strong>{{payment_deadline}}</strong> 之前全额付清 <strong>\${{amount_owed}} 美元</strong>。</p>

<p>If payment is not received by the above deadline, I reserve the right to pursue all legal remedies available to me under the laws of the State of <strong>{{state}}</strong>, including but not limited to filing a lawsuit, seeking court costs, and attorney's fees to the extent permitted by law.</p>
<p>如您未能在上述期限内付款，本人保留在 <strong>{{state}}州</strong>法律框架下追究一切法律责任的权利，包括但不限于提起诉讼、追索诉讼费用及律师费。</p>

<p>Please direct payment or contact to:</p>
<p>请将款项或联系信息发送至：</p>

<p>
  <strong>{{sender_name}}</strong><br>
  {{sender_address}}<br>
  Phone / 电话：{{sender_phone}}<br>
  Email / 邮箱：{{sender_email}}
</p>

<p>Sincerely,<br>此致</p>
<br>
<div class="sig-line" style="width:250px;"></div>
<p>{{sender_name}}</p>
`,
    disclaimerZh: "本催款函模板仅供参考，不构成法律建议。如欠款金额较大或情况复杂，建议委托律师处理。",
    disclaimer: "This template is for informational purposes only and does not constitute legal advice.",
  },
};

// ─── 模板 4：租约终止通知 (Lease Termination Notice) ─────────────────────────
const leaseTerminationConfig: FormConfig = {
  steps: [
    {
      id: "parties",
      title: "Parties",
      titleZh: "双方信息",
      fields: [
        { id: "tenant_name", type: "text", label: "Tenant Name", labelZh: "租客姓名", required: true },
        { id: "landlord_name", type: "text", label: "Landlord Name / Company", labelZh: "房东姓名 / 公司", required: true },
        { id: "property_address", type: "text", label: "Rental Property Address", labelZh: "租赁房屋地址", required: true, colSpan: 2 },
      ],
    },
    {
      id: "terms",
      title: "Termination Terms",
      titleZh: "终止条款",
      fields: [
        { id: "notice_date", type: "date", label: "Notice Date", labelZh: "通知日期", required: true },
        { id: "termination_date", type: "date", label: "Desired Termination Date", labelZh: "期望搬出日期", required: true },
        { id: "lease_end_date", type: "date", label: "Current Lease End Date", labelZh: "当前租约到期日", required: true },
        {
          id: "reason",
          type: "select",
          label: "Reason for Termination",
          labelZh: "终止原因",
          required: true,
          options: [
            { value: "Personal reasons / 个人原因", label: "Personal reasons", labelZh: "个人原因" },
            { value: "Relocation / 搬迁", label: "Relocation", labelZh: "搬迁" },
            { value: "Purchase of home / 购房", label: "Purchase of home", labelZh: "购房" },
            { value: "End of lease term / 租约到期", label: "End of lease term", labelZh: "租约到期" },
            { value: "Job change / 工作变动", label: "Job change", labelZh: "工作变动" },
          ],
        },
        { id: "state", type: "state", label: "State", labelZh: "所在州", required: true, options: US_STATES },
        {
          id: "forwarding_address",
          type: "text",
          label: "Forwarding Address (for deposit return)",
          labelZh: "新地址（用于退还押金）",
          colSpan: 2,
        },
      ],
    },
  ],
  document: {
    title: "Lease Termination Notice",
    titleZh: "租约终止通知",
    htmlContent: `
<div class="doc-header">
  <h1>NOTICE OF LEASE TERMINATION<br><span class="zh">租约终止通知书</span></h1>
</div>

<p class="letter-date">{{notice_date}}</p>

<p>
  <strong>To / 致：</strong>{{landlord_name}}<br>
  <strong>From / 来自：</strong>{{tenant_name}}<br>
  <strong>Re / 事由：</strong>Lease Termination — {{property_address}}
</p>

<p>Dear {{landlord_name}},</p>

<p>I, <strong>{{tenant_name}}</strong>, am writing to formally notify you of my intention to terminate the lease for the property located at <strong>{{property_address}}</strong>, effective <strong>{{termination_date}}</strong>.</p>

<p>本人 <strong>{{tenant_name}}</strong> 正式通知您，本人将于 <strong>{{termination_date}}</strong> 终止位于 <strong>{{property_address}}</strong> 的租赁合同。</p>

<table class="doc-table">
  <tr><td><strong>Notice Date / 通知日期</strong></td><td>{{notice_date}}</td></tr>
  <tr><td><strong>Lease End Date / 租约到期日</strong></td><td>{{lease_end_date}}</td></tr>
  <tr><td><strong>Move-Out Date / 搬出日期</strong></td><td>{{termination_date}}</td></tr>
  <tr><td><strong>Reason / 原因</strong></td><td>{{reason}}</td></tr>
</table>

<p>I will ensure the property is returned in good condition by the move-out date. Please kindly arrange for a final inspection and return of my security deposit to my forwarding address:</p>
<p>本人将确保在搬出日期前将房屋恢复至良好状态。请安排最终验收，并将押金退还至以下新地址：</p>

<p><strong>{{forwarding_address}}</strong></p>

<p>This notice is provided in accordance with the terms of the lease agreement and applicable laws of the State of <strong>{{state}}</strong>.</p>
<p>本通知依据租赁协议条款及 <strong>{{state}}州</strong>相关法律发出。</p>

<br>
<div class="sig-line" style="width:250px;"></div>
<p><strong>{{tenant_name}}</strong><br>Tenant / 租客</p>
`,
    disclaimerZh: "各州对提前终止租约的通知期限要求不同（通常为30天或60天），请核实您所在州的规定。本模板不构成法律建议。",
    disclaimer: "Notice period requirements vary by state (typically 30 or 60 days). Please verify local requirements.",
  },
};

// ─── 模板 5：保密协议 NDA ────────────────────────────────────────────────────
const ndaConfig: FormConfig = {
  steps: [
    {
      id: "parties",
      title: "Parties",
      titleZh: "协议双方",
      fields: [
        { id: "disclosing_party", type: "text", label: "Disclosing Party (Information Owner)", labelZh: "信息披露方（信息所有者）", required: true, colSpan: 2 },
        { id: "disclosing_address", type: "text", label: "Disclosing Party Address", labelZh: "披露方地址", required: true, colSpan: 2 },
        { id: "receiving_party", type: "text", label: "Receiving Party (Information Recipient)", labelZh: "信息接收方（被披露方）", required: true, colSpan: 2 },
        { id: "receiving_address", type: "text", label: "Receiving Party Address", labelZh: "接收方地址", required: true, colSpan: 2 },
      ],
    },
    {
      id: "terms",
      title: "NDA Terms",
      titleZh: "保密条款",
      fields: [
        { id: "agreement_date", type: "date", label: "Agreement Date", labelZh: "协议签订日期", required: true },
        {
          id: "purpose",
          type: "textarea",
          label: "Purpose of Disclosure",
          labelZh: "信息披露目的",
          required: true,
          colSpan: 2,
          placeholder: "e.g., Evaluating a potential business partnership, discussing investment opportunities...",
        },
        {
          id: "confidential_period",
          type: "select",
          label: "Confidentiality Period",
          labelZh: "保密期限",
          required: true,
          options: [
            { value: "1 year / 1年", label: "1 Year", labelZh: "1 年" },
            { value: "2 years / 2年", label: "2 Years", labelZh: "2 年" },
            { value: "3 years / 3年", label: "3 Years", labelZh: "3 年" },
            { value: "5 years / 5年", label: "5 Years", labelZh: "5 年" },
            { value: "Indefinitely / 永久保密", label: "Indefinitely", labelZh: "永久保密" },
          ],
        },
        {
          id: "nda_type",
          type: "select",
          label: "NDA Type",
          labelZh: "保密协议类型",
          required: true,
          options: [
            { value: "One-way / 单向", label: "One-way (only Receiving Party bound)", labelZh: "单向（仅接收方负有保密义务）" },
            { value: "Mutual / 双向", label: "Mutual (both parties bound)", labelZh: "双向（双方均负有保密义务）" },
          ],
        },
        { id: "state", type: "state", label: "Governing State Law", labelZh: "适用法律（所在州）", required: true, options: US_STATES },
      ],
    },
  ],
  document: {
    title: "Non-Disclosure Agreement (NDA)",
    titleZh: "保密协议（NDA）",
    htmlContent: `
<div class="doc-header">
  <h1>NON-DISCLOSURE AGREEMENT<br><span class="zh">保密协议（NDA）</span></h1>
</div>

<p>This Non-Disclosure Agreement ("Agreement") is entered into as of <strong>{{agreement_date}}</strong> by and between:</p>
<p>本保密协议（"协议"）由以下双方于 <strong>{{agreement_date}}</strong> 签订：</p>

<div class="party-block">
  <p><strong>Disclosing Party / 披露方：</strong> {{disclosing_party}}, {{disclosing_address}}</p>
  <p><strong>Receiving Party / 接收方：</strong> {{receiving_party}}, {{receiving_address}}</p>
</div>

<h2>1. PURPOSE / 目的</h2>
<p>The parties wish to explore a potential business relationship for the following purpose: <strong>{{purpose}}</strong></p>
<p>双方就以下目的探讨潜在业务合作：<strong>{{purpose}}</strong></p>

<h2>2. CONFIDENTIAL INFORMATION / 保密信息</h2>
<p>"Confidential Information" means any non-public information disclosed by the Disclosing Party, including but not limited to business plans, financial data, technical information, and trade secrets.</p>
<p>"保密信息"是指披露方披露的任何非公开信息，包括但不限于商业计划、财务数据、技术信息和商业秘密。</p>

<h2>3. OBLIGATIONS / 保密义务</h2>
<p>The Receiving Party agrees to: (a) hold all Confidential Information in strict confidence; (b) not disclose Confidential Information to third parties without prior written consent; (c) use the Confidential Information solely for the stated purpose.</p>
<p>接收方同意：（a）对所有保密信息严格保密；（b）未经事先书面同意不向第三方披露保密信息；（c）仅将保密信息用于上述目的。</p>
<p><strong>Type / 类型：{{nda_type}}</strong></p>

<h2>4. TERM / 期限</h2>
<p>This Agreement shall remain in effect for <strong>{{confidential_period}}</strong> from the date of this Agreement.</p>
<p>本协议自签订之日起 <strong>{{confidential_period}}</strong> 内有效。</p>

<h2>5. GOVERNING LAW / 适用法律</h2>
<p>This Agreement shall be governed by the laws of the State of <strong>{{state}}</strong>.</p>
<p>本协议适用 <strong>{{state}}州</strong>法律。</p>

<div class="signature-section">
  <div class="sig-block">
    <div class="sig-line"></div>
    <p><strong>Disclosing Party / 披露方</strong></p>
    <p>{{disclosing_party}}</p>
    <p>Date / 日期：________________</p>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <p><strong>Receiving Party / 接收方</strong></p>
    <p>{{receiving_party}}</p>
    <p>Date / 日期：________________</p>
  </div>
</div>
`,
    disclaimerZh: "本 NDA 模板仅供一般参考，不构成法律建议。对于涉及重要商业秘密或复杂情形，强烈建议委托律师起草专业协议。",
    disclaimer: "This NDA template is for general reference only and does not constitute legal advice. For important trade secrets or complex situations, consult a licensed attorney.",
  },
};

// ─── 模板 6：简易遗嘱 (Simple Will) ──────────────────────────────────────────
const simpleWillConfig: FormConfig = {
  steps: [
    {
      id: "testator",
      title: "Testator Information",
      titleZh: "立遗嘱人信息",
      descriptionZh: "请填写立遗嘱人（即您）的基本信息",
      fields: [
        { id: "testator_name", type: "text", label: "Your Full Legal Name", labelZh: "您的法定全名", required: true, colSpan: 2 },
        { id: "testator_address", type: "text", label: "Your Address", labelZh: "您的居住地址", required: true, colSpan: 2 },
        { id: "testator_dob", type: "date", label: "Date of Birth", labelZh: "出生日期", required: true },
        { id: "state", type: "state", label: "State of Residence", labelZh: "居住所在州", required: true, options: US_STATES },
        { id: "will_date", type: "date", label: "Date of This Will", labelZh: "遗嘱签署日期", required: true },
      ],
    },
    {
      id: "executor",
      title: "Executor",
      titleZh: "遗嘱执行人",
      descriptionZh: "遗嘱执行人负责在您身后按遗嘱分配财产，通常为您信任的家人或朋友",
      fields: [
        { id: "executor_name", type: "text", label: "Executor Full Name", labelZh: "执行人姓名", required: true },
        { id: "executor_relationship", type: "text", label: "Relationship to You", labelZh: "与您的关系", required: true, placeholder: "e.g., Spouse, Child, Friend" },
        { id: "executor_address", type: "text", label: "Executor Address", labelZh: "执行人地址", required: true },
        { id: "alternate_executor", type: "text", label: "Alternate Executor (Optional)", labelZh: "备选执行人（选填）" },
      ],
    },
    {
      id: "beneficiaries",
      title: "Beneficiaries & Estate",
      titleZh: "继承人与遗产安排",
      descriptionZh: "请说明您的主要遗产分配方式",
      fields: [
        {
          id: "primary_beneficiary",
          type: "textarea",
          label: "Primary Beneficiary(ies)",
          labelZh: "主要继承人",
          required: true,
          colSpan: 2,
          placeholder: "e.g., My spouse, Jane Doe, residing at [address], receives my entire estate.",
        },
        {
          id: "alternate_beneficiary",
          type: "textarea",
          label: "Alternate Beneficiary (if primary predeceases you)",
          labelZh: "备选继承人（若主要继承人先于您去世）",
          colSpan: 2,
          placeholder: "e.g., My children in equal shares.",
        },
        {
          id: "special_bequests",
          type: "textarea",
          label: "Special Bequests (Optional)",
          labelZh: "特定遗赠（选填）",
          colSpan: 2,
          placeholder: "e.g., My grandfather's watch to my son John Doe.",
        },
        {
          id: "minor_guardian",
          type: "text",
          label: "Guardian for Minor Children (if applicable)",
          labelZh: "未成年子女监护人（如有）",
          colSpan: 2,
          placeholder: "Full name of guardian",
        },
      ],
    },
  ],
  document: {
    title: "Last Will and Testament",
    titleZh: "最后遗嘱及遗嘱证明书",
    htmlContent: `
<div class="doc-header">
  <h1>LAST WILL AND TESTAMENT<br><span class="zh">最后遗嘱及遗嘱证明书</span></h1>
  <p class="doc-date">Signed / 签署日期：{{will_date}}</p>
</div>

<p>I, <strong>{{testator_name}}</strong>, residing at <strong>{{testator_address}}</strong>, State of <strong>{{state}}</strong>, born on <strong>{{testator_dob}}</strong>, being of sound and disposing mind and memory, hereby make, publish, and declare this to be my Last Will and Testament, revoking all prior wills and codicils.</p>

<p>本人 <strong>{{testator_name}}</strong>，居住于 <strong>{{testator_address}}</strong>，所在州：<strong>{{state}}</strong>，出生于 <strong>{{testator_dob}}</strong>，在精神健全、思维清晰的状态下，特立本遗嘱，并撤销此前所有遗嘱及遗嘱附录。</p>

<h2>ARTICLE I — EXECUTOR / 第一条 — 遗嘱执行人</h2>
<p>I appoint <strong>{{executor_name}}</strong> ({{executor_relationship}}), residing at {{executor_address}}, as the Executor of this Will. If {{executor_name}} is unable or unwilling to serve, I appoint <strong>{{alternate_executor}}</strong> as Alternate Executor.</p>
<p>本人指定 <strong>{{executor_name}}</strong>（与本人关系：{{executor_relationship}}，地址：{{executor_address}}）为本遗嘱执行人。若其无法或不愿担任，则由 <strong>{{alternate_executor}}</strong> 担任备选执行人。</p>

<h2>ARTICLE II — BENEFICIARIES / 第二条 — 继承安排</h2>
<p>I give, bequeath, and devise my estate as follows:</p>
<p>本人将名下遗产按如下方式分配：</p>

<div class="party-block">
  <p><strong>Primary Beneficiary / 主要继承人：</strong></p>
  <p>{{primary_beneficiary}}</p>
</div>

{{#alternate_beneficiary}}
<div class="party-block">
  <p><strong>Alternate Beneficiary / 备选继承人：</strong></p>
  <p>{{alternate_beneficiary}}</p>
</div>
{{/alternate_beneficiary}}

{{#special_bequests}}
<h2>ARTICLE III — SPECIAL BEQUESTS / 第三条 — 特定遗赠</h2>
<p>{{special_bequests}}</p>
{{/special_bequests}}

{{#minor_guardian}}
<h2>ARTICLE IV — GUARDIAN / 第四条 — 未成年子女监护人</h2>
<p>I appoint <strong>{{minor_guardian}}</strong> as guardian of my minor children.</p>
<p>本人指定 <strong>{{minor_guardian}}</strong> 为本人未成年子女的监护人。</p>
{{/minor_guardian}}

<h2>ATTESTATION / 见证声明</h2>
<p>IN WITNESS WHEREOF, I have hereunto set my hand to this Will on the date first written above.</p>
<p>上述立遗嘱人于上述日期签署本遗嘱，特此为证。</p>

<div class="signature-section">
  <div class="sig-block">
    <div class="sig-line"></div>
    <p><strong>Testator / 立遗嘱人</strong></p>
    <p>{{testator_name}}</p>
    <p>Date / 日期：{{will_date}}</p>
  </div>
</div>

<div style="margin-top:30px;border:1px solid #ccc;border-radius:4px;padding:16px;background:#f9f9f9;">
  <p style="font-size:12px;font-weight:bold;margin:0 0 8px 0;">WITNESS SIGNATURES / 见证人签名（需两位独立见证人）</p>
  <div style="display:flex;gap:30px;margin-top:12px;">
    <div style="flex:1;">
      <div class="sig-line"></div>
      <p style="font-size:11px;">Witness 1 / 见证人 1</p>
      <p style="font-size:11px;">Printed Name: _______________________</p>
      <p style="font-size:11px;">Address: ___________________________</p>
    </div>
    <div style="flex:1;">
      <div class="sig-line"></div>
      <p style="font-size:11px;">Witness 2 / 见证人 2</p>
      <p style="font-size:11px;">Printed Name: _______________________</p>
      <p style="font-size:11px;">Address: ___________________________</p>
    </div>
  </div>
</div>
`,
    disclaimerZh: "本简易遗嘱模板仅供参考，不构成法律建议。各州对遗嘱有效性要求不同（见证人、公证等），强烈建议在遗产规划律师协助下签署正式遗嘱。",
    disclaimer: "This simple will template is for reference only and does not constitute legal advice. Requirements for valid wills vary by state. Consult an estate planning attorney.",
  },
};

// ─── 模板 7：住宅租赁协议 (Residential Lease Agreement) ───────────────────────
const residentialLeaseConfig: FormConfig = {
  steps: [
    {
      id: "landlord",
      title: "Landlord & Property",
      titleZh: "房东与房产信息",
      descriptionZh: "请填写房东（出租方）和租赁房产的基本信息",
      fields: [
        { id: "landlord_name", type: "text", label: "Landlord Full Name / Company", labelZh: "房东姓名 / 公司", required: true },
        { id: "landlord_address", type: "text", label: "Landlord Mailing Address", labelZh: "房东通讯地址", required: true },
        { id: "landlord_email", type: "email", label: "Landlord Email", labelZh: "房东邮箱", required: true },
        { id: "landlord_phone", type: "phone", label: "Landlord Phone", labelZh: "房东电话", required: true },
        { id: "property_address", type: "text", label: "Rental Property Address", labelZh: "租赁房产地址", required: true, colSpan: 2 },
        { id: "property_unit", type: "text", label: "Unit # (if applicable)", labelZh: "单元号（如有）" },
        {
          id: "property_type",
          type: "select",
          label: "Property Type",
          labelZh: "房型",
          required: true,
          options: [
            { value: "Apartment", label: "Apartment", labelZh: "公寓" },
            { value: "House", label: "House", labelZh: "独栋" },
            { value: "Condo", label: "Condo", labelZh: "共管公寓" },
            { value: "Townhouse", label: "Townhouse", labelZh: "联排别墅" },
            { value: "Studio", label: "Studio", labelZh: "开间" },
          ],
        },
        { id: "state", type: "state", label: "State", labelZh: "所在州", required: true, options: US_STATES },
      ],
    },
    {
      id: "tenant",
      title: "Tenant(s)",
      titleZh: "租客信息",
      descriptionZh: "请填写租客（承租方）信息，所有成人租客均须签名",
      fields: [
        { id: "tenant_name", type: "text", label: "Tenant Full Name", labelZh: "租客姓名（主租客）", required: true, colSpan: 2 },
        { id: "tenant_email", type: "email", label: "Tenant Email", labelZh: "租客邮箱", required: true },
        { id: "tenant_phone", type: "phone", label: "Tenant Phone", labelZh: "租客电话", required: true },
        { id: "additional_tenants", type: "text", label: "Additional Tenants (if any)", labelZh: "其他租客姓名（如有）", colSpan: 2, placeholder: "John Doe, Jane Doe" },
      ],
    },
    {
      id: "lease_terms",
      title: "Lease Terms",
      titleZh: "租约条款",
      descriptionZh: "请填写租约时间、租金和费用相关信息",
      fields: [
        { id: "lease_start", type: "date", label: "Lease Start Date", labelZh: "租约开始日期", required: true },
        { id: "lease_end", type: "date", label: "Lease End Date", labelZh: "租约结束日期", required: true },
        { id: "monthly_rent", type: "money", label: "Monthly Rent (USD)", labelZh: "月租金（美元）", required: true },
        { id: "rent_due_day", type: "number", label: "Rent Due Day of Month", labelZh: "每月租金到期日", required: true, placeholder: "1" },
        { id: "security_deposit", type: "money", label: "Security Deposit (USD)", labelZh: "押金（美元）", required: true },
        {
          id: "late_fee",
          type: "select",
          label: "Late Fee",
          labelZh: "滞纳金",
          required: true,
          options: [
            { value: "No late fee", label: "No late fee", labelZh: "无滞纳金" },
            { value: "$25 after 5-day grace period", label: "$25 after 5-day grace period", labelZh: "5天宽限期后 $25" },
            { value: "$50 after 5-day grace period", label: "$50 after 5-day grace period", labelZh: "5天宽限期后 $50" },
            { value: "5% of monthly rent after 5 days", label: "5% of monthly rent after 5 days", labelZh: "5天后收取月租5%" },
          ],
        },
        {
          id: "utilities",
          type: "textarea",
          label: "Utilities Responsibility",
          labelZh: "水电煤费用说明",
          required: true,
          colSpan: 2,
          placeholder: "e.g., Tenant pays electricity and gas. Landlord pays water and trash.",
        },
        {
          id: "pets",
          type: "select",
          label: "Pet Policy",
          labelZh: "宠物政策",
          required: true,
          options: [
            { value: "No pets allowed", label: "No pets allowed", labelZh: "不允许养宠物" },
            { value: "Pets allowed with $300 pet deposit", label: "Pets allowed with $300 pet deposit", labelZh: "允许宠物，额外 $300 押金" },
            { value: "Pets allowed with landlord approval", label: "Pets allowed with landlord approval", labelZh: "需房东书面批准" },
          ],
        },
      ],
    },
  ],
  document: {
    title: "Residential Lease Agreement",
    titleZh: "住宅租赁协议",
    htmlContent: `
<div class="doc-header">
  <h1>RESIDENTIAL LEASE AGREEMENT<br><span class="zh">住宅租赁协议</span></h1>
</div>

<p>This Residential Lease Agreement ("Lease") is entered into as of <strong>{{lease_start}}</strong>, by and between:</p>
<p>本住宅租赁协议（"协议"）由以下双方于 <strong>{{lease_start}}</strong> 签订：</p>

<div class="party-block">
  <h3>LANDLORD / 房东</h3>
  <p><strong>Name / 姓名：</strong> {{landlord_name}}</p>
  <p><strong>Address / 地址：</strong> {{landlord_address}}</p>
  <p><strong>Email / 邮箱：</strong> {{landlord_email}} &nbsp;|&nbsp; <strong>Phone / 电话：</strong> {{landlord_phone}}</p>
</div>

<div class="party-block">
  <h3>TENANT(S) / 租客</h3>
  <p><strong>Primary Tenant / 主租客：</strong> {{tenant_name}}</p>
  <p><strong>Email / 邮箱：</strong> {{tenant_email}} &nbsp;|&nbsp; <strong>Phone / 电话：</strong> {{tenant_phone}}</p>
  {{#additional_tenants}}<p><strong>Additional Tenants / 其他租客：</strong> {{additional_tenants}}</p>{{/additional_tenants}}
</div>

<h2>1. PREMISES / 租赁房产</h2>
<p>Landlord agrees to rent to Tenant the property located at: <strong>{{property_address}} {{property_unit}}</strong>, State of <strong>{{state}}</strong>. Property Type: <strong>{{property_type}}</strong>.</p>
<p>房东同意将位于 <strong>{{property_address}} {{property_unit}}</strong>（<strong>{{state}}</strong>州）的 <strong>{{property_type}}</strong> 出租给租客。</p>

<h2>2. TERM / 租期</h2>
<p>This Lease shall commence on <strong>{{lease_start}}</strong> and end on <strong>{{lease_end}}</strong>.</p>
<p>本协议租期自 <strong>{{lease_start}}</strong> 起至 <strong>{{lease_end}}</strong> 止。</p>

<h2>3. RENT / 租金</h2>
<table class="doc-table">
  <tr><td><strong>Monthly Rent / 月租金</strong></td><td>USD \${{monthly_rent}}</td></tr>
  <tr><td><strong>Due Date / 到期日</strong></td><td>Day {{rent_due_day}} of each month / 每月 {{rent_due_day}} 日</td></tr>
  <tr><td><strong>Late Fee / 滞纳金</strong></td><td>{{late_fee}}</td></tr>
</table>

<h2>4. SECURITY DEPOSIT / 押金</h2>
<p>Tenant shall pay a security deposit of <strong>USD \${{security_deposit}}</strong> prior to or upon move-in. The deposit shall be returned within the time period required by State of <strong>{{state}}</strong> law after Tenant vacates the premises, less any deductions for damages beyond normal wear and tear.</p>
<p>租客须于入住前或入住时支付押金 <strong>\${{security_deposit}} 美元</strong>。租客搬出后，房东须依据 <strong>{{state}}州</strong>法律规定时限退还押金，正常磨损之外的损坏费用可从押金中扣除。</p>

<h2>5. UTILITIES / 水电费用</h2>
<p>{{utilities}}</p>

<h2>6. PETS / 宠物政策</h2>
<p>{{pets}}</p>

<h2>7. GENERAL TERMS / 一般条款</h2>
<p>Tenant shall: (a) keep the premises in a clean and sanitary condition; (b) not make alterations without written consent; (c) comply with all applicable laws; (d) not sublease without written approval. Landlord shall maintain the premises in habitable condition as required by law.</p>
<p>租客须：（a）保持房屋清洁卫生；（b）未经书面同意不得改造房屋；（c）遵守所有相关法律法规；（d）未经书面批准不得转租。房东须依法维持房屋的适居状态。</p>

<div class="signature-section">
  <div class="sig-block">
    <div class="sig-line"></div>
    <p><strong>Landlord / 房东</strong></p>
    <p>{{landlord_name}}</p>
    <p>Date / 日期：________________</p>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <p><strong>Tenant / 租客</strong></p>
    <p>{{tenant_name}}</p>
    <p>Date / 日期：________________</p>
  </div>
</div>
`,
    disclaimerZh: "各州对租赁协议有具体的法律要求（安全押金上限、通知期限、房东责任等），本模板为一般通用版本，不保证符合您所在州的全部规定，建议咨询当地租房律师后使用。",
    disclaimer: "Landlord-tenant laws vary significantly by state. This template is a general-purpose document. Consult a local attorney to ensure compliance with your state's specific requirements.",
  },
};

// ─── 模板 8：LLC 运营协议 (LLC Operating Agreement) ──────────────────────────
const llcOperatingAgreementConfig: FormConfig = {
  steps: [
    {
      id: "company",
      title: "Company Information",
      titleZh: "公司基本信息",
      descriptionZh: "请填写 LLC（有限责任公司）的基本注册信息",
      fields: [
        { id: "company_name", type: "text", label: "LLC Name (as registered)", labelZh: "LLC 公司名称（与注册相同）", required: true, colSpan: 2 },
        { id: "state_of_formation", type: "state", label: "State of Formation", labelZh: "注册所在州", required: true, options: US_STATES },
        { id: "principal_address", type: "text", label: "Principal Business Address", labelZh: "主要营业地址", required: true, colSpan: 2 },
        { id: "formation_date", type: "date", label: "Date of Formation / Agreement", labelZh: "成立日期 / 协议日期", required: true },
        {
          id: "business_purpose",
          type: "textarea",
          label: "Business Purpose",
          labelZh: "经营目的",
          required: true,
          colSpan: 2,
          placeholder: "e.g., To engage in the business of software development and related services.",
        },
      ],
    },
    {
      id: "members",
      title: "Members & Ownership",
      titleZh: "成员与股权",
      descriptionZh: "请填写 LLC 各成员的信息及其持股比例，所有成员比例之和须为 100%",
      fields: [
        { id: "member1_name", type: "text", label: "Member 1 Full Name", labelZh: "成员 1 姓名", required: true },
        { id: "member1_ownership", type: "number", label: "Member 1 Ownership %", labelZh: "成员 1 持股比例（%）", required: true, placeholder: "60" },
        { id: "member1_address", type: "text", label: "Member 1 Address", labelZh: "成员 1 地址", required: true },
        { id: "member1_contribution", type: "money", label: "Member 1 Capital Contribution (USD)", labelZh: "成员 1 出资额（美元）", required: true },
        { id: "member2_name", type: "text", label: "Member 2 Full Name (if any)", labelZh: "成员 2 姓名（如有）" },
        { id: "member2_ownership", type: "number", label: "Member 2 Ownership %", labelZh: "成员 2 持股比例（%）", placeholder: "40" },
        { id: "member2_address", type: "text", label: "Member 2 Address", labelZh: "成员 2 地址" },
        { id: "member2_contribution", type: "money", label: "Member 2 Capital Contribution (USD)", labelZh: "成员 2 出资额（美元）" },
      ],
    },
    {
      id: "management",
      title: "Management & Operations",
      titleZh: "管理与运营",
      descriptionZh: "请选择公司管理架构和财务安排",
      fields: [
        {
          id: "management_type",
          type: "select",
          label: "Management Structure",
          labelZh: "管理结构",
          required: true,
          options: [
            { value: "Member-Managed", label: "Member-Managed (all members manage)", labelZh: "成员共同管理（所有成员参与日常经营）" },
            { value: "Manager-Managed", label: "Manager-Managed (designated manager)", labelZh: "指定经理管理（设专职经理负责日常事务）" },
          ],
        },
        { id: "managing_member", type: "text", label: "Managing Member / Manager Name (if Manager-Managed)", labelZh: "指定经理姓名（如适用）" },
        {
          id: "fiscal_year",
          type: "select",
          label: "Fiscal Year End",
          labelZh: "财务年度",
          required: true,
          options: [
            { value: "December 31", label: "December 31 (Calendar Year)", labelZh: "12月31日（自然年）" },
            { value: "March 31", label: "March 31", labelZh: "3月31日" },
            { value: "June 30", label: "June 30", labelZh: "6月30日" },
            { value: "September 30", label: "September 30", labelZh: "9月30日" },
          ],
        },
        {
          id: "distributions",
          type: "select",
          label: "Profit Distribution",
          labelZh: "利润分配方式",
          required: true,
          options: [
            { value: "Pro-rata based on ownership percentage", label: "Pro-rata (based on ownership %)", labelZh: "按持股比例分配" },
            { value: "As determined by majority vote of members", label: "By majority vote", labelZh: "由成员多数投票决定" },
          ],
        },
        {
          id: "voting",
          type: "select",
          label: "Voting Rights",
          labelZh: "投票权",
          required: true,
          options: [
            { value: "Each member votes in proportion to their ownership interest", label: "Proportional to ownership", labelZh: "按持股比例" },
            { value: "Each member has one equal vote", label: "Equal votes (one per member)", labelZh: "每位成员一票" },
          ],
        },
      ],
    },
  ],
  document: {
    title: "LLC Operating Agreement",
    titleZh: "LLC 运营协议",
    htmlContent: `
<div class="doc-header">
  <h1>LLC OPERATING AGREEMENT<br><span class="zh">有限责任公司运营协议</span></h1>
  <p class="doc-date">{{formation_date}}</p>
</div>

<p>This Operating Agreement ("Agreement") of <strong>{{company_name}}</strong> (the "Company") is entered into as of <strong>{{formation_date}}</strong>, by and among its members listed herein.</p>
<p>本运营协议（"协议"）由 <strong>{{company_name}}</strong>（以下简称"公司"）各成员于 <strong>{{formation_date}}</strong> 共同签订。</p>

<h2>1. FORMATION / 公司成立</h2>
<table class="doc-table">
  <tr><td><strong>Company Name / 公司名称</strong></td><td>{{company_name}}</td></tr>
  <tr><td><strong>State of Formation / 注册州</strong></td><td>{{state_of_formation}}</td></tr>
  <tr><td><strong>Principal Address / 主营地址</strong></td><td>{{principal_address}}</td></tr>
  <tr><td><strong>Fiscal Year / 财务年度</strong></td><td>Ends {{fiscal_year}}</td></tr>
  <tr><td><strong>Business Purpose / 经营目的</strong></td><td>{{business_purpose}}</td></tr>
</table>

<h2>2. MEMBERS & CAPITAL / 成员与出资</h2>
<table class="doc-table">
  <tr>
    <td><strong>Member / 成员</strong></td>
    <td><strong>Address / 地址</strong></td>
    <td><strong>Ownership / 持股</strong></td>
    <td><strong>Capital / 出资</strong></td>
  </tr>
  <tr>
    <td>{{member1_name}}</td>
    <td>{{member1_address}}</td>
    <td>{{member1_ownership}}%</td>
    <td>$\{{member1_contribution}}</td>
  </tr>
  {{#member2_name}}
  <tr>
    <td>{{member2_name}}</td>
    <td>{{member2_address}}</td>
    <td>{{member2_ownership}}%</td>
    <td>$\{{member2_contribution}}</td>
  </tr>
  {{/member2_name}}
</table>

<h2>3. MANAGEMENT / 管理结构</h2>
<p>The Company shall be <strong>{{management_type}}</strong>. {{#managing_member}}The designated Manager is <strong>{{managing_member}}</strong>.{{/managing_member}}</p>
<p>公司采用 <strong>{{management_type}}</strong> 模式。{{#managing_member}}指定经理为 <strong>{{managing_member}}</strong>。{{/managing_member}}</p>
<p><strong>Voting Rights / 投票权：</strong> {{voting}}</p>

<h2>4. DISTRIBUTIONS / 利润分配</h2>
<p>Profits and losses shall be allocated, and distributions made: <strong>{{distributions}}</strong>.</p>
<p>公司利润与亏损按如下方式分配：<strong>{{distributions}}</strong>。</p>

<h2>5. LIABILITY / 责任限制</h2>
<p>No member shall be personally liable for the debts or obligations of the Company solely by reason of being a member, except as required by the laws of the State of <strong>{{state_of_formation}}</strong>.</p>
<p>除 <strong>{{state_of_formation}}州</strong>法律另有规定外，任何成员不因其成员身份对公司的债务或义务承担个人责任。</p>

<h2>6. DISSOLUTION / 解散</h2>
<p>The Company shall be dissolved upon: (a) unanimous written consent of all members; (b) occurrence of any event that requires dissolution under applicable law; or (c) judicial decree.</p>
<p>以下情形发生时公司解散：（a）全体成员一致书面同意；（b）适用法律规定须解散；（c）法院裁决。</p>

<div class="signature-section">
  <div class="sig-block">
    <div class="sig-line"></div>
    <p><strong>Member 1 / 成员 1</strong></p>
    <p>{{member1_name}}</p>
    <p>Date / 日期：________________</p>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <p><strong>Member 2 / 成员 2</strong></p>
    <p>{{member2_name}}</p>
    <p>Date / 日期：________________</p>
  </div>
</div>
`,
    disclaimerZh: "本 LLC 运营协议模板仅供参考，不构成法律建议。各州 LLC 法律存在差异，强烈建议在执业律师协助下制定适合您具体情况的运营协议。",
    disclaimer: "This LLC Operating Agreement template is for reference only and does not constitute legal advice. LLC laws vary by state. Consult a licensed business attorney.",
  },
};

// ─── 模板 9：劳动 / 雇佣合同 (Employment Agreement) ──────────────────────────
const employmentAgreementConfig: FormConfig = {
  steps: [
    {
      id: "employer",
      title: "Employer & Position",
      titleZh: "雇主与职位信息",
      descriptionZh: "请填写雇主公司及职位的基本信息",
      fields: [
        { id: "employer_name", type: "text", label: "Employer Name / Company", labelZh: "雇主 / 公司名称", required: true, colSpan: 2 },
        { id: "employer_address", type: "text", label: "Employer Address", labelZh: "雇主地址", required: true, colSpan: 2 },
        { id: "job_title", type: "text", label: "Job Title / Position", labelZh: "职位名称", required: true },
        { id: "department", type: "text", label: "Department (Optional)", labelZh: "所在部门（选填）" },
        { id: "start_date", type: "date", label: "Employment Start Date", labelZh: "入职日期", required: true },
        {
          id: "employment_type",
          type: "select",
          label: "Employment Type",
          labelZh: "雇佣类型",
          required: true,
          options: [
            { value: "Full-Time", label: "Full-Time", labelZh: "全职" },
            { value: "Part-Time", label: "Part-Time", labelZh: "兼职" },
            { value: "Contract / 1099", label: "Contract / 1099", labelZh: "合同工 / 1099" },
          ],
        },
        {
          id: "work_location",
          type: "select",
          label: "Work Location",
          labelZh: "工作地点",
          required: true,
          options: [
            { value: "On-site", label: "On-site", labelZh: "现场办公" },
            { value: "Remote", label: "Remote", labelZh: "远程办公" },
            { value: "Hybrid", label: "Hybrid", labelZh: "混合办公" },
          ],
        },
        { id: "state", type: "state", label: "State (Governing Law)", labelZh: "所在州（适用法律）", required: true, options: US_STATES },
      ],
    },
    {
      id: "employee",
      title: "Employee Information",
      titleZh: "员工信息",
      fields: [
        { id: "employee_name", type: "text", label: "Employee Full Name", labelZh: "员工全名", required: true, colSpan: 2 },
        { id: "employee_address", type: "text", label: "Employee Address", labelZh: "员工地址", required: true, colSpan: 2 },
        { id: "employee_email", type: "email", label: "Employee Email", labelZh: "员工邮箱", required: true },
      ],
    },
    {
      id: "compensation",
      title: "Compensation & Benefits",
      titleZh: "薪酬与福利",
      descriptionZh: "请填写薪资、福利及其他合同条款",
      fields: [
        {
          id: "pay_type",
          type: "select",
          label: "Pay Type",
          labelZh: "薪资类型",
          required: true,
          options: [
            { value: "Annual Salary", label: "Annual Salary", labelZh: "年薪" },
            { value: "Hourly Wage", label: "Hourly Wage", labelZh: "时薪" },
          ],
        },
        { id: "pay_amount", type: "money", label: "Salary / Hourly Rate (USD)", labelZh: "年薪 / 时薪（美元）", required: true },
        {
          id: "pay_frequency",
          type: "select",
          label: "Pay Frequency",
          labelZh: "发薪频率",
          required: true,
          options: [
            { value: "Bi-weekly", label: "Bi-weekly (every 2 weeks)", labelZh: "每两周" },
            { value: "Semi-monthly", label: "Semi-monthly (1st & 15th)", labelZh: "每月两次" },
            { value: "Monthly", label: "Monthly", labelZh: "每月" },
            { value: "Weekly", label: "Weekly", labelZh: "每周" },
          ],
        },
        {
          id: "benefits",
          type: "textarea",
          label: "Benefits (Optional)",
          labelZh: "福利待遇（选填）",
          colSpan: 2,
          placeholder: "e.g., Health insurance, 10 days PTO, 401(k) matching up to 3%",
        },
        {
          id: "at_will",
          type: "select",
          label: "At-Will Employment",
          labelZh: "随意雇佣条款",
          required: true,
          options: [
            { value: "Yes — either party may terminate at any time with or without cause", label: "Yes (at-will)", labelZh: "是 — 双方均可随时无理由终止" },
            { value: "No — termination requires cause or notice period", label: "No (requires cause)", labelZh: "否 — 须有正当理由或提前通知" },
          ],
        },
        {
          id: "notice_period",
          type: "select",
          label: "Notice Period (if non-at-will)",
          labelZh: "提前通知期限（如适用）",
          options: [
            { value: "2 weeks", label: "2 weeks", labelZh: "2 周" },
            { value: "30 days", label: "30 days", labelZh: "30 天" },
            { value: "60 days", label: "60 days", labelZh: "60 天" },
            { value: "90 days", label: "90 days", labelZh: "90 天" },
          ],
        },
        {
          id: "non_compete",
          type: "select",
          label: "Non-Compete Clause",
          labelZh: "竞业禁止条款",
          required: true,
          options: [
            { value: "No non-compete clause included", label: "No non-compete", labelZh: "不含竞业禁止" },
            { value: "6-month non-compete within same industry in same state", label: "6 months, same state", labelZh: "同州同行业 6 个月" },
            { value: "12-month non-compete within same industry in same state", label: "12 months, same state", labelZh: "同州同行业 12 个月" },
          ],
        },
        {
          id: "confidentiality",
          type: "select",
          label: "Confidentiality Agreement",
          labelZh: "保密协议",
          required: true,
          options: [
            { value: "Included — Employee agrees to keep all company information confidential", label: "Included", labelZh: "包含 — 员工同意对公司信息保密" },
            { value: "Not included", label: "Not included", labelZh: "不包含" },
          ],
        },
      ],
    },
  ],
  document: {
    title: "Employment Agreement",
    titleZh: "劳动 / 雇佣合同",
    htmlContent: `
<div class="doc-header">
  <h1>EMPLOYMENT AGREEMENT<br><span class="zh">劳动 / 雇佣合同</span></h1>
  <p class="doc-date">Effective / 生效日期：{{start_date}}</p>
</div>

<p>This Employment Agreement ("Agreement") is entered into as of <strong>{{start_date}}</strong>, by and between:</p>
<p>本劳动合同（"合同"）由以下双方于 <strong>{{start_date}}</strong> 签订：</p>

<div class="party-block">
  <p><strong>Employer / 雇主：</strong> {{employer_name}}, {{employer_address}}</p>
  <p><strong>Employee / 员工：</strong> {{employee_name}}, {{employee_address}}, {{employee_email}}</p>
</div>

<h2>1. POSITION / 职位</h2>
<table class="doc-table">
  <tr><td><strong>Job Title / 职位</strong></td><td>{{job_title}}{{#department}} — {{department}}{{/department}}</td></tr>
  <tr><td><strong>Start Date / 入职日期</strong></td><td>{{start_date}}</td></tr>
  <tr><td><strong>Employment Type / 类型</strong></td><td>{{employment_type}}</td></tr>
  <tr><td><strong>Work Location / 地点</strong></td><td>{{work_location}}</td></tr>
  <tr><td><strong>Governing Law / 适用法律</strong></td><td>State of {{state}}</td></tr>
</table>

<h2>2. COMPENSATION / 薪酬</h2>
<table class="doc-table">
  <tr><td><strong>Pay Type / 薪资类型</strong></td><td>{{pay_type}}</td></tr>
  <tr><td><strong>Amount / 金额</strong></td><td>USD \${{pay_amount}}</td></tr>
  <tr><td><strong>Pay Frequency / 发薪频率</strong></td><td>{{pay_frequency}}</td></tr>
</table>

{{#benefits}}
<h2>3. BENEFITS / 福利待遇</h2>
<p>{{benefits}}</p>
{{/benefits}}

<h2>4. AT-WILL EMPLOYMENT / 雇佣关系</h2>
<p>{{at_will}}{{#notice_period}} Notice Period / 通知期限：{{notice_period}}.{{/notice_period}}</p>

<h2>5. CONFIDENTIALITY / 保密</h2>
<p>{{confidentiality}}</p>

<h2>6. NON-COMPETE / 竞业限制</h2>
<p>{{non_compete}}</p>

<h2>7. ENTIRE AGREEMENT / 完整协议</h2>
<p>This Agreement constitutes the entire agreement between the parties with respect to Employee's employment and supersedes all prior understandings.</p>
<p>本合同构成双方就雇佣关系所达成的完整协议，并取代此前所有口头或书面约定。</p>

<div class="signature-section">
  <div class="sig-block">
    <div class="sig-line"></div>
    <p><strong>Employer / 雇主</strong></p>
    <p>{{employer_name}}</p>
    <p>Date / 日期：________________</p>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <p><strong>Employee / 员工</strong></p>
    <p>{{employee_name}}</p>
    <p>Date / 日期：________________</p>
  </div>
</div>
`,
    disclaimerZh: "各州劳动法差异较大（最低工资、加班规定、竞业限制可执行性等），本模板仅供参考，不构成法律建议。重要雇佣关系建议委托劳动法律师审阅。",
    disclaimer: "Employment laws vary significantly by state. This template is for reference only. For important employment relationships, have a labor attorney review the agreement.",
  },
};

// ─── 导出所有模板 ─────────────────────────────────────────────────────────────
export const FORM_TEMPLATES: Array<{
  slug: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  category: string;
  isFeatured: boolean;
  estimatedMinutes: number;
  sortOrder: number;
  config: FormConfig;
}> = [
  {
    slug: "vehicle-bill-of-sale",
    title: "Vehicle Bill of Sale",
    titleZh: "车辆买卖协议",
    description: "Legally transfer ownership of a car, truck, or motorcycle with a signed bill of sale.",
    descriptionZh: "合法转让汽车、卡车或摩托车的所有权，包含双方签名的完整协议。",
    category: "CIVIL",
    isFeatured: true,
    estimatedMinutes: 8,
    sortOrder: 1,
    config: vehicleBillOfSaleConfig,
  },
  {
    slug: "promissory-note",
    title: "Promissory Note (IOU / Loan Agreement)",
    titleZh: "借据 / 欠条",
    description: "Document a personal or business loan with a formal promissory note.",
    descriptionZh: "记录个人或商业借款，正式规范双方权利义务，具有法律效力。",
    category: "CIVIL",
    isFeatured: true,
    estimatedMinutes: 5,
    sortOrder: 2,
    config: promissoryNoteConfig,
  },
  {
    slug: "demand-letter-payment",
    title: "Demand Letter for Payment",
    titleZh: "催款函",
    description: "Send a formal demand letter to collect money owed to you.",
    descriptionZh: "向欠款方发出正式法律催告函，要求在期限内偿还欠款，必要时可作为诉讼前置文件。",
    category: "CIVIL",
    isFeatured: false,
    estimatedMinutes: 6,
    sortOrder: 3,
    config: demandLetterConfig,
  },
  {
    slug: "lease-termination-notice",
    title: "Lease Termination Notice",
    titleZh: "租约终止通知",
    description: "Formally notify your landlord of your intention to vacate the rental property.",
    descriptionZh: "正式通知房东终止租约、搬出租房，保护自身权益并要求退还押金。",
    category: "REAL_ESTATE",
    isFeatured: true,
    estimatedMinutes: 5,
    sortOrder: 4,
    config: leaseTerminationConfig,
  },
  {
    slug: "non-disclosure-agreement",
    title: "Non-Disclosure Agreement (NDA)",
    titleZh: "保密协议（NDA）",
    description: "Protect confidential business information with a mutual or one-way NDA.",
    descriptionZh: "保护商业秘密和机密信息，适用于商业洽谈、合作伙伴、员工等场景。",
    category: "BUSINESS",
    isFeatured: true,
    estimatedMinutes: 7,
    sortOrder: 5,
    config: ndaConfig,
  },
  {
    slug: "simple-will",
    title: "Last Will and Testament (Simple)",
    titleZh: "简易遗嘱",
    description: "Create a basic last will and testament to designate beneficiaries, executor, and guardian for minor children.",
    descriptionZh: "制定遗嘱指定继承人、遗嘱执行人及未成年子女监护人，保障身后财产按意愿分配。",
    category: "FAMILY",
    isFeatured: true,
    estimatedMinutes: 10,
    sortOrder: 6,
    config: simpleWillConfig,
  },
  {
    slug: "residential-lease-agreement",
    title: "Residential Lease Agreement",
    titleZh: "住宅租赁协议",
    description: "A complete bilingual residential lease agreement covering rent, deposit, utilities, and pet policy.",
    descriptionZh: "完整的住宅租赁协议，涵盖租金、押金、水电责任、宠物政策等核心条款，中英双语版本。",
    category: "REAL_ESTATE",
    isFeatured: true,
    estimatedMinutes: 12,
    sortOrder: 7,
    config: residentialLeaseConfig,
  },
  {
    slug: "llc-operating-agreement",
    title: "LLC Operating Agreement",
    titleZh: "LLC 运营协议",
    description: "Establish the governance structure for a single or multi-member LLC, including ownership, management, and distributions.",
    descriptionZh: "为单人或多人 LLC 建立运营规则，涵盖持股结构、管理权限、利润分配等核心条款。",
    category: "BUSINESS",
    isFeatured: false,
    estimatedMinutes: 15,
    sortOrder: 8,
    config: llcOperatingAgreementConfig,
  },
  {
    slug: "employment-agreement",
    title: "Employment Agreement",
    titleZh: "劳动 / 雇佣合同",
    description: "A bilingual employment agreement covering position, salary, benefits, confidentiality, and non-compete.",
    descriptionZh: "中英双语劳动合同，涵盖职位、薪资、福利、保密义务、竞业限制等关键雇佣条款。",
    category: "LABOR",
    isFeatured: true,
    estimatedMinutes: 10,
    sortOrder: 9,
    config: employmentAgreementConfig,
  },
];
