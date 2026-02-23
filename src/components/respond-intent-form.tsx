"use client";

import { useState } from "react";
import { CheckCircleIcon, ChatBubbleIcon, PaperAirplaneIcon, SpinnerIcon } from "./ui/icons";

type Props = {
  caseId: string;
  alreadyResponded: boolean;
  existingBidId?: string;
};

export function RespondIntentForm({ caseId, alreadyResponded, existingBidId }: Props) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<"idle" | "ok" | "error">("idle");
  const [expanded, setExpanded] = useState(false);

  // Preserved exactly from original
  const openExistingChat = async () => {
    if (!existingBidId) return;
    const conversationRes = await fetch("/api/conversations/by-bid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidId: existingBidId }),
    });
    if (!conversationRes.ok) {
      setFeedback("error");
      return;
    }
    const conversationData = await conversationRes.json();
    window.location.href = `/chat/${conversationData.conversationId}`;
  };

  // Preserved exactly from original
  const onRespond = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setFeedback("idle");

    const res = await fetch(`/api/cases/${caseId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      setSubmitting(false);
      setFeedback("error");
      return;
    }

    const responseData = await res.json();
    const conversationRes = await fetch("/api/conversations/by-bid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidId: responseData.bidId }),
    });
    setSubmitting(false);
    if (!conversationRes.ok) {
      setFeedback("error");
      return;
    }

    const conversationData = await conversationRes.json();
    setFeedback("ok");
    window.location.href = `/chat/${conversationData.conversationId}`;
  };

  // Already responded state
  if (alreadyResponded) {
    return (
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-sm font-medium text-emerald-700">Responded</span>
          <span className="text-xs text-slate-400">/ 已回应</span>
        </div>
        <button
          type="button"
          onClick={openExistingChat}
          disabled={!existingBidId}
          className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <ChatBubbleIcon className="h-4 w-4" />
          Open Chat / 打开对话
        </button>
        {feedback === "error" && (
          <span className="text-xs text-rose-600">Failed to open chat.</span>
        )}
      </div>
    );
  }

  // Not yet responded — collapsed button
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
      >
        <PaperAirplaneIcon className="h-4 w-4" />
        Respond to Case / 回应案件
      </button>
    );
  }

  // Expanded respond form
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Your Message to the Client / 给客户的留言
        </label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          placeholder="Introduce yourself and explain how you can help with this case. Brief and professional is best. / 请简要介绍自己及如何协助此案。"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onRespond}
          disabled={submitting || !message.trim()}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <>
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              Sending... / 发送中...
            </>
          ) : (
            <>
              <PaperAirplaneIcon className="h-4 w-4" />
              Send Response / 发送回应
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-slate-400 hover:text-slate-600 text-sm transition-colors"
        >
          Cancel / 取消
        </button>
        {feedback === "error" && (
          <span className="text-sm text-rose-600">Failed to send. Try again. / 发送失败，请重试。</span>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Your message will be sent anonymously to the client. Your bar number and identity are verified by the platform.
        <span className="block mt-0.5">您的消息将匿名发送给客户，您的律师执照已由平台核实。</span>
      </p>
    </div>
  );
}
