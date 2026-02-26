"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ScalesIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  MapPinIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SpinnerIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
} from "../../../components/ui/icons";

// ── Types ──────────────────────────────────────────────────────────────────────

type Specialty = "IMMIGRATION" | "CIVIL" | "CRIMINAL" | "FAMILY" | "LABOR" | "BUSINESS" | "OTHER";
type Language = "MANDARIN" | "ENGLISH";
type ServiceArea = { stateCode: string; zipCode: string };

type FormData = {
  firstName: string;
  lastName: string;
  phone: string;
  firmName: string;
  barLicenseNumber: string;
  barState: string;
  registeredLegalName: string;
  barRegisteredName: string;
  identityDocumentType: "PASSPORT" | "DRIVER_LICENSE" | "STATE_ID" | "OTHER" | "";
  identityDocumentFileName: string;
  lawSchool: string;
  yearsExperience: string;
  specialties: Specialty[];
  serviceAreas: ServiceArea[];
  languages: Language[];
  bio: string;
};

// ── Config ────────────────────────────────────────────────────────────────────

const SPECIALTY_CONFIG: { key: Specialty; label: string; zh: string; emoji: string; color: string }[] = [
  { key: "IMMIGRATION", label: "Immigration", zh: "移民", emoji: "✈️", color: "bg-blue-50 border-blue-300 text-blue-900" },
  { key: "CIVIL",       label: "Civil",       zh: "民事", emoji: "⚖️", color: "bg-slate-50 border-slate-300 text-slate-900" },
  { key: "CRIMINAL",    label: "Criminal",    zh: "刑事", emoji: "🔒", color: "bg-rose-50 border-rose-300 text-rose-900" },
  { key: "FAMILY",      label: "Family",      zh: "家庭", emoji: "🏠", color: "bg-pink-50 border-pink-300 text-pink-900" },
  { key: "LABOR",       label: "Labor",       zh: "劳工", emoji: "💼", color: "bg-orange-50 border-orange-300 text-orange-900" },
  { key: "BUSINESS",    label: "Business",    zh: "商业", emoji: "🏢", color: "bg-emerald-50 border-emerald-300 text-emerald-900" },
  { key: "OTHER",       label: "Other",       zh: "其他", emoji: "📋", color: "bg-purple-50 border-purple-300 text-purple-900" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const LANGUAGE_CONFIG: { key: Language; label: string; zh: string; flag: string }[] = [
  { key: "MANDARIN", label: "Mandarin", zh: "普通话", flag: "🇨🇳" },
  { key: "ENGLISH", label: "English", zh: "英语", flag: "🇺🇸" },
];

const STEPS = [
  { title: "Basic Info", zh: "基本信息", icon: UserCircleIcon },
  { title: "Bar License", zh: "律师执照", icon: ShieldCheckIcon },
  { title: "Specialties", zh: "专业领域", icon: BriefcaseIcon },
  { title: "Service Areas", zh: "服务地区", icon: MapPinIcon },
  { title: "Languages & Bio", zh: "语言 & 简介", icon: GlobeAltIcon },
];

// ── Input Styles ──────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors";

const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

// ── Main Component ────────────────────────────────────────────────────────────

export default function AttorneyOnboardingPage() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    phone: "",
    firmName: "",
    barLicenseNumber: "",
    barState: "",
    registeredLegalName: "",
    barRegisteredName: "",
    identityDocumentType: "",
    identityDocumentFileName: "",
    lawSchool: "",
    yearsExperience: "",
    specialties: [],
    serviceAreas: [{ stateCode: "", zipCode: "" }],
    languages: [],
    bio: "",
  });

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleSpecialty = (s: Specialty) =>
    setField(
      "specialties",
      form.specialties.includes(s)
        ? form.specialties.filter((x) => x !== s)
        : [...form.specialties, s],
    );

  const toggleLanguage = (l: Language) =>
    setField(
      "languages",
      form.languages.includes(l)
        ? form.languages.filter((x) => x !== l)
        : [...form.languages, l],
    );

  const addServiceArea = () =>
    setField("serviceAreas", [...form.serviceAreas, { stateCode: "", zipCode: "" }]);

  const removeServiceArea = (idx: number) =>
    setField("serviceAreas", form.serviceAreas.filter((_, i) => i !== idx));

  const updateServiceArea = (idx: number, field: keyof ServiceArea, value: string) =>
    setField(
      "serviceAreas",
      form.serviceAreas.map((a, i) => (i === idx ? { ...a, [field]: value } : a)),
    );

  const canProceed = () => {
    if (step === 0) return form.firstName.trim() && form.lastName.trim();
    if (step === 1) return form.barLicenseNumber.trim() && form.barState;
    if (step === 2) return form.specialties.length > 0;
    if (step === 3) return form.serviceAreas.some((a) => a.stateCode);
    if (step === 4) return form.languages.length > 0;
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const payload = {
      ...form,
      yearsExperience: form.yearsExperience ? parseInt(form.yearsExperience) : undefined,
      serviceAreas: form.serviceAreas.filter((a) => a.stateCode),
    };

    try {
      const res = await fetch("/api/attorney/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Submission failed. Please try again.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-4 ring-emerald-500/30">
            <CheckCircleIcon className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Profile Complete! / 资料已提交！</h1>
          <p className="mt-3 text-slate-400">
            Your attorney profile has been saved. Our team will verify your bar license within 1–2 business days.
          </p>
          <p className="mt-1 text-slate-500 text-sm">
            您的律师资料已保存。我们的团队将在 1-2 个工作日内验证您的律师执照。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/attorney/dashboard"
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-500 transition-colors"
            >
              Go to Dashboard / 进入仪表盘
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
            >
              Return Home / 返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Layout ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      {/* Logo */}
      <div className="mb-10 text-center">
        <Link href="/" className="inline-flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600">
            <ScalesIcon className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <div className="text-base font-bold leading-tight text-white">美国华人119找律师网</div>
            <div className="text-xs font-semibold tracking-wider text-amber-400">Law119</div>
          </div>
        </Link>
        <h1 className="mt-4 text-xl font-bold text-white">Attorney Onboarding / 律师入驻</h1>
        <p className="mt-1 text-sm text-slate-400">Complete your profile to start receiving matched cases</p>
      </div>

      {/* Review Timeline Notice */}
      <div className="mx-auto mb-6 max-w-2xl">
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <span className="text-lg leading-none flex-shrink-0">⏱</span>
          <div>
            <p className="text-sm font-semibold text-amber-300">预计审核周期 / Review Timeline</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              提交后，我们团队将在 <strong className="text-amber-300">1-2个工作日</strong> 内审核您的律师执照并通知您结果。
              <span className="block mt-0.5">After submission, our team verifies your bar license within <strong className="text-amber-300">1–2 business days</strong>.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mx-auto mb-8 max-w-2xl">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isCompleted = i < step;
            const isActive = i === step;
            return (
              <div key={i} className="flex flex-1 flex-col items-center">
                {/* Connector line */}
                {i > 0 && (
                  <div
                    className={`absolute hidden h-0.5 w-full -translate-x-1/2 sm:block ${
                      i <= step ? "bg-amber-600" : "bg-slate-700"
                    }`}
                    style={{ top: "20px", left: "-50%", width: "100%", position: "relative", marginTop: "-20px", marginBottom: "10px" }}
                  />
                )}
                {/* Circle */}
                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted
                      ? "border-amber-600 bg-amber-600 text-white"
                      : isActive
                      ? "border-amber-500 bg-slate-800 text-amber-400"
                      : "border-slate-600 bg-slate-800 text-slate-500"
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                {/* Label */}
                <div className="mt-2 text-center">
                  <p
                    className={`text-xs font-semibold ${
                      isActive ? "text-amber-400" : isCompleted ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {s.title}
                  </p>
                  <p className="hidden text-[10px] text-slate-500 sm:block">{s.zh}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step progress bar */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-amber-600 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-right text-xs text-slate-500">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      {/* Card */}
      <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Card header */}
        <div className="rounded-t-2xl bg-slate-900 px-6 py-5">
          <h2 className="text-lg font-bold text-white">
            {STEPS[step].title} / {STEPS[step].zh}
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {step === 0 && "Tell us about yourself and your firm."}
            {step === 1 && "Enter your bar license details for verification."}
            {step === 2 && "Select the areas of law you practice."}
            {step === 3 && "Define the states and regions you serve."}
            {step === 4 && "Languages you speak and a brief bio."}
          </p>
        </div>

        {/* Card body */}
        <div className="px-6 py-6">

          {/* ── Step 0: Basic Info ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>First Name / 名 <span className="text-rose-500">*</span></label>
                  <input
                    className={inputCls}
                    placeholder="John"
                    value={form.firstName}
                    onChange={(e) => setField("firstName", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Last Name / 姓 <span className="text-rose-500">*</span></label>
                  <input
                    className={inputCls}
                    placeholder="Smith"
                    value={form.lastName}
                    onChange={(e) => setField("lastName", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Phone Number / 电话</label>
                <input
                  className={inputCls}
                  type="tel"
                  placeholder="(415) 555-0100"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Law Firm / 律所名称</label>
                <div className="relative">
                  <BuildingOfficeIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    className={inputCls + " pl-9"}
                    placeholder="Smith & Associates LLP"
                    value={form.firmName}
                    onChange={(e) => setField("firmName", e.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                <strong>Privacy Note:</strong> Your contact information is only shared with clients after they accept a formal consultation.
                <span className="mt-0.5 block text-blue-600">您的联系方式仅在客户接受正式咨询后才会被分享。</span>
              </div>
            </div>
          )}

          {/* ── Step 1: Bar License ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Bar License Number / 律师执照号 <span className="text-rose-500">*</span></label>
                  <input
                    className={inputCls}
                    placeholder="e.g. 123456"
                    value={form.barLicenseNumber}
                    onChange={(e) => setField("barLicenseNumber", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Bar State / 执照州 <span className="text-rose-500">*</span></label>
                  <select
                    className={inputCls}
                    value={form.barState}
                    onChange={(e) => setField("barState", e.target.value)}
                  >
                    <option value="">Select state...</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Registered Legal Name / 证件法定姓名</label>
                <input
                  className={inputCls}
                  placeholder="Name on your ID"
                  value={form.registeredLegalName}
                  onChange={(e) => setField("registeredLegalName", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Bar Registered Name / 执照注册姓名</label>
                <input
                  className={inputCls}
                  placeholder="Name registered with Bar"
                  value={form.barRegisteredName}
                  onChange={(e) => setField("barRegisteredName", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>ID Document Type / 身份证件类型</label>
                  <select
                    className={inputCls}
                    value={form.identityDocumentType}
                    onChange={(e) => setField("identityDocumentType", e.target.value as FormData["identityDocumentType"])}
                  >
                    <option value="">Select type...</option>
                    <option value="PASSPORT">Passport / 护照</option>
                    <option value="DRIVER_LICENSE">Driver License / 驾照</option>
                    <option value="STATE_ID">State ID</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Document File Name（占位）</label>
                  <input
                    className={inputCls}
                    placeholder="passport_xxx.pdf"
                    value={form.identityDocumentFileName}
                    onChange={(e) => setField("identityDocumentFileName", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Law School / 法学院</label>
                <input
                  className={inputCls}
                  placeholder="e.g. UC Berkeley School of Law"
                  value={form.lawSchool}
                  onChange={(e) => setField("lawSchool", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Years of Experience / 执业年限</label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  max={60}
                  placeholder="e.g. 8"
                  value={form.yearsExperience}
                  onChange={(e) => setField("yearsExperience", e.target.value)}
                />
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <ShieldCheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <div>
                  Your identity and bar license will be reviewed by our team (and can later be checked by third-party verification vendors).
                  <span className="mt-0.5 block text-amber-600">平台将审核您的实名认证与律师执照信息（后续可接第三方校验服务）。</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Specialties ── */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Select all areas you practice. Cases will be matched to attorneys with relevant specialties.
                <span className="mt-0.5 block text-slate-500 text-xs">选择您执业的所有法律领域。案件将匹配给具有相关专业的律师。</span>
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {SPECIALTY_CONFIG.map((s) => {
                  const selected = form.specialties.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSpecialty(s.key)}
                      className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-all ${
                        selected
                          ? "border-amber-500 bg-amber-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {selected && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600">
                          <CheckIcon className="h-3 w-3 text-white" />
                        </span>
                      )}
                      <span className="text-2xl">{s.emoji}</span>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{s.label}</p>
                        <p className="text-[10px] text-slate-500">{s.zh}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {form.specialties.length > 0 && (
                <p className="text-xs text-amber-700 text-center">
                  {form.specialties.length} area{form.specialties.length > 1 ? "s" : ""} selected / 已选 {form.specialties.length} 个领域
                </p>
              )}
            </div>
          )}

          {/* ── Step 3: Service Areas ── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Add the states (and optionally ZIP codes) where you are licensed to practice.
                <span className="mt-0.5 block text-xs text-slate-500">添加您有资格执业的州（可选填 ZIP 码精准匹配）。</span>
              </p>
              <div className="space-y-3">
                {form.serviceAreas.map((area, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                      {idx + 1}
                    </div>
                    <div className="flex flex-1 gap-3">
                      <select
                        className="w-28 flex-shrink-0 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={area.stateCode}
                        onChange={(e) => updateServiceArea(idx, "stateCode", e.target.value)}
                      >
                        <option value="">State</option>
                        {US_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <input
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="ZIP (optional)"
                        maxLength={10}
                        value={area.zipCode}
                        onChange={(e) => updateServiceArea(idx, "zipCode", e.target.value)}
                      />
                    </div>
                    {form.serviceAreas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeServiceArea(idx)}
                        className="ml-1 flex-shrink-0 text-slate-400 hover:text-rose-500 transition-colors text-lg leading-none"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addServiceArea}
                className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-500 transition-colors"
              >
                <span className="text-lg leading-none">+</span>
                Add another state / 添加更多州
              </button>
            </div>
          )}

          {/* ── Step 4: Languages & Bio ── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Languages / 语言 <span className="text-rose-500">*</span></label>
                <p className="mb-3 text-xs text-slate-500">Select all languages you can conduct consultations in.</p>
                <div className="flex flex-wrap gap-3">
                  {LANGUAGE_CONFIG.map((l) => {
                    const selected = form.languages.includes(l.key);
                    return (
                      <button
                        key={l.key}
                        type="button"
                        onClick={() => toggleLanguage(l.key)}
                        className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                          selected
                            ? "border-amber-500 bg-amber-50 text-amber-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-lg">{l.flag}</span>
                        {l.label}
                        <span className="text-xs text-slate-400">{l.zh}</span>
                        {selected && <CheckIcon className="ml-1 h-3.5 w-3.5 text-amber-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>Professional Bio / 执业简介</label>
                <div className="relative">
                  <DocumentTextIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    rows={5}
                    className={inputCls + " resize-none pl-9"}
                    placeholder="Briefly describe your background, notable cases handled, and approach to client representation... / 简述您的执业背景、案件经验和服务理念..."
                    value={form.bio}
                    maxLength={1000}
                    onChange={(e) => setField("bio", e.target.value)}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-slate-400">{form.bio.length} / 1000</p>
              </div>

              {/* Review summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Profile Summary / 资料摘要
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Name</dt>
                    <dd className="font-medium text-slate-900">{form.firstName} {form.lastName}</dd>
                  </div>
                  {form.firmName && (
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Firm</dt>
                      <dd className="font-medium text-slate-900">{form.firmName}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Bar License</dt>
                    <dd className="font-medium text-slate-900">{form.barLicenseNumber} ({form.barState})</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Specialties</dt>
                    <dd className="font-medium text-slate-900 text-right">
                      {form.specialties.map((s) => SPECIALTY_CONFIG.find((c) => c.key === s)?.label).join(", ")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Service Areas</dt>
                    <dd className="font-medium text-slate-900 text-right">
                      {form.serviceAreas.filter((a) => a.stateCode).map((a) => a.stateCode + (a.zipCode ? ` ${a.zipCode}` : "")).join(", ")}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Card footer — Nav buttons */}
        <div className="flex items-center justify-between rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back / 上一步
          </button>

          {error && (
            <p className="flex-1 px-4 text-center text-xs text-rose-700">{error}</p>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
              Next / 下一步
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canProceed()}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
              {submitting ? (
                <>
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  Submitting... / 提交中...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  Submit Profile / 提交资料
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Bottom note */}
      <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-slate-500 leading-5">
        By submitting, you confirm all information is accurate and you are licensed to practice in the stated jurisdiction.
        <br />
        提交即表示您确认所有信息准确无误，且您在所述司法管辖区持有有效执照。
      </p>
    </div>
  );
}
