"use client";

import { useState } from "react";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";
import Link from "next/link";

interface QaAnswerFormProps {
  questionId: string;
  onSuccess?: () => void;
}

export function QaAnswerForm({ questionId, onSuccess }: QaAnswerFormProps) {
  const { viewer, loading } = useMarketplaceAuth();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-32" />
      </div>
    );
  }

  if (!viewer.authenticated) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-center">
        <p className="text-slate-400 text-sm mb-3">
          律师登录后可免费回答问题，展示专业能力
        </p>
        <Link
          href="/for-attorneys"
          className="inline-block px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
        >
          律师入驻 / 登录
        </Link>
      </div>
    );
  }

  if (viewer.user?.role !== "ATTORNEY") {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-center">
        <p className="text-slate-400 text-sm">仅认证律师可回答问题。</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-green-950/30 border border-green-600/40 rounded-xl p-5 text-center">
        <p className="text-green-400 font-medium">✓ 回答已发布！感谢您的专业解答。</p>
        <button
          onClick={() => {
            setDone(false);
            setBody("");
            onSuccess?.();
          }}
          className="mt-2 text-sm text-slate-400 hover:text-white transition-colors underline"
        >
          继续回答
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 20) {
      setError("回答至少需要 20 个字。");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/qa/${questionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "提交失败，请重试。");
        return;
      }
      setDone(true);
    } catch {
      setError("网络错误，请重试。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <h3 className="text-white font-medium mb-3">您的专业解答</h3>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="请从专业角度解答此法律问题。您的回答将公开显示，并帮助更多有类似问题的华人用户。"
        rows={6}
        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
        disabled={submitting}
      />
      <div className="flex items-center justify-between mt-1 mb-3">
        <span className="text-xs text-slate-500">{body.length} / 10000 字</span>
        {body.trim().length < 20 && body.length > 0 && (
          <span className="text-xs text-red-400">至少需要 20 个字</span>
        )}
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-950/40 border border-red-600/40 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || body.trim().length < 20}
        className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
      >
        {submitting ? "提交中..." : "发布回答"}
      </button>
      <p className="text-xs text-slate-500 mt-2 text-center">
        免责声明：回答内容仅供参考，不构成正式法律意见。
      </p>
    </form>
  );
}
