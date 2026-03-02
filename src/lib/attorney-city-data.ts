// ─── 城市数据 ─────────────────────────────────────────────────────────────────
// 按华人聚居城市整理，用于律师目录 SEO 页面

export interface CityInfo {
  nameZh: string;
  nameEn: string;
  stateCode: string;
  stateNameZh: string;
  stateNameEn: string;
  stateSlug: string;
  chineseCommunity: string;  // 华人聚居地描述
  population: string;        // 大致华人人口
}

export const CITY_MAP: Record<string, CityInfo> = {
  "los-angeles": {
    nameZh: "洛杉矶",
    nameEn: "Los Angeles",
    stateCode: "CA",
    stateNameZh: "加州",
    stateNameEn: "California",
    stateSlug: "california",
    chineseCommunity: "圣盖博谷（蒙特雷公园、罗兰岗、钻石吧）、温努拉公园、尔湾",
    population: "40万+",
  },
  "san-francisco": {
    nameZh: "旧金山 / 湾区",
    nameEn: "San Francisco / Bay Area",
    stateCode: "CA",
    stateNameZh: "加州",
    stateNameEn: "California",
    stateSlug: "california",
    chineseCommunity: "旧金山唐人街、Richmond 区、Sunset 区、圣荷西、圣马特奥、弗里蒙特",
    population: "50万+",
  },
  "new-york": {
    nameZh: "纽约",
    nameEn: "New York City",
    stateCode: "NY",
    stateNameZh: "纽约州",
    stateNameEn: "New York",
    stateSlug: "new-york",
    chineseCommunity: "法拉盛（皇后区）、曼哈顿唐人街、布鲁克林日落公园、贝赛（Bayside）",
    population: "60万+",
  },
  "houston": {
    nameZh: "休斯顿",
    nameEn: "Houston",
    stateCode: "TX",
    stateNameZh: "德州",
    stateNameEn: "Texas",
    stateSlug: "texas",
    chineseCommunity: "Sugar Land、Bellaire、Katy、Clear Lake等华人聚居区",
    population: "10万+",
  },
  "dallas": {
    nameZh: "达拉斯 / 沃斯堡",
    nameEn: "Dallas / Fort Worth",
    stateCode: "TX",
    stateNameZh: "德州",
    stateNameEn: "Texas",
    stateSlug: "texas",
    chineseCommunity: "普莱诺（Plano）、艾伦（Allen）、卡罗顿等华人聚居区",
    population: "6万+",
  },
  "chicago": {
    nameZh: "芝加哥",
    nameEn: "Chicago",
    stateCode: "IL",
    stateNameZh: "伊利诺伊州",
    stateNameEn: "Illinois",
    stateSlug: "illinois",
    chineseCommunity: "Chinatown（华人区）、北郊罗林美道（Rolling Meadows）等",
    population: "8万+",
  },
  "seattle": {
    nameZh: "西雅图",
    nameEn: "Seattle",
    stateCode: "WA",
    stateNameZh: "华盛顿州",
    stateNameEn: "Washington",
    stateSlug: "washington",
    chineseCommunity: "贝尔维尤（Bellevue）、雷德蒙德（Redmond）、科克兰等科技城",
    population: "12万+",
  },
  "boston": {
    nameZh: "波士顿",
    nameEn: "Boston",
    stateCode: "MA",
    stateNameZh: "马萨诸塞州",
    stateNameEn: "Massachusetts",
    stateSlug: "massachusetts",
    chineseCommunity: "昆西（Quincy）、剑桥（Cambridge）、波士顿唐人街",
    population: "6万+",
  },
  "washington-dc": {
    nameZh: "华盛顿 DC 都会区",
    nameEn: "Washington DC Metro",
    stateCode: "VA",
    stateNameZh: "弗吉尼亚州",
    stateNameEn: "Virginia",
    stateSlug: "virginia",
    chineseCommunity: "麦克林（McLean）、维也纳（Vienna）、盖瑟斯堡（Gaithersburg）、洛克维尔",
    population: "10万+",
  },
  "atlanta": {
    nameZh: "亚特兰大",
    nameEn: "Atlanta",
    stateCode: "GA",
    stateNameZh: "佐治亚州",
    stateNameEn: "Georgia",
    stateSlug: "georgia",
    chineseCommunity: "约翰溪（Johns Creek）、Suwanee、桃树城（Peachtree City）",
    population: "5万+",
  },
  "las-vegas": {
    nameZh: "拉斯维加斯",
    nameEn: "Las Vegas",
    stateCode: "NV",
    stateNameZh: "内华达州",
    stateNameEn: "Nevada",
    stateSlug: "nevada",
    chineseCommunity: "春谷（Spring Valley）、亨德森（Henderson）、华人商业区",
    population: "5万+",
  },
  "miami": {
    nameZh: "迈阿密",
    nameEn: "Miami",
    stateCode: "FL",
    stateNameZh: "佛罗里达州",
    stateNameEn: "Florida",
    stateSlug: "florida",
    chineseCommunity: "北迈阿密、德尔雷海滩（Delray Beach）、布劳沃德县",
    population: "3万+",
  },
};

// ─── 常见问题（FAQ）数据 ──────────────────────────────────────────────────────
export const CATEGORY_FAQS: Record<string, { q: string; a: string }[]> = {
  IMMIGRATION: [
    { q: "在美国申请绿卡需要多长时间？", a: "绿卡处理时间因类型而异：家庭类绿卡通常需要1-10年，职业类绿卡（EB-1/EB-2）约1-5年，EB-3约5-10年。具体等待时间受国籍配额影响，华人（中国大陆出生）等待期通常较长。" },
    { q: "H-1B被裁员后有多长时间找新工作？", a: "H-1B持有者在失去工作后通常有60天的宽限期（Grace Period），在此期间需要找到新雇主做H-1B转移（Transfer），或申请其他身份，或离开美国。建议立即咨询移民律师。" },
    { q: "什么情况下需要聘请移民律师？", a: "当您的案情涉及以下情况时强烈建议聘请律师：曾有被拒记录、有犯罪记录、跨国离婚情况、庇护申请、驱逐出境听证，或任何复杂的身份问题。" },
    { q: "Law119 上的移民律师都有执照吗？", a: "是的。所有在 Law119 执业的律师均经过平台执照核验（Bar Verification），确保其持有有效的美国律师执照（通过各州 State Bar 认证），方可在平台接案。" },
  ],
  CRIMINAL: [
    { q: "被捕后第一步应该做什么？", a: "第一步：保持沉默（援引第五修正案权利），不接受警方问话；第二步：立即联系刑事辩护律师；第三步：如有需要请求获得翻译服务。记住：任何你说的话都可能被用来对付你。" },
    { q: "轻罪（Misdemeanor）和重罪（Felony）有什么区别？", a: "轻罪最高刑期通常不超过1年（在郡监狱服刑），重罪可判1年以上（在州或联邦监狱服刑）。重罪定罪会严重影响您的移民身份、工作机会和社会福利资格。" },
    { q: "DUI 定罪会影响绿卡或签证吗？", a: "DUI 本身不一定直接导致驱逐，但多次 DUI、伴随伤亡或伴随毒品犯罪的 DUI 可能影响绿卡申请和续签。强烈建议同时咨询刑事律师和移民律师。" },
  ],
  CIVIL: [
    { q: "民事诉讼和刑事诉讼有什么区别？", a: "刑事诉讼由政府检察官代表国家起诉，目的是惩罚犯罪行为；民事诉讼由受损害方个人或公司提起，目的是获得赔偿或强制执行权利。民事案件证明标准为「优势证据」，低于刑事案件的「排除合理怀疑」。" },
    { q: "遭遇加密货币诈骗还能追回资金吗？", a: "追回难度较大但并非不可能。可通过以下途径：向 FBI、FTC、SEC 举报；聘请专业律师提起民事诉讼；在某些情况下追踪链上资产。成功率取决于诈骗者是否可被识别定位。" },
    { q: "小额法庭（Small Claims Court）有什么限制？", a: "各州金额上限不同，加州为 $10,000，纽约为 $10,000，德州为 $20,000。通常不需要律师代理，但案情复杂的情况下律师咨询仍有价值。" },
  ],
  REAL_ESTATE: [
    { q: "买房需要律师参与吗？", a: "在部分州（如纽约、新泽西、马萨诸塞）法律要求律师参与房产交易；其他州通常不强制要求。但即使不强制，在交易金额较大或合同条款复杂时，聘请房产律师审查合同非常值得。" },
    { q: "房东驱逐房客需要经过法律程序吗？", a: "是的。美国任何州均不允许「自力驱逐」（更换门锁、断水断电等），必须通过正式的法律驱逐程序（Eviction/Unlawful Detainer）。违法驱逐可能导致房东承担巨额赔偿。" },
    { q: "HOA 纠纷如何解决？", a: "首先尝试与 HOA 书面沟通，要求说明依据；如无效可申请调解（Mediation）；最终可聘请律师提起诉讼。若 HOA 违反其自身章程或联邦/州法律，胜诉可能性较高。" },
  ],
  FAMILY: [
    { q: "离婚时如何分割在中国的资产？", a: "这是典型的「跨国离婚」问题，涉及中美两国法律。一般而言，美国法院可判决分割，但执行在中国的资产需通过中国法院认可，实际操作较复杂，需同时聘请精通两国法律的律师。" },
    { q: "孩子抚养权争夺中法院如何判定？", a: "美国法院以「子女最佳利益」（Best Interest of the Child）为核心原则，考虑因素包括：双方与子女的关系、各方提供稳定环境的能力、子女自身意愿（年龄足够时）、以及任何家暴记录。" },
    { q: "婚前协议（Prenuptial Agreement）有法律效力吗？", a: "有效力，但需满足：双方自愿签署、无胁迫、双方充分披露财产信息、有各自独立的律师代理、协议条款不违反公共政策。建议至少在婚前30天完成签署。" },
  ],
  BUSINESS: [
    { q: "LLC 和 Corporation（Corp）有什么区别？", a: "LLC（有限责任公司）灵活性更高，税务处理较简单（穿透税），适合小型企业；Corporation 结构更正式，可发行股票，适合计划融资或上市的企业。两者均提供个人资产保护。" },
    { q: "商标注册保护范围是什么？", a: "在美国，联邦商标注册（USPTO）提供全国范围保护；州注册仅保护该州。商标保护范围限于注册类别，一般有效期10年可续期。建议在启动品牌前先进行商标检索。" },
    { q: "遇到商业合同纠纷应该如何处理？", a: "首先仔细查看合同中的争议解决条款（仲裁还是诉讼？哪个州法律管辖？）；其次保留所有相关证据；然后向对方发送正式违约通知；最后根据条款决定是仲裁还是诉讼。" },
  ],
  ESTATE_PLAN: [
    { q: "没有遗嘱会怎样？", a: "如果没有遗嘱（Intestate），资产将按照所在州的无遗嘱继承法分配，通常按照配偶、子女、父母的顺序。这可能不符合您的意愿，且会大大增加家人处理遗产的时间和成本。" },
    { q: "信托（Trust）和遗嘱（Will）有什么区别？", a: "遗嘱在您去世后生效，需经过 Probate（遗产认证）程序，信息公开；信托可在生前生效，通常可绕过 Probate，保密性更强，效率更高。两者可以同时使用（Pour-over Will + Trust）。" },
    { q: "Probate 遗产认证程序需要多长时间？", a: "Probate 时间因州而异，简单案件约6-12个月，复杂案件或有遗产税的情况可能需要2-3年。加州的 Probate 尤其繁琐且费用高，因此在加州做好信托规划尤为重要。" },
  ],
  LABOR: [
    { q: "被非法解雇（Wrongful Termination）如何证明？", a: "需要证明解雇原因属于非法动机，如：因种族、性别、年龄、残疾、怀孕等受保护特征；因举报违法行为（Whistleblower）；因行使合法权利（请假、工人赔偿）。保留所有邮件、聊天记录和文件非常重要。" },
    { q: "雇主不支付加班费（Overtime）怎么办？", a: "联邦法（FLSA）规定，工作超过40小时/周须支付1.5倍工资。可向美国劳工部（DOL）投诉，或聘请劳工律师提起集体诉讼（Class Action）。许多律师在这类案件中采用「不胜不取费」模式。" },
    { q: "遭受职场歧视需要先做什么？", a: "在起诉雇主之前，通常需要先向联邦平等就业机会委员会（EEOC）提交歧视投诉，并等待 EEOC 出具「起诉权通知」（Right to Sue Letter），时限通常为180-300天内。" },
  ],
  TAX: [
    { q: "收到 IRS 审计通知应该怎么办？", a: "不要惊慌，仔细阅读通知类型（通讯审计、办公室审计还是实地审计）；收集相关年份的所有财务记录；强烈建议聘请税务律师或注册会计师代理应对，不建议独自应付审计官员。" },
    { q: "海外账户必须申报吗？", a: "是的。美国公民/居民在任何时点拥有海外金融账户总额超过 $10,000 须申报 FBAR（FinCEN 114）；部分情况还需申报 FATCA（Form 8938）。未申报处罚极重，最高可达账户余额50%/年。" },
    { q: "欠了大量税款无力偿还怎么办？", a: "IRS 提供多种解决方案：分期付款协议（Installment Agreement）、部分税款减免（Offer in Compromise）、目前无力支付（Currently Not Collectible）状态。税务律师可帮助您选择最有利的方案。" },
  ],
};

// ─── 专长数据 ─────────────────────────────────────────────────────────────────
export interface SpecialtyInfo {
  nameZh: string;
  nameEn: string;
  categoryKey: string;  // Prisma LegalCategory enum value
  emoji: string;
  description: string;
  keywords: string[];   // 搜索关键词，用于 SEO
}

export const SPECIALTY_MAP: Record<string, SpecialtyInfo> = {
  "immigration": {
    nameZh: "移民签证",
    nameEn: "Immigration",
    categoryKey: "IMMIGRATION",
    emoji: "✈️",
    description: "绿卡、H-1B、配偶签证、庇护、公民申请等移民法律事务",
    keywords: ["移民律师", "绿卡律师", "H-1B律师", "immigration attorney", "immigration lawyer"],
  },
  "criminal": {
    nameZh: "刑事辩护",
    nameEn: "Criminal Defense",
    categoryKey: "CRIMINAL",
    emoji: "⚖️",
    description: "刑事辩护、DUI/醉驾、毒品犯罪、盗窃、性犯罪等刑事案件",
    keywords: ["刑事律师", "DUI律师", "刑事辩护律师", "criminal defense attorney", "criminal lawyer"],
  },
  "real-estate": {
    nameZh: "房产地产",
    nameEn: "Real Estate",
    categoryKey: "REAL_ESTATE",
    emoji: "🏠",
    description: "房产买卖、租房纠纷、HOA问题、房东房客权益保护",
    keywords: ["房产律师", "地产律师", "real estate attorney", "property lawyer", "landlord tenant lawyer"],
  },
  "family": {
    nameZh: "家庭法律",
    nameEn: "Family Law",
    categoryKey: "FAMILY",
    emoji: "👨‍👩‍👧",
    description: "离婚、子女抚养、财产分割、家暴保护令、婚前协议",
    keywords: ["离婚律师", "家庭律师", "family law attorney", "divorce lawyer", "custody attorney"],
  },
  "business": {
    nameZh: "商业公司",
    nameEn: "Business Law",
    categoryKey: "BUSINESS",
    emoji: "🏢",
    description: "公司注册、合同起草、商业纠纷、商标版权、企业并购",
    keywords: ["商业律师", "公司律师", "business attorney", "corporate lawyer", "contract lawyer"],
  },
  "civil": {
    nameZh: "民事诉讼",
    nameEn: "Civil Litigation",
    categoryKey: "CIVIL",
    emoji: "📋",
    description: "个人伤害、合同纠纷、欺诈、债务追讨等民事诉讼",
    keywords: ["民事律师", "诉讼律师", "civil litigation attorney", "personal injury lawyer"],
  },
  "estate-planning": {
    nameZh: "遗产信托",
    nameEn: "Estate Planning",
    categoryKey: "ESTATE_PLAN",
    emoji: "📜",
    description: "遗嘱、信托、遗产规划、继承、遗嘱认证",
    keywords: ["遗产律师", "信托律师", "estate planning attorney", "probate lawyer", "trust attorney"],
  },
  "labor": {
    nameZh: "劳工雇佣",
    nameEn: "Employment Law",
    categoryKey: "LABOR",
    emoji: "💼",
    description: "劳资纠纷、非法解雇、职场歧视、工资追讨、劳工权益",
    keywords: ["劳工律师", "就业律师", "employment attorney", "labor lawyer", "wrongful termination lawyer"],
  },
  "tax": {
    nameZh: "税务财务",
    nameEn: "Tax Law",
    categoryKey: "TAX",
    emoji: "💰",
    description: "税务规划、IRS审计应对、涉税犯罪辩护、跨国税务",
    keywords: ["税务律师", "tax attorney", "IRS lawyer", "tax law attorney"],
  },
};
