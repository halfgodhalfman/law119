"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type CreateCaseResponse = {
  ok?: boolean;
  error?: string;
  case?: { id: string };
  hallPreview?: { descriptionMasked: string };
};

type PostCaseForm = {
  title: string;
  category: string;
  subCategorySlug: string;
  stateCode: string;
  city: string;
  zipCode: string;
  description: string;
  urgency: string;
  preferredLanguage: string;
  contactPhone: string;
  contactEmail: string;
  budgetMin: string;
  budgetMax: string;
  feeMode: string;
  quoteDeadlineLocal: string;
};

const CATEGORY_OPTIONS = [
  "IMMIGRATION",
  "CRIMINAL",
  "CIVIL",
  "REAL_ESTATE",
  "FAMILY",
  "BUSINESS",
  "ESTATE_PLAN",
  "LABOR",
  "TAX",
  "OTHER",
] as const;

const DRAFT_KEY = "law119:marketplace:post-case-draft:v1";

const DEFAULT_FORM: PostCaseForm = {
  title: "",
  category: "CIVIL",
  subCategorySlug: "",
  stateCode: "CA",
  city: "San Francisco",
  zipCode: "94105",
  description: "",
  urgency: "MEDIUM",
  preferredLanguage: "MANDARIN",
  contactPhone: "",
  contactEmail: "",
  budgetMin: "",
  budgetMax: "",
  feeMode: "CUSTOM",
  quoteDeadlineLocal: "",
};

const STEPS = [
  { id: 0, title: "基础信息", desc: "标题、类目、地区" },
  { id: 1, title: "预算与截止", desc: "收费模式、预算、报价截止" },
  { id: 2, title: "案情与附件", desc: "案情描述、附件入口" },
  { id: 3, title: "联系方式", desc: "联系方式与提交前检查" },
] as const;

export default function MarketplacePostCasePage() {
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateCaseResponse | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [step, setStep] = useState<number>(0);
  const [form, setForm] = useState<PostCaseForm>(DEFAULT_FORM);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftMsg, setDraftMsg] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Array<{ name: string; size: number; type: string }>>([]);
  const autosaveRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { form?: Partial<PostCaseForm>; attachments?: Array<{ name: string; size: number; type: string }> };
        if (parsed.form) setForm((prev) => ({ ...prev, ...parsed.form }));
        if (Array.isArray(parsed.attachments)) setAttachments(parsed.attachments);
        setDraftMsg("已恢复本地草稿");
      }
    } catch {
      setDraftMsg("本地草稿读取失败");
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    autosaveRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, attachments, savedAt: new Date().toISOString() }));
      } catch {
        // ignore quota errors for MVP local draft
      }
    }, 400);
    return () => {
      if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    };
  }, [form, attachments, draftLoaded]);

  const budgetMinNum = form.budgetMin ? Number(form.budgetMin) : null;
  const budgetMaxNum = form.budgetMax ? Number(form.budgetMax) : null;
  const budgetRangeInvalid =
    budgetMinNum != null && budgetMaxNum != null && !Number.isNaN(budgetMinNum) && !Number.isNaN(budgetMaxNum)
      ? budgetMinNum > budgetMaxNum
      : false;

  const deadlineError = useMemo(() => {
    if (!form.quoteDeadlineLocal) return null;
    const deadline = new Date(form.quoteDeadlineLocal);
    if (Number.isNaN(deadline.getTime())) return "报价截止时间格式无效。";
    if (deadline.getTime() <= Date.now()) return "报价截止时间必须是未来时间。";
    return null;
  }, [form.quoteDeadlineLocal]);

  function flashDraftMsg(msg: string) {
    setDraftMsg(msg);
    window.setTimeout(() => setDraftMsg(null), 1500);
  }

  function saveDraftNow() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, attachments, savedAt: new Date().toISOString() }));
      flashDraftMsg("草稿已保存到本地");
    } catch {
      flashDraftMsg("草稿保存失败");
    }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setForm(DEFAULT_FORM);
    setAttachments([]);
    setResult(null);
    setClientError(null);
    setStep(0);
    flashDraftMsg("本地草稿已清除");
  }

  function applyDeadlinePreset(hours: number) {
    const target = new Date(Date.now() + hours * 60 * 60 * 1000);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    const hh = String(target.getHours()).padStart(2, "0");
    const mi = String(target.getMinutes()).padStart(2, "0");
    setForm((v) => ({ ...v, quoteDeadlineLocal: `${yyyy}-${mm}-${dd}T${hh}:${mi}` }));
    setClientError(null);
  }

  function validateStep(targetStep: number): string | null {
    if (targetStep === 0) {
      if (form.title.trim().length < 2) return "请填写案件标题（至少 2 个字符）。";
      if (!form.stateCode.trim() || form.stateCode.trim().length !== 2) return "州代码需为 2 位字母。";
      if (!form.zipCode.trim()) return "请填写邮编。";
    }
    if (targetStep === 1) {
      if (budgetRangeInvalid) return "预算区间无效：最低预算不能高于最高预算。";
      if (deadlineError) return deadlineError;
    }
    if (targetStep === 2) {
      if (form.description.trim().length < 20) return "案情描述至少 20 个字符，便于律师判断。";
    }
    if (targetStep === 3) {
      if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) return "联系邮箱格式无效。";
    }
    return null;
  }

  function goNextStep() {
    const err = validateStep(step);
    if (err) {
      setClientError(err);
      return;
    }
    setClientError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goPrevStep() {
    setClientError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function onAttachmentInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setAttachments(files.map((f) => ({ name: f.name, size: f.size, type: f.type || "unknown" })));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setClientError(null);

    for (let i = 0; i < STEPS.length; i += 1) {
      const err = validateStep(i);
      if (err) {
        setStep(i);
        setClientError(err);
        return;
      }
    }

    const budgetMin = form.budgetMin ? Number(form.budgetMin) : null;
    const budgetMax = form.budgetMax ? Number(form.budgetMax) : null;

    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/marketplace/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          subCategorySlug: form.subCategorySlug || undefined,
          city: form.city || undefined,
          contactPhone: form.contactPhone || undefined,
          contactEmail: form.contactEmail || undefined,
          budgetMin: budgetMin ?? undefined,
          budgetMax: budgetMax ?? undefined,
          quoteDeadline: form.quoteDeadlineLocal ? new Date(form.quoteDeadlineLocal).toISOString() : undefined,
        }),
      });

      const data = (await response.json()) as CreateCaseResponse;
      setResult(data);
      if (response.ok) {
        localStorage.removeItem(DRAFT_KEY);
        flashDraftMsg("发布成功，已清除本地草稿");
      }
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = viewer.user?.role !== "ATTORNEY";

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <section className="bg-slate-900 text-white">
          <div className="max-w-4xl mx-auto px-4 py-10">
            <p className="text-amber-400 text-sm font-medium">Marketplace MVP / 帮帮网式流程骨架</p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold">发布案件（步骤式）</h1>
            <p className="mt-2 text-slate-300 text-sm">
              借鉴华人帮帮网的长表单体验：分步骤填写、草稿保存、分步校验。业务字段仍为 law119 法律案件模型。
            </p>
            {!authLoading && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/10 px-2.5 py-1">当前角色：{viewer.user?.role ?? "ANONYMOUS"}</span>
                <Link href="/marketplace/my-cases" className="rounded-full bg-white/10 px-2.5 py-1 hover:bg-white/20">我的案件</Link>
                <Link href="/marketplace/case-hall" className="rounded-full bg-white/10 px-2.5 py-1 hover:bg-white/20">案件大厅</Link>
              </div>
            )}
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 -mt-4">
          {!authLoading && viewer.user?.role === "ATTORNEY" && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              当前登录为律师账号，不允许发布案件。请使用发布方账号（CLIENT）登录，或前往案件大厅报价。
              <div className="mt-2"><Link href="/marketplace/case-hall" className="underline">去案件大厅</Link></div>
            </div>
          )}

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Draft / 草稿</p>
                <p className="text-sm text-slate-700 mt-1">本地自动保存（localStorage）。后续可升级为服务端草稿表。</p>
                {draftMsg && <p className="mt-1 text-xs text-emerald-700">{draftMsg}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={saveDraftNow} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                  保存草稿
                </button>
                <button type="button" onClick={clearDraft} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                  清空草稿
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-4">
              {STEPS.map((s, idx) => {
                const active = idx === step;
                const done = idx < step;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (idx <= step) {
                        setClientError(null);
                        setStep(idx);
                      }
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    <p className="text-xs font-semibold">步骤 {idx + 1}</p>
                    <p className="mt-1 text-sm font-semibold">{s.title}</p>
                    <p className={`mt-1 text-xs ${active ? "text-slate-300" : done ? "text-emerald-700" : "text-slate-400"}`}>{s.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
            <form onSubmit={onSubmit} className="space-y-5">
              {step === 0 && (
                <section className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">基础信息</h2>
                    <p className="text-sm text-slate-500 mt-1">先用最少字段完成发布骨架，降低发布门槛。</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">案件标题</span>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={form.title}
                        onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))}
                        placeholder="例如：劳动纠纷协商与索赔"
                        required
                      />
                    </label>
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">案件类别</span>
                      <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))}>
                        {CATEGORY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">州</span>
                      <input className="w-full rounded-lg border border-slate-300 px-3 py-2 uppercase" maxLength={2} value={form.stateCode} onChange={(e) => setForm((v) => ({ ...v, stateCode: e.target.value.toUpperCase() }))} required />
                    </label>
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">城市</span>
                      <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.city} onChange={(e) => setForm((v) => ({ ...v, city: e.target.value }))} />
                    </label>
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">邮编</span>
                      <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.zipCode} onChange={(e) => setForm((v) => ({ ...v, zipCode: e.target.value }))} required />
                    </label>
                  </div>
                  <label className="text-sm">
                    <span className="block text-slate-700 mb-1.5">子类目（可选）</span>
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.subCategorySlug} onChange={(e) => setForm((v) => ({ ...v, subCategorySlug: e.target.value }))} placeholder="例如：employment-termination" />
                  </label>
                </section>
              )}

              {step === 1 && (
                <section className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">预算与报价截止</h2>
                    <p className="text-sm text-slate-500 mt-1">借鉴帮帮网发布流程里的“报价窗口”概念，帮助律师快速判断是否参与。</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">紧急程度</span>
                      <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.urgency} onChange={(e) => setForm((v) => ({ ...v, urgency: e.target.value }))}>
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">语言偏好</span>
                      <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.preferredLanguage} onChange={(e) => setForm((v) => ({ ...v, preferredLanguage: e.target.value }))}>
                        <option value="MANDARIN">MANDARIN</option>
                        <option value="CANTONESE">CANTONESE</option>
                        <option value="ENGLISH">ENGLISH</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">收费模式</span>
                      <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.feeMode} onChange={(e) => setForm((v) => ({ ...v, feeMode: e.target.value }))}>
                        <option value="CUSTOM">CUSTOM</option>
                        <option value="CONSULTATION">CONSULTATION</option>
                        <option value="AGENCY">AGENCY</option>
                        <option value="STAGED">STAGED</option>
                        <option value="HOURLY">HOURLY</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">预算最低（可选）</span>
                      <input type="number" min={0} className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.budgetMin} onChange={(e) => setForm((v) => ({ ...v, budgetMin: e.target.value }))} />
                    </label>
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">预算最高（可选）</span>
                      <input type="number" min={0} className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.budgetMax} onChange={(e) => setForm((v) => ({ ...v, budgetMax: e.target.value }))} />
                    </label>
                  </div>
                  <label className="text-sm block">
                    <span className="block text-slate-700 mb-1.5">报价截止时间（可选）</span>
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={form.quoteDeadlineLocal}
                      onChange={(e) => setForm((v) => ({ ...v, quoteDeadlineLocal: e.target.value }))}
                      min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                    />
                    <span className="block mt-1 text-xs text-slate-500">必须是未来时间；到期后律师不可报价。</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => applyDeadlinePreset(24)} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50">+24h</button>
                      <button type="button" onClick={() => applyDeadlinePreset(48)} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50">+48h</button>
                      <button type="button" onClick={() => applyDeadlinePreset(24 * 7)} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50">+7天</button>
                      {form.quoteDeadlineLocal && (
                        <button type="button" onClick={() => setForm((v) => ({ ...v, quoteDeadlineLocal: "" }))} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50">清除</button>
                      )}
                    </div>
                  </label>
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm">
                    <p className="font-medium text-slate-700">本步校验</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-500">
                      <li>预算区间（如填写）需满足最低值不高于最高值</li>
                      <li>截止时间（如填写）必须晚于当前时间</li>
                    </ul>
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">案情与附件</h2>
                    <p className="text-sm text-slate-500 mt-1">详情页是成交中枢，案情信息要足够让律师判断是否报价。</p>
                  </div>
                  <label className="text-sm block">
                    <span className="block text-slate-700 mb-1.5">案情描述（大厅会脱敏显示）</span>
                    <textarea
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 min-h-40"
                      value={form.description}
                      onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))}
                      placeholder="描述争议背景、当前阶段、你希望律师提供的帮助..."
                      required
                    />
                    <span className="mt-1 block text-xs text-slate-500">建议至少 20 字，避免大厅信息不足影响报价转化。</span>
                  </label>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">附件上传入口（占位）</p>
                        <p className="text-xs text-slate-500 mt-1">本阶段先做入口和草稿记忆；后续接 Supabase Storage + 脱敏审核。</p>
                      </div>
                      <label className="rounded-lg border border-slate-300 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                        选择附件（本地占位）
                        <input type="file" multiple className="hidden" onChange={onAttachmentInputChange} />
                      </label>
                    </div>
                    <div className="mt-3 space-y-2">
                      {attachments.length === 0 && <p className="text-xs text-slate-500">暂未选择附件。</p>}
                      {attachments.map((f, idx) => (
                        <div key={`${f.name}-${idx}`} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
                          <span className="truncate">{f.name}</span>
                          <span className="text-slate-500 ml-3 whitespace-nowrap">{Math.max(1, Math.round(f.size / 1024))} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {step === 3 && (
                <section className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">联系方式与提交</h2>
                    <p className="text-sm text-slate-500 mt-1">保持低门槛发布：联系方式可选，前台大厅默认展示脱敏摘要。</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">联系电话（可选）</span>
                      <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.contactPhone} onChange={(e) => setForm((v) => ({ ...v, contactPhone: e.target.value }))} />
                    </label>
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">联系邮箱（可选）</span>
                      <input type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.contactEmail} onChange={(e) => setForm((v) => ({ ...v, contactEmail: e.target.value }))} />
                    </label>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">提交前摘要</p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>标题：{form.title || "未填写"}</p>
                      <p>类目：{form.category}</p>
                      <p>地区：{form.stateCode || "--"} {form.city || ""}</p>
                      <p>收费模式：{form.feeMode}</p>
                      <p>预算：{form.budgetMin || "-"} ~ {form.budgetMax || "-"}</p>
                      <p>截止：{form.quoteDeadlineLocal || "未设置"}</p>
                      <p>案情长度：{form.description.trim().length} 字</p>
                      <p>附件：{attachments.length} 个（占位）</p>
                    </div>
                  </div>
                </section>
              )}

              {clientError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{clientError}</div>}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <div className="flex gap-2">
                  <button type="button" onClick={goPrevStep} disabled={step === 0} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
                    上一步
                  </button>
                  {step < STEPS.length - 1 ? (
                    <button type="button" onClick={goNextStep} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
                      下一步
                    </button>
                  ) : (
                    <button type="submit" disabled={submitting || !canSubmit} className="rounded-lg bg-amber-600 px-4 py-2.5 text-white font-semibold hover:bg-amber-500 disabled:opacity-60">
                      {submitting ? "提交中..." : "发布案件"}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={saveDraftNow} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm hover:bg-slate-50">
                    保存草稿
                  </button>
                  <Link href="/marketplace/case-hall" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                    去案件大厅
                  </Link>
                </div>
              </div>
            </form>
          </div>

          {result && (
            <div className={`mt-4 rounded-xl border p-4 ${result.ok ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
              {result.ok ? (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-emerald-800">发布成功</p>
                  <p className="text-emerald-700">案件 ID: {result.case?.id}</p>
                  {result.hallPreview?.descriptionMasked && <p className="text-emerald-700">大厅脱敏预览：{result.hallPreview.descriptionMasked}</p>}
                  {result.case?.id && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      <Link className="underline text-emerald-800" href={`/marketplace/cases/${result.case.id}`}>查看案件详情</Link>
                      <Link className="underline text-emerald-800" href={`/marketplace/cases/${result.case.id}/select`}>发布方选择报价页</Link>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-rose-700 text-sm">发布失败：{result.error ?? "Unknown error"}</p>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
