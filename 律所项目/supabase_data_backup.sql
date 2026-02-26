SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict 1sf3bcDoqoRpOknaU9EiALeIKfot2qUr71LtNNLGJyM7UPitgqLlgJsSm6WYTpd

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: AttorneyProfile; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: AttorneyLanguage; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: AttorneyServiceArea; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: AttorneySpecialty; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ClientProfile; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Case; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Bid; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: CaseImage; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Conversation; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ChatMessage; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: DisclaimerAcceptance; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: LegalSubCategory; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."LegalSubCategory" ("id", "category", "slug", "nameZh", "nameEn", "group", "sortOrder", "hot", "createdAt") VALUES
	('cmltkndcj00009kx5bkspcsz2', 'IMMIGRATION', 'green-card-family', '亲属绿卡申请', 'Family Green Card', '家庭类移民', 1, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj00019kx5lsoe090a', 'IMMIGRATION', 'spouse-green-card', '配偶绿卡 I-485', 'Spouse Green Card', '家庭类移民', 2, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj00029kx5m3zjw2iy', 'IMMIGRATION', 'k1-fiance-visa', 'K1 未婚妻签证', 'K-1 Fiancé Visa', '家庭类移民', 3, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00039kx59zifklfu', 'IMMIGRATION', 'parent-immigration', '父母移民', 'Parent Immigration', '家庭类移民', 4, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00049kx502f3ss0z', 'IMMIGRATION', 'sibling-immigration', '兄弟姐妹移民', 'Sibling Immigration', '家庭类移民', 5, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00059kx5d9opob11', 'IMMIGRATION', 'child-immigration', '子女移民', 'Child Immigration', '家庭类移民', 6, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00069kx5kzp6wcdd', 'IMMIGRATION', 'marriage-interview', '婚姻绿卡面谈辅导', 'Marriage Interview Prep', '家庭类移民', 7, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00079kx5rcvfmndj', 'IMMIGRATION', 'h1b-visa', 'H1B 签证', 'H-1B Visa', '工作类移民', 10, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj00089kx5hxwjt391', 'IMMIGRATION', 'l1-visa', 'L1 签证', 'L-1 Visa', '工作类移民', 11, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00099kx5hgbf3ggv', 'IMMIGRATION', 'o1-extraordinary', 'O1 杰出人才', 'O-1 Extraordinary Ability', '工作类移民', 12, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000a9kx59hvvwjfu', 'IMMIGRATION', 'eb1-eb2-eb3', 'EB1/EB2/EB3', 'EB-1/EB-2/EB-3', '工作类移民', 13, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000b9kx5zf74wakq', 'IMMIGRATION', 'niw', 'NIW 国家利益豁免', 'National Interest Waiver', '工作类移民', 14, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj000c9kx5mcqxjk7n', 'IMMIGRATION', 'perm', 'PERM 劳工证', 'PERM Labor Cert.', '工作类移民', 15, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000d9kx5yzb5ecq5', 'IMMIGRATION', 'h1b-layoff', 'H1B 被裁身份转移', 'H-1B Layoff Status', '工作类移民', 16, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj000e9kx59gtpmmwa', 'IMMIGRATION', 'eb5', 'EB5 投资移民', 'EB-5 Investor Visa', '投资移民', 20, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000f9kx5yf9i0xy1', 'IMMIGRATION', 'eb5-dispute', 'EB5 区域中心纠纷', 'EB-5 Regional Center', '投资移民', 21, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000g9kx5ozihmbw1', 'IMMIGRATION', 'asylum', '政治庇护', 'Asylum', '庇护与人道', 25, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj000h9kx560kcyroo', 'IMMIGRATION', 'vawa', '家暴绿卡 VAWA', 'VAWA Green Card', '庇护与人道', 26, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000i9kx5r33dsdsx', 'IMMIGRATION', 'u-visa', 'U 签证', 'U Visa', '庇护与人道', 27, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000j9kx5akj7wqgq', 'IMMIGRATION', 't-visa', 'T 签证', 'T Visa', '庇护与人道', 28, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000k9kx5tdrgnrah', 'IMMIGRATION', 'ice-detention', 'ICE 拘留保释', 'ICE Detention / Bail', '庇护与人道', 29, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000l9kx5p6ij1flh', 'IMMIGRATION', 'naturalization', '入籍申请 N-400', 'Naturalization N-400', '入籍与身份', 30, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj000m9kx5b4ayuz79', 'IMMIGRATION', 'naturalization-denied', '入籍被拒', 'Naturalization Denied', '入籍与身份', 31, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000n9kx5zmj1gbcy', 'IMMIGRATION', 'green-card-revoked', '绿卡被撤销', 'Green Card Revoked', '入籍与身份', 32, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000o9kx5nfb08l0x', 'IMMIGRATION', 'deportation', '驱逐出境案件', 'Deportation Defense', '入籍与身份', 33, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000p9kx5wj4ghgvy', 'CRIMINAL', 'shoplifting', '商店盗窃', 'Shoplifting', '轻罪', 1, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000q9kx5yzef9be7', 'CRIMINAL', 'minor-assault', '轻微袭击', 'Minor Assault', '轻罪', 2, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000r9kx53g4az69x', 'CRIMINAL', 'no-license-driving', '无证驾驶', 'Driving Without License', '轻罪', 3, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000s9kx57rubakgt', 'CRIMINAL', 'robbery', '抢劫', 'Robbery', '重罪', 10, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000t9kx5ezn9plxl', 'CRIMINAL', 'gun-crime', '持枪犯罪', 'Gun Crime', '重罪', 11, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000u9kx5qdoatqag', 'CRIMINAL', 'drug-trafficking', '毒品贩卖', 'Drug Trafficking', '重罪', 12, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000v9kx54hgf77gc', 'CRIMINAL', 'fraud-white-collar', '欺诈/白领犯罪', 'Fraud / White Collar', '重罪', 13, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000w9kx537u3dmrj', 'CRIMINAL', 'domestic-violence', '家暴指控辩护', 'Domestic Violence Defense', '家庭暴力', 20, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj000x9kx5kq1789ar', 'CRIMINAL', 'restraining-order', '限制令申请/抗辩', 'Restraining Order', '家庭暴力', 21, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj000y9kx5qwbz3z5m', 'CRIMINAL', 'dui-first', '首次酒驾 DUI', 'First DUI', 'DUI酒驾', 25, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj000z9kx523rq6sc2', 'CRIMINAL', 'dui-refusal', '拒绝酒精测试', 'DUI Test Refusal', 'DUI酒驾', 26, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00109kx56qtcyg9d', 'CRIMINAL', 'license-hearing', '吊销驾照听证', 'License Suspension Hrg.', 'DUI酒驾', 27, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00119kx5g7gz8c79', 'CIVIL', 'contract-breach', '商业合同违约', 'Contract Breach', '合同纠纷', 1, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj00129kx5bwvg1fdf', 'CIVIL', 'partnership-dispute', '合作纠纷', 'Partnership Dispute', '合同纠纷', 2, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00139kx58kb2nb0n', 'CIVIL', 'service-contract', '服务合同纠纷', 'Service Contract', '合同纠纷', 3, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00149kx5haa5fgik', 'CIVIL', 'debt-collection', '借款/欠款追讨', 'Debt Collection', '金钱债务', 10, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00159kx5dup0463b', 'CIVIL', 'small-claims', '小额法庭', 'Small Claims Court', '金钱债务', 11, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj00169kx5680h2vtr', 'CIVIL', 'investment-fraud', '投资诈骗', 'Investment Fraud', '欺诈诈骗', 20, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj00179kx5e2vnqn2a', 'CIVIL', 'crypto-fraud', '加密货币诈骗', 'Crypto Fraud', '欺诈诈骗', 21, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj00189kx5niv7zh5y', 'CIVIL', 'asset-recovery', '资产追回', 'Asset Recovery', '欺诈诈骗', 22, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00199kx51gjqzi4k', 'CIVIL', 'car-accident', '车祸索赔', 'Car Accident', '人身伤害', 30, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj001a9kx5xcioikjc', 'CIVIL', 'slip-fall', '滑倒摔伤', 'Slip & Fall', '人身伤害', 31, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001b9kx5zkasu9qk', 'CIVIL', 'medical-malpractice', '医疗事故', 'Medical Malpractice', '人身伤害', 32, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001c9kx5dln28cr6', 'REAL_ESTATE', 'home-purchase', '买卖房产过户', 'Home Purchase / Sale', '交易过户', 1, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj001d9kx5ewjmcgk8', 'REAL_ESTATE', 'commercial-real-estate', '商业地产交易', 'Commercial Real Estate', '交易过户', 2, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001e9kx5em4phgkn', 'REAL_ESTATE', 'lease-dispute', '租约纠纷', 'Lease Dispute', '租赁纠纷', 10, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj001f9kx5wzzc10zx', 'REAL_ESTATE', 'eviction', '房东驱逐房客', 'Eviction', '租赁纠纷', 11, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj001g9kx5dpvetn3l', 'REAL_ESTATE', 'foreclosure', '房屋止赎', 'Foreclosure', '止赎拍卖', 20, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001h9kx50l281nct', 'REAL_ESTATE', 'foreclosure-invest', '法拍房投资纠纷', 'Foreclosure Investment', '止赎拍卖', 21, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001i9kx5j1danp8b', 'REAL_ESTATE', 'hoa-dispute', 'HOA 纠纷', 'HOA Dispute', '其他', 30, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001j9kx5ouwohncm', 'REAL_ESTATE', 'property-inheritance', '房产继承', 'Property Inheritance', '其他', 31, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001k9kx5uqdhom0o', 'REAL_ESTATE', 'title-dispute', '地契纠纷', 'Title Dispute', '其他', 32, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001l9kx5e4uo0ulp', 'FAMILY', 'divorce', '离婚', 'Divorce', '婚姻', 1, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj001m9kx53i4fqrl2', 'FAMILY', 'property-division', '财产分割', 'Property Division', '婚姻', 2, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj001n9kx5etlgp4wb', 'FAMILY', 'prenuptial', '婚前协议', 'Prenuptial Agreement', '婚姻', 3, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001o9kx5fzugriuj', 'FAMILY', 'international-divorce', '跨国离婚', 'International Divorce', '婚姻', 4, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001p9kx5pq0tjb3g', 'FAMILY', 'child-custody', '抚养权争夺', 'Child Custody', '子女', 10, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj001q9kx56r0edm0n', 'FAMILY', 'child-support', '抚养费', 'Child Support', '子女', 11, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001r9kx5fjtpknzu', 'FAMILY', 'domestic-violence-order', '家暴保护令', 'Domestic Violence Order', '保护', 20, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj001s9kx5vf6if9il', 'BUSINESS', 'llc-formation', '公司注册 LLC/Corp', 'LLC / Corp Formation', '公司设立', 1, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj001t9kx5wkelwv4r', 'BUSINESS', 'shareholder-dispute', '股东纠纷', 'Shareholder Dispute', '公司治理', 10, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001u9kx50hsyv4mp', 'BUSINESS', 'partnership-agreement', '合伙协议', 'Partnership Agreement', '公司治理', 11, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001v9kx5er7ommps', 'BUSINESS', 'ma', '并购', 'M&A', '公司治理', 12, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001w9kx59wb9mnmr', 'BUSINESS', 'trademark-registration', '商标注册', 'Trademark Registration', '知识产权', 20, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj001x9kx5ec9k2r0g', 'BUSINESS', 'trademark-infringement', '商标侵权', 'Trademark Infringement', '知识产权', 21, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001y9kx5yw2ckd2j', 'BUSINESS', 'business-contract', '商业合同审核', 'Business Contract Review', '合同', 30, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj001z9kx5ah6odpk4', 'BUSINESS', 'business-litigation', '商业诉讼', 'Business Litigation', '合同', 31, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00209kx5fp5qejjw', 'ESTATE_PLAN', 'will-drafting', '遗嘱起草', 'Will Drafting', '基础规划', 1, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj00219kx5gss0nvjf', 'ESTATE_PLAN', 'trust-setup', '信托设立', 'Trust Setup', '基础规划', 2, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj00229kx5j21lnzkr', 'ESTATE_PLAN', 'probate', '遗产认证 Probate', 'Probate', '遗产管理', 10, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj00239kx522rrluq1', 'ESTATE_PLAN', 'irrevocable-trust', '不可撤销信托修改', 'Irrevocable Trust Mod.', '遗产管理', 11, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00249kx5crjldkva', 'ESTATE_PLAN', 'special-needs-trust', '特殊需求信托', 'Special Needs Trust', '遗产管理', 12, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00259kx5i5dhkpl5', 'ESTATE_PLAN', 'asset-protection', '资产保护规划', 'Asset Protection', '资产保护', 20, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00269kx58dcmitbb', 'LABOR', 'wage-dispute', '工资纠纷', 'Wage Dispute', '薪酬', 1, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj00279kx5jsa0x1eg', 'LABOR', 'overtime-claim', '加班费索赔', 'Overtime Pay Claim', '薪酬', 2, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj00289kx5h7eq35n5', 'LABOR', 'wrongful-termination', '非法解雇', 'Wrongful Termination', '解雇', 10, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj00299kx5f81s0ce1', 'LABOR', 'workplace-discrimination', '职场歧视', 'Workplace Discrimination', '歧视', 20, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj002a9kx58ztsryhx', 'LABOR', 'sexual-harassment', '性骚扰投诉', 'Sexual Harassment', '歧视', 21, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj002b9kx59bgfw99j', 'LABOR', 'labor-arbitration', '劳工仲裁', 'Labor Arbitration', '仲裁', 30, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj002c9kx55nyqz4hd', 'TAX', 'irs-audit', 'IRS 审计', 'IRS Audit', '税务', 1, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj002d9kx50oc6h908', 'TAX', 'tax-debt', '税务欠款协商', 'Tax Debt Negotiation', '税务', 2, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj002e9kx5i9f69nst', 'TAX', 'business-tax', '公司税务规划', 'Business Tax Planning', '税务', 3, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj002f9kx5wey0o603', 'TAX', 'fbar-fatca', '海外资产申报 FBAR', 'FBAR / FATCA Compliance', '海外', 10, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj002g9kx5jlxgwh9v', 'OTHER', 'bankruptcy', '破产申请', 'Bankruptcy', '财务', 1, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj002h9kx5n7z3zsj4', 'OTHER', 'traffic-ticket', '交通罚单', 'Traffic Ticket', '交通', 10, true, '2026-02-19 14:44:00.979'),
	('cmltkndcj002i9kx5pn45gegq', 'OTHER', 'ip-patent', '知识产权/专利', 'IP / Patent', '知产', 20, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj002j9kx5x0svokqp', 'OTHER', 'data-privacy', '数据隐私', 'Data Privacy', '知产', 21, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj002k9kx57gn7z31f', 'OTHER', 'gun-permit', '枪证申请', 'Gun Permit', '行政', 30, false, '2026-02-19 14:44:00.979'),
	('cmltkndcj002l9kx5hh9s1q3y', 'OTHER', 'admin-hearing', '行政听证', 'Admin Hearing', '行政', 31, false, '2026-02-19 14:44:00.979');


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count") VALUES
	('6b973490-49f3-471f-b74e-865bf5bdacd6', '036869d4be6ddc50f9648d6cac18d824c20157be0313d5679b7e6d38337a9cc8', '2026-02-19 13:07:52.81145+00', '20260219130752_init', NULL, NULL, '2026-02-19 13:07:52.796105+00', 1),
	('b59d5334-bec0-4c26-804f-33a978802beb', '2c10f608d0d478b2b013a6abeef69b4bf162dffcf0d3d24aa467b6c45c65a15d', '2026-02-19 14:08:33.532686+00', '20260219140833_add_case_images', NULL, NULL, '2026-02-19 14:08:33.527154+00', 1),
	('6760ce80-b2a9-43d7-80a4-0f944fbd9105', '5f1c3ea7fa03b68e68910598f0d3f20d10703cb80a4e9d1c8a2d22838946730c', '2026-02-19 14:41:39.019531+00', '20260219144139_expand_legal_categories', NULL, NULL, '2026-02-19 14:41:39.015799+00', 1),
	('c847f068-6f75-41ff-9117-dcab4e5fd027', '00cee8de0876734e86ae54872e1440083f2b96a91c7d88435cc7e3ffd3a655a9', '2026-02-19 15:45:50.967646+00', '20260219154550_allow_anonymous_case_submission', NULL, NULL, '2026-02-19 15:45:50.960392+00', 1);


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict 1sf3bcDoqoRpOknaU9EiALeIKfot2qUr71LtNNLGJyM7UPitgqLlgJsSm6WYTpd

RESET ALL;
