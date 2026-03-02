"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { FormTemplateDetail, FormData, FormStep, FormField } from "@/types/legal-form";

const US_STATES_LIST = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

function FieldRenderer({ field, value, onChange }: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const base = "w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors";

  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholderZh ?? field.placeholder}
        required={field.required}
        rows={3}
        className={`${base} resize-none`}
      />
    );
  }

  if (field.type === "select" || field.type === "state") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} required={field.required} className={base}>
        <option value="">请选择 / Select...</option>
        {field.type === "state"
          ? (field.options ?? US_STATES_LIST.map((s) => ({ value: s, label: s, labelZh: s }))).map((o) => (
              <option key={o.value} value={o.value}>{o.labelZh} ({o.value})</option>
            ))
          : (field.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>{o.labelZh}</option>
            ))}
      </select>
    );
  }

  const inputType = field.type === "money" ? "number" :
    field.type === "phone" ? "tel" :
    field.type === "date" ? "date" :
    field.type === "email" ? "email" :
    field.type === "number" ? "number" : "text";

  return (
    <input
      type={inputType}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholderZh ?? field.placeholder}
      required={field.required}
      min={field.type === "money" || field.type === "number" ? "0" : undefined}
      step={field.type === "money" ? "0.01" : undefined}
      className={base}
    />
  );
}

function StepRenderer({ step, formData, onUpdate }: {
  step: FormStep;
  formData: FormData;
  onUpdate: (id: string, value: string) => void;
}) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-white font-semibold text-base">{step.titleZh}</h2>
        {step.descriptionZh && (
          <p className="text-slate-400 text-sm mt-1">{step.descriptionZh}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {step.fields.map((field) => (
          <div key={field.id} className={field.colSpan === 2 ? "col-span-2" : "col-span-2 sm:col-span-1"}>
            <label className="block text-sm text-slate-300 mb-1.5">
              {field.labelZh}
              {field.required && <span className="text-amber-400 ml-1">*</span>}
            </label>
            <FieldRenderer
              field={field}
              value={formData[field.id] ?? ""}
              onChange={(v) => onUpdate(field.id, v)}
            />
            {field.helpTextZh && (
              <p className="text-slate-500 text-xs mt-1">{field.helpTextZh}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormWizard({ template }: { template: FormTemplateDetail }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState("");

  const steps: FormStep[] = template.config.steps;
  const totalSteps = steps.length;
  const step = steps[currentStep];

  useEffect(() => {
    // 生成/读取 sessionKey（匿名用户身份标识）
    const stored = localStorage.getItem("law119_form_sk");
    if (stored) {
      setSessionKey(stored);
    } else {
      const key = crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem("law119_form_sk", key);
      setSessionKey(key);
    }
  }, []);

  const updateField = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const validateCurrentStep = (): boolean => {
    for (const field of step.fields) {
      if (field.required && !formData[field.id]?.trim()) {
        setError(`请填写"${field.labelZh}"`);
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep((s) => s + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setCurrentStep((s) => s - 1);
    setError(null);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/forms/${template.slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData, sessionKey }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "提交失败");
      router.push(`/forms/${template.slug}/preview/${data.submissionId}?sk=${sessionKey}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交时发生错误，请重试。");
      setSubmitting(false);
    }
  };

  const progress = ((currentStep) / totalSteps) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>步骤 {currentStep + 1} / {totalSteps}</span>
          <span>{Math.round(progress)}% 完成</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* 步骤指示器 */}
        <div className="flex gap-1 mt-3">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i < currentStep ? "bg-amber-500" :
                i === currentStep ? "bg-amber-400" : "bg-slate-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <StepRenderer step={step} formData={formData} onUpdate={updateField} />

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-600/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 导航按钮 */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors"
          >
            ← 上一步
          </button>

          {currentStep < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
            >
              下一步 →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {submitting ? "生成中..." : "✓ 生成文书"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
