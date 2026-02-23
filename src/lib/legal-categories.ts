// ─── 法律分类总配置 ────────────────────────────────────────────────────────────
// 单一数据源：前端 UI、seed 脚本、表单全部从此引用

export type CategoryKey =
  | "IMMIGRATION"
  | "CRIMINAL"
  | "CIVIL"
  | "REAL_ESTATE"
  | "FAMILY"
  | "BUSINESS"
  | "ESTATE_PLAN"
  | "LABOR"
  | "TAX"
  | "OTHER";

export type SubCategoryItem = {
  slug: string;
  nameZh: string;
  nameEn: string;
  group: string;
  hot?: boolean;
  sortOrder: number;
};

export type CategoryConfig = {
  key: CategoryKey;
  nameZh: string;
  nameEn: string;
  emoji: string;
  color: string;          // Tailwind bg color for cards
  textColor: string;      // Tailwind text color
  borderColor: string;    // Tailwind border color
  description: string;
  subCategories: SubCategoryItem[];
};

export const LEGAL_CATEGORIES: CategoryConfig[] = [
  // ── 1. 移民 ─────────────────────────────────────────────────────────────────
  {
    key: "IMMIGRATION",
    nameZh: "移民法律",
    nameEn: "Immigration Law",
    emoji: "✈️",
    color: "bg-blue-50",
    textColor: "text-blue-900",
    borderColor: "border-blue-300",
    description: "绿卡、签证、庇护、入籍等所有移民事务",
    subCategories: [
      // 家庭类移民
      { slug: "green-card-family",      nameZh: "亲属绿卡申请",     nameEn: "Family Green Card",        group: "家庭类移民", hot: true,  sortOrder: 1 },
      { slug: "spouse-green-card",      nameZh: "配偶绿卡 I-485",   nameEn: "Spouse Green Card",        group: "家庭类移民", hot: true,  sortOrder: 2 },
      { slug: "k1-fiance-visa",         nameZh: "K1 未婚妻签证",    nameEn: "K-1 Fiancé Visa",          group: "家庭类移民", hot: false, sortOrder: 3 },
      { slug: "parent-immigration",     nameZh: "父母移民",          nameEn: "Parent Immigration",       group: "家庭类移民", hot: false, sortOrder: 4 },
      { slug: "sibling-immigration",    nameZh: "兄弟姐妹移民",      nameEn: "Sibling Immigration",      group: "家庭类移民", hot: false, sortOrder: 5 },
      { slug: "child-immigration",      nameZh: "子女移民",          nameEn: "Child Immigration",        group: "家庭类移民", hot: false, sortOrder: 6 },
      { slug: "marriage-interview",     nameZh: "婚姻绿卡面谈辅导",  nameEn: "Marriage Interview Prep",  group: "家庭类移民", hot: false, sortOrder: 7 },
      // 工作类移民
      { slug: "h1b-visa",               nameZh: "H1B 签证",          nameEn: "H-1B Visa",                group: "工作类移民", hot: true,  sortOrder: 10 },
      { slug: "l1-visa",                nameZh: "L1 签证",            nameEn: "L-1 Visa",                 group: "工作类移民", hot: false, sortOrder: 11 },
      { slug: "o1-extraordinary",       nameZh: "O1 杰出人才",        nameEn: "O-1 Extraordinary Ability",group: "工作类移民", hot: false, sortOrder: 12 },
      { slug: "eb1-eb2-eb3",            nameZh: "EB1/EB2/EB3",       nameEn: "EB-1/EB-2/EB-3",           group: "工作类移民", hot: false, sortOrder: 13 },
      { slug: "niw",                    nameZh: "NIW 国家利益豁免",   nameEn: "National Interest Waiver", group: "工作类移民", hot: true,  sortOrder: 14 },
      { slug: "perm",                   nameZh: "PERM 劳工证",        nameEn: "PERM Labor Cert.",         group: "工作类移民", hot: false, sortOrder: 15 },
      { slug: "h1b-layoff",             nameZh: "H1B 被裁身份转移",  nameEn: "H-1B Layoff Status",       group: "工作类移民", hot: true,  sortOrder: 16 },
      // 投资移民
      { slug: "eb5",                    nameZh: "EB5 投资移民",       nameEn: "EB-5 Investor Visa",       group: "投资移民",   hot: false, sortOrder: 20 },
      { slug: "eb5-dispute",            nameZh: "EB5 区域中心纠纷",   nameEn: "EB-5 Regional Center",     group: "投资移民",   hot: false, sortOrder: 21 },
      // 庇护与人道
      { slug: "asylum",                 nameZh: "政治庇护",           nameEn: "Asylum",                   group: "庇护与人道", hot: true,  sortOrder: 25 },
      { slug: "vawa",                   nameZh: "家暴绿卡 VAWA",      nameEn: "VAWA Green Card",          group: "庇护与人道", hot: false, sortOrder: 26 },
      { slug: "u-visa",                 nameZh: "U 签证",             nameEn: "U Visa",                   group: "庇护与人道", hot: false, sortOrder: 27 },
      { slug: "t-visa",                 nameZh: "T 签证",             nameEn: "T Visa",                   group: "庇护与人道", hot: false, sortOrder: 28 },
      { slug: "ice-detention",          nameZh: "ICE 拘留保释",       nameEn: "ICE Detention / Bail",     group: "庇护与人道", hot: false, sortOrder: 29 },
      // 入籍与身份
      { slug: "naturalization",         nameZh: "入籍申请 N-400",     nameEn: "Naturalization N-400",     group: "入籍与身份", hot: true,  sortOrder: 30 },
      { slug: "naturalization-denied",  nameZh: "入籍被拒",           nameEn: "Naturalization Denied",    group: "入籍与身份", hot: false, sortOrder: 31 },
      { slug: "green-card-revoked",     nameZh: "绿卡被撤销",         nameEn: "Green Card Revoked",       group: "入籍与身份", hot: false, sortOrder: 32 },
      { slug: "deportation",            nameZh: "驱逐出境案件",       nameEn: "Deportation Defense",      group: "入籍与身份", hot: false, sortOrder: 33 },
    ],
  },

  // ── 2. 刑事 ─────────────────────────────────────────────────────────────────
  {
    key: "CRIMINAL",
    nameZh: "刑事案件",
    nameEn: "Criminal Law",
    emoji: "🔒",
    color: "bg-rose-50",
    textColor: "text-rose-900",
    borderColor: "border-rose-300",
    description: "轻罪、重罪、DUI、家暴辩护等刑事案件",
    subCategories: [
      { slug: "shoplifting",            nameZh: "商店盗窃",           nameEn: "Shoplifting",              group: "轻罪",   hot: false, sortOrder: 1 },
      { slug: "minor-assault",          nameZh: "轻微袭击",           nameEn: "Minor Assault",            group: "轻罪",   hot: false, sortOrder: 2 },
      { slug: "no-license-driving",     nameZh: "无证驾驶",           nameEn: "Driving Without License",  group: "轻罪",   hot: false, sortOrder: 3 },
      { slug: "robbery",                nameZh: "抢劫",               nameEn: "Robbery",                  group: "重罪",   hot: false, sortOrder: 10 },
      { slug: "gun-crime",              nameZh: "持枪犯罪",           nameEn: "Gun Crime",                group: "重罪",   hot: false, sortOrder: 11 },
      { slug: "drug-trafficking",       nameZh: "毒品贩卖",           nameEn: "Drug Trafficking",         group: "重罪",   hot: false, sortOrder: 12 },
      { slug: "fraud-white-collar",     nameZh: "欺诈/白领犯罪",      nameEn: "Fraud / White Collar",     group: "重罪",   hot: false, sortOrder: 13 },
      { slug: "domestic-violence",      nameZh: "家暴指控辩护",       nameEn: "Domestic Violence Defense",group: "家庭暴力", hot: true, sortOrder: 20 },
      { slug: "restraining-order",      nameZh: "限制令申请/抗辩",    nameEn: "Restraining Order",        group: "家庭暴力", hot: false,sortOrder: 21 },
      { slug: "dui-first",              nameZh: "首次酒驾 DUI",       nameEn: "First DUI",                group: "DUI酒驾", hot: true, sortOrder: 25 },
      { slug: "dui-refusal",            nameZh: "拒绝酒精测试",       nameEn: "DUI Test Refusal",         group: "DUI酒驾", hot: false, sortOrder: 26 },
      { slug: "license-hearing",        nameZh: "吊销驾照听证",       nameEn: "License Suspension Hrg.",  group: "DUI酒驾", hot: false, sortOrder: 27 },
    ],
  },

  // ── 3. 民事诉讼 ──────────────────────────────────────────────────────────────
  {
    key: "CIVIL",
    nameZh: "民事诉讼",
    nameEn: "Civil Litigation",
    emoji: "⚖️",
    color: "bg-purple-50",
    textColor: "text-purple-900",
    borderColor: "border-purple-300",
    description: "合同纠纷、债务追讨、人身伤害、欺诈等",
    subCategories: [
      { slug: "contract-breach",        nameZh: "商业合同违约",       nameEn: "Contract Breach",          group: "合同纠纷", hot: true,  sortOrder: 1 },
      { slug: "partnership-dispute",    nameZh: "合作纠纷",           nameEn: "Partnership Dispute",      group: "合同纠纷", hot: false, sortOrder: 2 },
      { slug: "service-contract",       nameZh: "服务合同纠纷",       nameEn: "Service Contract",         group: "合同纠纷", hot: false, sortOrder: 3 },
      { slug: "debt-collection",        nameZh: "借款/欠款追讨",      nameEn: "Debt Collection",          group: "金钱债务", hot: false, sortOrder: 10 },
      { slug: "small-claims",           nameZh: "小额法庭",           nameEn: "Small Claims Court",       group: "金钱债务", hot: true,  sortOrder: 11 },
      { slug: "investment-fraud",       nameZh: "投资诈骗",           nameEn: "Investment Fraud",         group: "欺诈诈骗", hot: true,  sortOrder: 20 },
      { slug: "crypto-fraud",           nameZh: "加密货币诈骗",       nameEn: "Crypto Fraud",             group: "欺诈诈骗", hot: true,  sortOrder: 21 },
      { slug: "asset-recovery",         nameZh: "资产追回",           nameEn: "Asset Recovery",           group: "欺诈诈骗", hot: false, sortOrder: 22 },
      { slug: "car-accident",           nameZh: "车祸索赔",           nameEn: "Car Accident",             group: "人身伤害", hot: true,  sortOrder: 30 },
      { slug: "slip-fall",              nameZh: "滑倒摔伤",           nameEn: "Slip & Fall",              group: "人身伤害", hot: false, sortOrder: 31 },
      { slug: "medical-malpractice",    nameZh: "医疗事故",           nameEn: "Medical Malpractice",      group: "人身伤害", hot: false, sortOrder: 32 },
    ],
  },

  // ── 4. 房产地产 ──────────────────────────────────────────────────────────────
  {
    key: "REAL_ESTATE",
    nameZh: "房产地产",
    nameEn: "Real Estate Law",
    emoji: "🏠",
    color: "bg-emerald-50",
    textColor: "text-emerald-900",
    borderColor: "border-emerald-300",
    description: "买卖过户、租约、驱逐、法拍房等房产事务",
    subCategories: [
      { slug: "home-purchase",          nameZh: "买卖房产过户",       nameEn: "Home Purchase / Sale",     group: "交易过户", hot: true,  sortOrder: 1 },
      { slug: "commercial-real-estate", nameZh: "商业地产交易",       nameEn: "Commercial Real Estate",   group: "交易过户", hot: false, sortOrder: 2 },
      { slug: "lease-dispute",          nameZh: "租约纠纷",           nameEn: "Lease Dispute",            group: "租赁纠纷", hot: true,  sortOrder: 10 },
      { slug: "eviction",               nameZh: "房东驱逐房客",       nameEn: "Eviction",                 group: "租赁纠纷", hot: true,  sortOrder: 11 },
      { slug: "foreclosure",            nameZh: "房屋止赎",           nameEn: "Foreclosure",              group: "止赎拍卖", hot: false, sortOrder: 20 },
      { slug: "foreclosure-invest",     nameZh: "法拍房投资纠纷",     nameEn: "Foreclosure Investment",   group: "止赎拍卖", hot: false, sortOrder: 21 },
      { slug: "hoa-dispute",            nameZh: "HOA 纠纷",           nameEn: "HOA Dispute",              group: "其他",    hot: false, sortOrder: 30 },
      { slug: "property-inheritance",   nameZh: "房产继承",           nameEn: "Property Inheritance",     group: "其他",    hot: false, sortOrder: 31 },
      { slug: "title-dispute",          nameZh: "地契纠纷",           nameEn: "Title Dispute",            group: "其他",    hot: false, sortOrder: 32 },
    ],
  },

  // ── 5. 家庭法律 ──────────────────────────────────────────────────────────────
  {
    key: "FAMILY",
    nameZh: "家庭法律",
    nameEn: "Family Law",
    emoji: "👨‍👩‍👧",
    color: "bg-pink-50",
    textColor: "text-pink-900",
    borderColor: "border-pink-300",
    description: "离婚、财产分割、抚养权、家暴保护令等",
    subCategories: [
      { slug: "divorce",                nameZh: "离婚",               nameEn: "Divorce",                  group: "婚姻", hot: true,  sortOrder: 1 },
      { slug: "property-division",      nameZh: "财产分割",           nameEn: "Property Division",        group: "婚姻", hot: true,  sortOrder: 2 },
      { slug: "prenuptial",             nameZh: "婚前协议",           nameEn: "Prenuptial Agreement",     group: "婚姻", hot: false, sortOrder: 3 },
      { slug: "international-divorce",  nameZh: "跨国离婚",           nameEn: "International Divorce",    group: "婚姻", hot: false, sortOrder: 4 },
      { slug: "child-custody",          nameZh: "抚养权争夺",         nameEn: "Child Custody",            group: "子女", hot: true,  sortOrder: 10 },
      { slug: "child-support",          nameZh: "抚养费",             nameEn: "Child Support",            group: "子女", hot: false, sortOrder: 11 },
      { slug: "domestic-violence-order",nameZh: "家暴保护令",         nameEn: "Domestic Violence Order",  group: "保护", hot: true,  sortOrder: 20 },
    ],
  },

  // ── 6. 商业公司 ──────────────────────────────────────────────────────────────
  {
    key: "BUSINESS",
    nameZh: "商业公司",
    nameEn: "Business Law",
    emoji: "🏢",
    color: "bg-indigo-50",
    textColor: "text-indigo-900",
    borderColor: "border-indigo-300",
    description: "公司注册、股东纠纷、商标、并购等",
    subCategories: [
      { slug: "llc-formation",          nameZh: "公司注册 LLC/Corp",  nameEn: "LLC / Corp Formation",     group: "公司设立", hot: true,  sortOrder: 1 },
      { slug: "shareholder-dispute",    nameZh: "股东纠纷",           nameEn: "Shareholder Dispute",      group: "公司治理", hot: false, sortOrder: 10 },
      { slug: "partnership-agreement",  nameZh: "合伙协议",           nameEn: "Partnership Agreement",    group: "公司治理", hot: false, sortOrder: 11 },
      { slug: "ma",                     nameZh: "并购",               nameEn: "M&A",                      group: "公司治理", hot: false, sortOrder: 12 },
      { slug: "trademark-registration", nameZh: "商标注册",           nameEn: "Trademark Registration",   group: "知识产权", hot: true,  sortOrder: 20 },
      { slug: "trademark-infringement", nameZh: "商标侵权",           nameEn: "Trademark Infringement",   group: "知识产权", hot: false, sortOrder: 21 },
      { slug: "business-contract",      nameZh: "商业合同审核",       nameEn: "Business Contract Review", group: "合同",    hot: false, sortOrder: 30 },
      { slug: "business-litigation",    nameZh: "商业诉讼",           nameEn: "Business Litigation",      group: "合同",    hot: false, sortOrder: 31 },
    ],
  },

  // ── 7. 信托遗产 ──────────────────────────────────────────────────────────────
  {
    key: "ESTATE_PLAN",
    nameZh: "信托遗产",
    nameEn: "Estate Planning",
    emoji: "📜",
    color: "bg-amber-50",
    textColor: "text-amber-900",
    borderColor: "border-amber-300",
    description: "遗嘱、信托、遗产认证、资产保护规划",
    subCategories: [
      { slug: "will-drafting",          nameZh: "遗嘱起草",           nameEn: "Will Drafting",            group: "基础规划", hot: true,  sortOrder: 1 },
      { slug: "trust-setup",            nameZh: "信托设立",           nameEn: "Trust Setup",              group: "基础规划", hot: true,  sortOrder: 2 },
      { slug: "probate",                nameZh: "遗产认证 Probate",   nameEn: "Probate",                  group: "遗产管理", hot: true,  sortOrder: 10 },
      { slug: "irrevocable-trust",      nameZh: "不可撤销信托修改",   nameEn: "Irrevocable Trust Mod.",   group: "遗产管理", hot: false, sortOrder: 11 },
      { slug: "special-needs-trust",    nameZh: "特殊需求信托",       nameEn: "Special Needs Trust",      group: "遗产管理", hot: false, sortOrder: 12 },
      { slug: "asset-protection",       nameZh: "资产保护规划",       nameEn: "Asset Protection",         group: "资产保护", hot: false, sortOrder: 20 },
    ],
  },

  // ── 8. 劳工雇佣 ──────────────────────────────────────────────────────────────
  {
    key: "LABOR",
    nameZh: "劳工雇佣",
    nameEn: "Employment Law",
    emoji: "💼",
    color: "bg-orange-50",
    textColor: "text-orange-900",
    borderColor: "border-orange-300",
    description: "工资纠纷、非法解雇、职场歧视、性骚扰等",
    subCategories: [
      { slug: "wage-dispute",           nameZh: "工资纠纷",           nameEn: "Wage Dispute",             group: "薪酬", hot: true,  sortOrder: 1 },
      { slug: "overtime-claim",         nameZh: "加班费索赔",         nameEn: "Overtime Pay Claim",       group: "薪酬", hot: false, sortOrder: 2 },
      { slug: "wrongful-termination",   nameZh: "非法解雇",           nameEn: "Wrongful Termination",     group: "解雇", hot: true,  sortOrder: 10 },
      { slug: "workplace-discrimination",nameZh: "职场歧视",          nameEn: "Workplace Discrimination", group: "歧视", hot: true,  sortOrder: 20 },
      { slug: "sexual-harassment",      nameZh: "性骚扰投诉",         nameEn: "Sexual Harassment",        group: "歧视", hot: false, sortOrder: 21 },
      { slug: "labor-arbitration",      nameZh: "劳工仲裁",           nameEn: "Labor Arbitration",        group: "仲裁", hot: false, sortOrder: 30 },
    ],
  },

  // ── 9. 税务财务 ──────────────────────────────────────────────────────────────
  {
    key: "TAX",
    nameZh: "税务财务",
    nameEn: "Tax & Financial Law",
    emoji: "🧾",
    color: "bg-teal-50",
    textColor: "text-teal-900",
    borderColor: "border-teal-300",
    description: "IRS 审计、税务欠款、海外资产申报等",
    subCategories: [
      { slug: "irs-audit",              nameZh: "IRS 审计",           nameEn: "IRS Audit",                group: "税务", hot: true,  sortOrder: 1 },
      { slug: "tax-debt",               nameZh: "税务欠款协商",       nameEn: "Tax Debt Negotiation",     group: "税务", hot: true,  sortOrder: 2 },
      { slug: "business-tax",           nameZh: "公司税务规划",       nameEn: "Business Tax Planning",    group: "税务", hot: false, sortOrder: 3 },
      { slug: "fbar-fatca",             nameZh: "海外资产申报 FBAR",  nameEn: "FBAR / FATCA Compliance",  group: "海外", hot: true,  sortOrder: 10 },
    ],
  },

  // ── 10. 其他 ─────────────────────────────────────────────────────────────────
  {
    key: "OTHER",
    nameZh: "其他专项",
    nameEn: "Other Services",
    emoji: "📋",
    color: "bg-slate-50",
    textColor: "text-slate-900",
    borderColor: "border-slate-300",
    description: "破产、交通罚单、知识产权、行政听证等",
    subCategories: [
      { slug: "bankruptcy",             nameZh: "破产申请",           nameEn: "Bankruptcy",               group: "财务", hot: false, sortOrder: 1 },
      { slug: "traffic-ticket",         nameZh: "交通罚单",           nameEn: "Traffic Ticket",           group: "交通", hot: true,  sortOrder: 10 },
      { slug: "ip-patent",              nameZh: "知识产权/专利",      nameEn: "IP / Patent",              group: "知产", hot: false, sortOrder: 20 },
      { slug: "data-privacy",           nameZh: "数据隐私",           nameEn: "Data Privacy",             group: "知产", hot: false, sortOrder: 21 },
      { slug: "gun-permit",             nameZh: "枪证申请",           nameEn: "Gun Permit",               group: "行政", hot: false, sortOrder: 30 },
      { slug: "admin-hearing",          nameZh: "行政听证",           nameEn: "Admin Hearing",            group: "行政", hot: false, sortOrder: 31 },
    ],
  },
];

// ── 便捷查找 ──────────────────────────────────────────────────────────────────

export const CATEGORY_MAP = Object.fromEntries(
  LEGAL_CATEGORIES.map((c) => [c.key, c])
) as Record<CategoryKey, CategoryConfig>;

/** 所有热门细分服务（首页宫格用） */
export const HOT_SUB_CATEGORIES = LEGAL_CATEGORIES.flatMap((cat) =>
  cat.subCategories
    .filter((s) => s.hot)
    .map((s) => ({ ...s, categoryKey: cat.key, categoryNameZh: cat.nameZh, emoji: cat.emoji }))
).sort((a, b) => a.sortOrder - b.sortOrder);

/** 所有细分服务扁平列表（seed 用） */
export const ALL_SUB_CATEGORIES = LEGAL_CATEGORIES.flatMap((cat) =>
  cat.subCategories.map((s) => ({ ...s, category: cat.key }))
);
