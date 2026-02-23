"use client";

import { useState } from "react";
import { ExclamationTriangleIcon, SpinnerIcon } from "./ui/icons";

type Props = {
  conversationId: string;
  text: string;
  accepted: boolean;
  onAccepted: () => void | Promise<void>;
};

export function ProfessionalDisclaimerGate({
  conversationId,
  text,
  accepted,
  onAccepted,
}: Props) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (accepted) return null;

  // Preserved exactly from original
  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/conversations/${conversationId}/disclaimer/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      setSubmitting(false);
      setError("Unable to confirm disclaimer. Please try again.");
      return;
    }
    try {
      await Promise.resolve(onAccepted());
    } catch {
      setError("Confirmed, but failed to refresh chat state. Please try again.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  return (
    <div className="flex-shrink-0 bg-white border-b border-amber-200">
      <div className="max-w-3xl mx-auto px-4 py-5">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-sm">
                Professional Disclaimer / 免责声明
              </h3>
              <p className="text-amber-700 text-xs mt-0.5">
                Please read carefully before proceeding. / 请在继续之前仔细阅读。
              </p>
            </div>
          </div>

          {/* Disclaimer text */}
          <div className="bg-white/70 rounded-xl p-4 max-h-36 overflow-y-auto mb-4 text-sm text-amber-900 leading-6 border border-amber-100">
            {text}
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-amber-600 cursor-pointer"
            />
            <span className="text-sm text-amber-900">
              I have read and understand this disclaimer and wish to proceed.
              <span className="block text-xs text-amber-700 mt-0.5">
                我已阅读并理解上述免责声明，同意继续。
              </span>
            </span>
          </label>

          <button
            type="button"
            disabled={!checked || submitting}
            onClick={confirm}
            className="w-full flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40"
          >
            {submitting ? (
              <>
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                Confirming... / 确认中...
              </>
            ) : (
              "Confirm & Proceed / 确认并继续"
            )}
          </button>

          {error && (
            <p className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
