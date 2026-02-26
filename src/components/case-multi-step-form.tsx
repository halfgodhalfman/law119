"use client";

import { Fragment, Suspense, useMemo, useRef, useState } from "react";
// useRef used in ImagePickerForForm and pendingFilesRef in CaseMultiStepFormInner
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { I18nextProvider, useTranslation } from "react-i18next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import i18n from "../lib/i18n";
import { CaseSubmissionValues, caseSubmissionSchema } from "../lib/validation";
import { LANGUAGES, LEGAL_CATEGORIES, URGENCY_LEVELS } from "../types/case-form";
import { CheckIcon, ShieldCheckIcon, CheckCircleIcon, SpinnerIcon, ArrowRightIcon } from "./ui/icons";
import { CaseImageUploader } from "./case-image-uploader";
import { useMarketplaceAuth } from "../lib/use-marketplace-auth";

const STEP_LABELS = [
  { en: "Legal Category", zh: "法律类别" },
  { en: "Case Details", zh: "案件详情" },
  { en: "Language & Review", zh: "语言偏好" },
];

const CATEGORY_CONFIG: Record<string, { icon: string; nameZh: string; nameEn: string; colorSelected: string; colorDefault: string }> = {
  IMMIGRATION:  { icon: "✈️",  nameZh: "移民法律",  nameEn: "Immigration",   colorSelected: "border-blue-500 bg-blue-50",    colorDefault: "border-slate-200 hover:border-blue-300 hover:bg-blue-50/50" },
  CRIMINAL:     { icon: "🔒",  nameZh: "刑事案件",  nameEn: "Criminal",      colorSelected: "border-rose-500 bg-rose-50",    colorDefault: "border-slate-200 hover:border-rose-300 hover:bg-rose-50/50" },
  CIVIL:        { icon: "⚖️",  nameZh: "民事诉讼",  nameEn: "Civil",         colorSelected: "border-purple-500 bg-purple-50",colorDefault: "border-slate-200 hover:border-purple-300 hover:bg-purple-50/50" },
  REAL_ESTATE:  { icon: "🏠",  nameZh: "房产地产",  nameEn: "Real Estate",   colorSelected: "border-emerald-500 bg-emerald-50",colorDefault: "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50" },
  FAMILY:       { icon: "👨‍👩‍👧", nameZh: "家庭法律",  nameEn: "Family",        colorSelected: "border-pink-500 bg-pink-50",    colorDefault: "border-slate-200 hover:border-pink-300 hover:bg-pink-50/50" },
  BUSINESS:     { icon: "🏢",  nameZh: "商业公司",  nameEn: "Business",      colorSelected: "border-indigo-500 bg-indigo-50",colorDefault: "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50" },
  ESTATE_PLAN:  { icon: "📜",  nameZh: "信托遗产",  nameEn: "Estate Plan",   colorSelected: "border-amber-500 bg-amber-50",  colorDefault: "border-slate-200 hover:border-amber-300 hover:bg-amber-50/50" },
  LABOR:        { icon: "💼",  nameZh: "劳工雇佣",  nameEn: "Employment",    colorSelected: "border-orange-500 bg-orange-50",colorDefault: "border-slate-200 hover:border-orange-300 hover:bg-orange-50/50" },
  TAX:          { icon: "🧾",  nameZh: "税务财务",  nameEn: "Tax & Finance", colorSelected: "border-teal-500 bg-teal-50",    colorDefault: "border-slate-200 hover:border-teal-300 hover:bg-teal-50/50" },
  OTHER:        { icon: "📋",  nameZh: "其他专项",  nameEn: "Other",         colorSelected: "border-slate-500 bg-slate-100", colorDefault: "border-slate-200 hover:border-slate-400 hover:bg-slate-50" },
};

const URGENCY_CONFIG: Record<string, { label: string; classSelected: string; classDefault: string }> = {
  LOW:    { label: "Low / 低", classSelected: "border-slate-600 bg-slate-900 text-white", classDefault: "border-slate-300 text-slate-600 hover:border-slate-400" },
  MEDIUM: { label: "Medium / 中", classSelected: "border-blue-600 bg-blue-600 text-white", classDefault: "border-slate-300 text-slate-600 hover:border-blue-400" },
  HIGH:   { label: "High / 高", classSelected: "border-amber-600 bg-amber-600 text-white", classDefault: "border-slate-300 text-slate-600 hover:border-amber-400" },
  URGENT: { label: "Urgent / 紧急", classSelected: "border-rose-600 bg-rose-600 text-white", classDefault: "border-slate-300 text-slate-600 hover:border-rose-400" },
};

const ZH_CATEGORY: Record<string, string> = {
  IMMIGRATION: "移民法律", CRIMINAL: "刑事案件", CIVIL: "民事诉讼",
  REAL_ESTATE: "房产地产", FAMILY: "家庭法律", BUSINESS: "商业公司",
  ESTATE_PLAN: "信托遗产", LABOR: "劳工雇佣", TAX: "税务财务", OTHER: "其他专项",
};

const ZH_LANGUAGE: Record<string, string> = {
  MANDARIN: "普通话", ENGLISH: "英语",
};

const MAX_IMAGES = 9;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];

type LocalPreview = { id: string; file: File; previewUrl: string };

function ImagePickerForForm({ onFilesChange }: { onFilesChange: (files: File[]) => void }) {
  const [previews, setPreviews] = useState<LocalPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setError(null);
    const remaining = MAX_IMAGES - previews.length;
    if (remaining <= 0) { setError(`最多 ${MAX_IMAGES} 张 / Max ${MAX_IMAGES} images`); return; }
    const toAdd = Array.from(fileList).slice(0, remaining);
    for (const f of toAdd) {
      if (!ALLOWED_IMAGE_TYPES.includes(f.type)) { setError(`不支持的格式: ${f.name}`); return; }
      if (f.size > 10 * 1024 * 1024) { setError(`${f.name} 超过 10MB 限制`); return; }
    }
    const next: LocalPreview[] = [...previews, ...toAdd.map((f) => ({
      id: `${Date.now()}-${Math.random()}`, file: f, previewUrl: URL.createObjectURL(f),
    }))];
    setPreviews(next);
    onFilesChange(next.map((p) => p.file));
  };

  const remove = (id: string) => {
    const p = previews.find((x) => x.id === id);
    if (p) URL.revokeObjectURL(p.previewUrl);
    const next = previews.filter((x) => x.id !== id);
    setPreviews(next);
    onFilesChange(next.map((p) => p.file));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">案件图片（可选）/ Photos (Optional)</span>
        <span className="text-xs text-slate-400">{previews.length} / {MAX_IMAGES}</span>
      </div>
      {previews.length < MAX_IMAGES && (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          onDragOver={(e) => e.preventDefault()}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white py-5 text-center transition-colors hover:border-amber-400 hover:bg-amber-50/30"
        >
          <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <div>
            <p className="text-sm font-medium text-slate-600">点击或拖拽上传 / Click or drag</p>
            <p className="text-xs text-slate-400">JPG · PNG · WEBP · HEIC &nbsp;·&nbsp; 每张最大 10MB</p>
          </div>
          <input ref={inputRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} multiple className="hidden"
            onChange={(e) => { addFiles(e.target.files); (e.target as HTMLInputElement).value = ""; }} />
        </div>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {previews.map((p) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => remove(p.id)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <XMarkIconSmall />
              </button>
            </div>
          ))}
        </div>
      )}
      {previews.length > 0 && (
        <p className="text-xs text-slate-400">
          已选 {previews.length} 张，提交后自动上传 / {previews.length} selected, uploaded on submit
        </p>
      )}
    </div>
  );
}

function XMarkIconSmall() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CaseMultiStepFormInner() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { viewer, loading: authLoading } = useMarketplaceAuth();

  // Pre-fill category and urgency from URL params (e.g. from emergency page)
  const rawCategory = searchParams.get("category") ?? "";
  const rawUrgency = searchParams.get("urgency") ?? "";
  const initialCategory = LEGAL_CATEGORIES.find((c) => c === rawCategory) ?? "IMMIGRATION";
  const initialUrgency = URGENCY_LEVELS.find((u) => u === rawUrgency) ?? "MEDIUM";

  const [step, setStep] = useState(0);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error" | "attorney-blocked">("idle");
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const pendingFilesRef = useRef<File[]>([]);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    getValues,
    formState: { errors },
  } = useForm<CaseSubmissionValues>({
    resolver: zodResolver(caseSubmissionSchema),
    defaultValues: {
      category: initialCategory,
      preferredLanguage: "MANDARIN",
      urgency: initialUrgency,
      stateCode: "",
      zipCode: "",
      description: "",
      title: "",
      contactPhone: "",
      contactEmail: "",
    },
    mode: "onChange",
  });

  const watchedCategory = watch("category");
  const watchedUrgency = watch("urgency");
  const watchedLanguage = watch("preferredLanguage");

  const isAttorney = viewer.user?.role === "ATTORNEY";
  const isLoggedInClient = viewer.user?.role === "CLIENT";

  const steps = useMemo(
    () => [
      ["category"] as const,
      ["title", "stateCode", "zipCode", "urgency", "description", "contactPhone", "contactEmail"] as const,
      ["preferredLanguage"] as const,
    ],
    [],
  );

  // Attorney role guard — shown once auth has loaded
  if (!authLoading && isAttorney) {
    return (
      <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-sm p-10 text-center space-y-4">
        <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">⚖️</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">律师账号无法发案</h2>
        <p className="text-slate-600 text-sm max-w-sm mx-auto">
          您当前以律师身份登录，律师账号不支持发布案件。如需代理客户发案，请切换至客户账号。
        </p>
        <p className="text-slate-500 text-xs">
          Attorney accounts cannot post cases. Please sign in with a client account to submit a case.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/auth/sign-in?role=client"
            className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
          >
            切换至客户账号 / Switch to Client Account
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <Link
            href="/marketplace/case-hall"
            className="inline-flex items-center justify-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-700 font-medium px-6 py-2.5 rounded-xl transition-colors text-sm"
          >
            前往案件大厅 / Go to Case Hall
          </Link>
        </div>
      </div>
    );
  }

  // All handlers preserved from original
  const nextStep = async () => {
    const valid = await trigger(steps[step]);
    if (!valid) return;
    setStep((prev) => Math.min(prev + 1, 2));
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  const onSubmit = async (values: CaseSubmissionValues) => {
    setSubmitState("submitting");
    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values }),
    });
    if (!res.ok) {
      if (res.status === 403) {
        setSubmitState("attorney-blocked");
      } else {
        setSubmitState("error");
      }
      return;
    }
    const json = await res.json();
    const caseId: string = json.caseId;
    setCreatedCaseId(caseId);

    // Upload any pending images
    const files = pendingFilesRef.current;
    if (files.length > 0) {
      const formData = new FormData();
      formData.append("caseId", caseId);
      files.forEach((f) => formData.append("images", f));
      await fetch("/api/cases/upload-images", { method: "POST", body: formData });
    }

    setSubmitState("success");
  };

  // Success screen
  if (submitState === "success") {
    const shortId = createdCaseId ? createdCaseId.slice(-8).toUpperCase() : null;
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10">
        <div className="text-center mb-6">
          <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="h-9 w-9 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">案件已提交 / Case Submitted!</h2>
          {shortId && (
            <p className="text-slate-400 text-xs mt-2 font-mono tracking-wider">
              案件编号 / Case ID: <span className="font-bold text-slate-600">{shortId}</span>
            </p>
          )}
        </div>

        {/* Next steps */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 mb-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            接下来会发生什么？/ What happens next?
          </h3>
          <ol className="space-y-3">
            {[
              { emoji: "🔍", zh: "平台正在为您匹配附近的专业律师", en: "Matching qualified attorneys in your area" },
              { emoji: "📞", zh: "预计2小时内，律师将通过您留下的联系方式与您联系", en: "An attorney will contact you within ~2 hours" },
              { emoji: "🔔", zh: "查看平台通知获取进展更新", en: "Check notifications for case updates" },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 bg-amber-100 rounded-full flex items-center justify-center text-xs font-bold text-amber-700">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm text-slate-800">{item.zh}</p>
                  <p className="text-xs text-slate-500">{item.en}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Anonymous case tracking link */}
        {!viewer.user && createdCaseId && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">📋 案件追踪 / Track Your Case</p>
            <p className="text-xs text-amber-700 mt-1">
              无需注册，使用此专属链接随时查看案件进展：
            </p>
            <Link
              href={`/case/track/${createdCaseId}`}
              className="text-xs text-blue-700 underline break-all mt-1 block hover:text-blue-900"
            >
              /case/track/{createdCaseId}
            </Link>
            <p className="text-xs text-slate-500 mt-1">建议截图或复制保存此链接。</p>
            <p className="text-xs text-slate-400">
              No account needed — use this link anytime to check your case status.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/marketplace/notifications"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-5 py-3 rounded-xl transition-colors text-sm"
          >
            查看通知 / View Notifications
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-700 font-medium px-5 py-3 rounded-xl transition-colors text-sm"
          >
            返回首页 / Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      {/* Form header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{t("heading")}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Step {step + 1} of 3 · {STEP_LABELS[step].zh}
          </p>
        </div>
        <button
          type="button"
          className="border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors"
          onClick={() => i18n.changeLanguage(i18n.language === "zh" ? "en" : "zh")}
        >
          {t("langToggle")}
        </button>
      </div>

      {/* Step progress indicator */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center">
          {STEP_LABELS.map((s, i) => (
            <Fragment key={i}>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i < step
                      ? "bg-amber-600 text-white"
                      : i === step
                      ? "bg-slate-900 text-white ring-2 ring-amber-500 ring-offset-2"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {i < step ? <CheckIcon className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={`text-[11px] font-medium hidden sm:block ${
                    i === step ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {s.en}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 mb-4 transition-all ${i < step ? "bg-amber-600" : "bg-slate-200"}`}
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6">
        {/* STEP 0: Legal Category */}
        {step === 0 && (
          <section className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                {t("fields.category")}
              </label>
              <p className="text-xs text-slate-400 mb-4">
                Select the area of law that best describes your situation. / 选择最符合您情况的法律领域。
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {LEGAL_CATEGORIES.map((category) => {
                const cfg = CATEGORY_CONFIG[category];
                const isSelected = watchedCategory === category;
                return (
                  <label
                    key={category}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected ? cfg.colorSelected : cfg.colorDefault
                    }`}
                  >
                    <input type="radio" value={category} {...register("category")} className="sr-only" />
                    <span className="text-2xl leading-none">{cfg.icon}</span>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-900 leading-tight">{cfg.nameZh}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{cfg.nameEn}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 h-4 w-4 bg-amber-600 rounded-full flex items-center justify-center">
                        <CheckIcon className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
            {errors.category && <p className="text-sm text-rose-600">{errors.category.message}</p>}
          </section>
        )}

        {/* STEP 1: Case Details */}
        {step === 1 && (
          <section className="space-y-5">
            {/* Privacy notice */}
            <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-sm text-blue-800">
              <ShieldCheckIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Anonymous by Default / 默认匿名</p>
                <p className="text-xs mt-0.5 text-blue-700">
                  案件描述请勿包含个人信息，联系方式请在下方专项填写。
                  Do not include personal info in the description — use the contact fields below.
                </p>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("fields.title")}</label>
              <input
                type="text"
                {...register("title")}
                placeholder={t("placeholders.title")}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              />
              {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>}
            </div>

            {/* State + ZIP */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("fields.stateCode")}</label>
                <select
                  {...register("stateCode")}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                >
                  <option value="">Select state / 选择州...</option>
                  <option value="AL">AL – Alabama</option>
                  <option value="AK">AK – Alaska</option>
                  <option value="AZ">AZ – Arizona</option>
                  <option value="AR">AR – Arkansas</option>
                  <option value="CA">CA – California 加州</option>
                  <option value="CO">CO – Colorado</option>
                  <option value="CT">CT – Connecticut</option>
                  <option value="DE">DE – Delaware</option>
                  <option value="FL">FL – Florida 佛州</option>
                  <option value="GA">GA – Georgia</option>
                  <option value="HI">HI – Hawaii 夏威夷</option>
                  <option value="ID">ID – Idaho</option>
                  <option value="IL">IL – Illinois 伊利诺伊</option>
                  <option value="IN">IN – Indiana</option>
                  <option value="IA">IA – Iowa</option>
                  <option value="KS">KS – Kansas</option>
                  <option value="KY">KY – Kentucky</option>
                  <option value="LA">LA – Louisiana</option>
                  <option value="ME">ME – Maine</option>
                  <option value="MD">MD – Maryland</option>
                  <option value="MA">MA – Massachusetts</option>
                  <option value="MI">MI – Michigan</option>
                  <option value="MN">MN – Minnesota</option>
                  <option value="MS">MS – Mississippi</option>
                  <option value="MO">MO – Missouri</option>
                  <option value="MT">MT – Montana</option>
                  <option value="NE">NE – Nebraska</option>
                  <option value="NV">NV – Nevada</option>
                  <option value="NH">NH – New Hampshire</option>
                  <option value="NJ">NJ – New Jersey</option>
                  <option value="NM">NM – New Mexico</option>
                  <option value="NY">NY – New York 纽约</option>
                  <option value="NC">NC – North Carolina</option>
                  <option value="ND">ND – North Dakota</option>
                  <option value="OH">OH – Ohio</option>
                  <option value="OK">OK – Oklahoma</option>
                  <option value="OR">OR – Oregon</option>
                  <option value="PA">PA – Pennsylvania</option>
                  <option value="RI">RI – Rhode Island</option>
                  <option value="SC">SC – South Carolina</option>
                  <option value="SD">SD – South Dakota</option>
                  <option value="TN">TN – Tennessee</option>
                  <option value="TX">TX – Texas 德州</option>
                  <option value="UT">UT – Utah</option>
                  <option value="VT">VT – Vermont</option>
                  <option value="VA">VA – Virginia</option>
                  <option value="WA">WA – Washington 华州</option>
                  <option value="WV">WV – West Virginia</option>
                  <option value="WI">WI – Wisconsin</option>
                  <option value="WY">WY – Wyoming</option>
                  <option value="DC">DC – Washington D.C.</option>
                </select>
                {errors.stateCode && <p className="mt-1 text-xs text-rose-600">{errors.stateCode.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("fields.zipCode")}</label>
                <input
                  type="text"
                  {...register("zipCode")}
                  placeholder={t("placeholders.zipCode")}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
                {errors.zipCode && <p className="mt-1 text-xs text-rose-600">{errors.zipCode.message}</p>}
              </div>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t("fields.urgency")}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {URGENCY_LEVELS.map((level) => {
                  const cfg = URGENCY_CONFIG[level];
                  const isSelected = watchedUrgency === level;
                  return (
                    <label key={level} className="cursor-pointer">
                      <input type="radio" value={level} {...register("urgency")} className="sr-only" />
                      <div
                        className={`py-2.5 px-3 rounded-lg border-2 text-center text-xs font-semibold transition-all ${
                          isSelected ? cfg.classSelected : cfg.classDefault
                        }`}
                      >
                        {cfg.label}
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.urgency && <p className="mt-1 text-xs text-rose-600">{errors.urgency.message}</p>}
            </div>

            {/* Budget Range (Optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                预算区间 / Expected Budget
                <span className="text-slate-400 text-xs font-normal ml-1.5">（可选 / Optional）</span>
              </label>
              <select
                {...register("budgetRange")}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              >
                <option value="any">不确定 / Not sure</option>
                <option value="under_1k">{"< $1,000"}</option>
                <option value="1k_5k">$1,000 – $5,000</option>
                <option value="5k_10k">$5,000 – $10,000</option>
                <option value="10k_30k">$10,000 – $30,000</option>
                <option value="over_30k">{"> $30,000"}</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("fields.description")}</label>
              <textarea
                rows={5}
                {...register("description")}
                placeholder={t("placeholders.description")}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              />
              {errors.description && <p className="mt-1 text-xs text-rose-600">{errors.description.message}</p>}
            </div>

            {/* Image Upload */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <ImagePickerForForm onFilesChange={(files) => { pendingFilesRef.current = files; }} />
            </div>

            {/* Contact Info */}
            <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 space-y-4">
              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none">🔒</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-emerald-900">
                      联系方式 / Contact Info
                    </p>
                    {isLoggedInClient ? (
                      <span className="text-[10px] font-bold bg-slate-500 text-white px-1.5 py-0.5 rounded-full">可选 / Optional</span>
                    ) : (
                      <span className="text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full">必填 / Required</span>
                    )}
                  </div>
                  {isLoggedInClient ? (
                    <p className="text-xs text-emerald-700 mt-0.5">
                      您已登录，律师可通过平台消息与您联系，手机/邮箱为可选项。
                      <span className="block text-emerald-600 mt-0.5">Logged in — attorneys can message you via platform. Contact info is optional.</span>
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-700 mt-0.5">
                      请填写联系方式，律师配对后将通过此信息与您联系，仅律师可见。
                      <span className="block text-emerald-600 mt-0.5">Required so matched attorneys can contact you. Visible only to matched attorneys.</span>
                    </p>
                  )}
                </div>
              </div>
              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  手机号码 / Phone Number
                  {!isLoggedInClient && <span className="text-rose-500 ml-1">*</span>}
                  {isLoggedInClient && <span className="text-slate-400 text-xs font-normal ml-1">（可选）</span>}
                </label>
                <input
                  type="tel"
                  {...register("contactPhone")}
                  placeholder="e.g. 626-123-4567"
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                    errors.contactPhone ? "border-rose-400 bg-rose-50" : "border-slate-300"
                  }`}
                />
                {errors.contactPhone && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <span>⚠</span> {errors.contactPhone.message}
                  </p>
                )}
              </div>
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  联系邮箱 / Contact Email
                  {!isLoggedInClient && <span className="text-rose-500 ml-1">*</span>}
                  {isLoggedInClient && <span className="text-slate-400 text-xs font-normal ml-1">（可选）</span>}
                </label>
                <input
                  type="email"
                  {...register("contactEmail")}
                  placeholder="you@example.com"
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                    errors.contactEmail ? "border-rose-400 bg-rose-50" : "border-slate-300"
                  }`}
                />
                {errors.contactEmail && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <span>⚠</span> {errors.contactEmail.message}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* STEP 2: Language + Review */}
        {step === 2 && (
          <section className="space-y-6">
            {/* Language picker */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                {t("fields.preferredLanguage")}
              </label>
              <p className="text-xs text-slate-400 mb-3">Select the language you prefer for attorney communication.</p>
              <div className="grid grid-cols-3 gap-3">
                {LANGUAGES.map((lang) => {
                  const isSelected = watchedLanguage === lang;
                  return (
                    <label key={lang} className="cursor-pointer">
                      <input type="radio" value={lang} {...register("preferredLanguage")} className="sr-only" />
                      <div
                        className={`py-3 px-4 rounded-xl border-2 text-center transition-all ${
                          isSelected
                            ? "border-amber-500 bg-amber-50"
                            : "border-slate-200 hover:border-amber-300 hover:bg-amber-50/50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">{t(`languages.${lang}`)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ZH_LANGUAGE[lang]}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.preferredLanguage && (
                <p className="mt-1 text-xs text-rose-600">{errors.preferredLanguage.message}</p>
              )}
            </div>

            {/* Case review summary */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Case Summary / 案件摘要
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Category / 类别</p>
                  <p className="font-semibold text-slate-900">{ZH_CATEGORY[getValues("category")] || getValues("category")}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Urgency / 紧急程度</p>
                  <p className="font-semibold text-slate-900">{getValues("urgency")}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Location / 地点</p>
                  <p className="font-semibold text-slate-900">{getValues("stateCode")} {getValues("zipCode")}</p>
                </div>
                {getValues("contactPhone") && (
                  <div>
                    <p className="text-xs text-slate-400">手机 / Phone</p>
                    <p className="font-semibold text-slate-900">
                      {"•".repeat(Math.max(0, getValues("contactPhone")!.length - 4))}{getValues("contactPhone")!.slice(-4)}
                    </p>
                  </div>
                )}
                {getValues("contactEmail") && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">邮箱 / Email</p>
                    <p className="font-semibold text-slate-900 truncate">{getValues("contactEmail")}</p>
                  </div>
                )}
              </div>
              {getValues("title") && (
                <div>
                  <p className="text-xs text-slate-400">Title / 标题</p>
                  <p className="font-semibold text-slate-900 text-sm">{getValues("title")}</p>
                </div>
              )}
            </div>

            {/* Final disclaimer */}
            <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800">
              <ShieldCheckIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <p>
                By submitting, you agree that this platform does not constitute legal advice and no
                attorney-client relationship is formed until explicitly agreed upon.
                <span className="block text-amber-700 mt-1">
                  提交即表示您了解本平台不提供法律建议，律师-客户关系需单独确认。
                </span>
              </p>
            </div>
          </section>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 0}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            ← {t("back")}
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {t("next")} →
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitState === "submitting"}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {submitState === "submitting" ? (
                <>
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                t("submit")
              )}
            </button>
          )}
        </div>

        {submitState === "error" && (
          <div className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
            <p className="font-semibold">提交失败，请重试 / Submission failed, please try again.</p>
            <p className="text-xs text-rose-500 mt-1">如问题持续，请刷新页面后重新填写。 If the issue persists, refresh and try again.</p>
          </div>
        )}
        {submitState === "attorney-blocked" && (
          <div className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
            <p className="font-semibold">⚖️ 律师账号无法发案 / Attorney accounts cannot post cases.</p>
            <p className="text-xs text-amber-700 mt-1">
              请切换至客户账号后重新提交。/ Please sign in with a client account and resubmit.{" "}
              <Link href="/auth/sign-in?role=client" className="underline hover:text-amber-900">切换账号 →</Link>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}

export function CaseMultiStepForm() {
  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
          <div className="h-8 w-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }>
        <CaseMultiStepFormInner />
      </Suspense>
    </I18nextProvider>
  );
}
