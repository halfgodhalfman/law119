"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEGAL_CATEGORIES } from "@/lib/legal-categories";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const LANGUAGES = [
  { value: "MANDARIN", label: "普通话" },
  { value: "CANTONESE", label: "粤语" },
  { value: "ENGLISH", label: "English" },
];

interface FormState {
  title: string;
  body: string;
  category: string;
  stateCode: string;
  preferredLanguage: string;
  authorName: string;
  authorEmail: string;
}

export function QaQuestionForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    title: "",
    body: "",
    category: "",
    stateCode: "",
    preferredLanguage: "MANDARIN",
    authorName: "",
    authorEmail: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (form.title.trim().length < 5) errs.title = "标题至少 5 个字";
    if (form.title.trim().length > 200) errs.title = "标题最多 200 个字";
    if (form.body.trim().length < 20) errs.body = "问题描述至少 20 个字";
    if (!form.category) errs.category = "请选择法律类别";
    if (form.authorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.authorEmail)) {
      errs.authorEmail = "邮箱格式不正确";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/marketplace/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          body: form.body.trim(),
          category: form.category,
          stateCode: form.stateCode || undefined,
          preferredLanguage: form.preferredLanguage,
          authorName: form.authorName.trim() || "匿名用户",
          authorEmail: form.authorEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "提交失败，请重试。");
        return;
      }
      router.push(`/qa/${data.question.id}`);
    } catch {
      setServerError("网络错误，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 标题 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          问题标题 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="简洁描述您的法律问题，例如：配偶绿卡 I-485 在 OPT 期间可以申请吗？"
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          disabled={submitting}
        />
        {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* 详细描述 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          详细描述 <span className="text-red-400">*</span>
        </label>
        <textarea
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          placeholder="请详细描述您的法律情况、时间背景、已采取的措施及诉求，越详细越好..."
          rows={6}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
          disabled={submitting}
        />
        <div className="flex justify-between mt-1">
          {errors.body ? (
            <p className="text-red-400 text-xs">{errors.body}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-slate-500">{form.body.length} / 5000</span>
        </div>
      </div>

      {/* 法律分类 + 州 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            法律类别 <span className="text-red-400">*</span>
          </label>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            disabled={submitting}
          >
            <option value="">请选择...</option>
            {LEGAL_CATEGORIES.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.emoji} {cat.nameZh}
              </option>
            ))}
          </select>
          {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">所在州（可选）</label>
          <select
            value={form.stateCode}
            onChange={(e) => set("stateCode", e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            disabled={submitting}
          >
            <option value="">不限</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 语言偏好 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">语言偏好</label>
        <div className="flex gap-3">
          {LANGUAGES.map((lang) => (
            <label key={lang.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="preferredLanguage"
                value={lang.value}
                checked={form.preferredLanguage === lang.value}
                onChange={() => set("preferredLanguage", lang.value)}
                className="accent-amber-500"
                disabled={submitting}
              />
              <span className="text-sm text-slate-300">{lang.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-slate-700 pt-5">
        <p className="text-xs text-slate-500 mb-4">
          以下信息可选填。姓名默认显示为「匿名用户」。
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              您的称呼（可选）
            </label>
            <input
              type="text"
              value={form.authorName}
              onChange={(e) => set("authorName", e.target.value)}
              placeholder="匿名用户"
              maxLength={80}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              邮箱（可选，收到回答时通知）
            </label>
            <input
              type="email"
              value={form.authorEmail}
              onChange={(e) => set("authorEmail", e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              disabled={submitting}
            />
            {errors.authorEmail && (
              <p className="text-red-400 text-xs mt-1">{errors.authorEmail}</p>
            )}
          </div>
        </div>
      </div>

      {serverError && (
        <div className="p-3 bg-red-950/40 border border-red-600/40 rounded-lg text-red-400 text-sm">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
      >
        {submitting ? "提交中..." : "免费发布问题"}
      </button>

      <p className="text-xs text-slate-500 text-center">
        提交即表示您同意平台服务条款。您的问题将公开显示，供专业律师解答。
      </p>
    </form>
  );
}
