"use client";

/**
 * 签名面板组件
 *
 * 嵌入到聘用协议（Engagement）页面中，引导律师和客户完成电子签名。
 * 根据当前用户角色和签名状态显示不同 UI。
 */

import { useState, useCallback } from "react";
import { SignatureEmbed } from "./signature-embed";

export type SignatureStatus =
  | "PENDING"
  | "AWAITING_ATTORNEY"
  | "AWAITING_CLIENT"
  | "COMPLETED"
  | "VOIDED";

interface SignaturePanelProps {
  engagementId: string;
  userRole: "ATTORNEY" | "CLIENT" | "ADMIN";
  /** 当前签名状态（从 server 传入，客户端可刷新） */
  initialStatus: SignatureStatus | null;
  /** 签名完成后的 PDF 下载 URL */
  signedPdfUrl?: string | null;
  /** 如果已存在签名请求，从 server 传入 embed token */
  initialEmbedToken?: string | null;
  /** 律师触发「确认条款」后的回调（在此之后创建签名请求）*/
  onAttorneyConfirmTerms?: () => Promise<void>;
}

export function SignaturePanel({
  engagementId,
  userRole,
  initialStatus,
  signedPdfUrl,
  initialEmbedToken,
  onAttorneyConfirmTerms,
}: SignaturePanelProps) {
  const [status, setStatus] = useState<SignatureStatus | null>(initialStatus);
  const [embedToken, setEmbedToken] = useState<string | null>(initialEmbedToken ?? null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState(signedPdfUrl ?? null);

  /** 调用 API 创建签名请求（律师侧调用） */
  const createSignatureRequest = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      // 先执行律师条款确认（如果有回调）
      if (onAttorneyConfirmTerms) {
        await onAttorneyConfirmTerms();
      }

      const res = await fetch(`/api/marketplace/engagements/${engagementId}/signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "创建签名请求失败");

      setEmbedToken(data.signature.embedToken);
      setStatus("AWAITING_ATTORNEY");
      setShowForm(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "发生错误，请重试");
    } finally {
      setCreating(false);
    }
  }, [engagementId, onAttorneyConfirmTerms]);

  /** 刷新签名状态（签名完成后的轮询） */
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/marketplace/engagements/${engagementId}/signature`);
      const data = await res.json();
      if (data.ok && data.signature) {
        setStatus(data.signature.status);
        if (data.signature.embedToken) setEmbedToken(data.signature.embedToken);
        if (data.signature.signedPdfUrl) setPdfUrl(data.signature.signedPdfUrl);
      }
    } catch {
      // 静默失败，用户可手动刷新
    }
  }, [engagementId]);

  /** 签名完成回调 */
  const handleSignComplete = useCallback(() => {
    setShowForm(false);
    // 延迟 2 秒后刷新状态（等待 Docuseal webhook 处理）
    setTimeout(refreshStatus, 2000);
    // 再次尝试（webhook 可能有延迟）
    setTimeout(refreshStatus, 6000);
  }, [refreshStatus]);

  // ── COMPLETED 状态 ──────────────────────────────────────────────────────
  if (status === "COMPLETED") {
    return (
      <div className="rounded-xl border border-green-700/40 bg-green-900/20 p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-400">聘用协议已双方签署</p>
            <p className="text-sm text-slate-400">电子签名具有 ESIGN Act 法律效力，协议正式生效</p>
          </div>
        </div>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            下载签名 PDF 协议
          </a>
        )}
      </div>
    );
  }

  // ── VOIDED 状态 ────────────────────────────────────────────────────────
  if (status === "VOIDED") {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-400">
        签名请求已作废。如需重新签署，请重新发起聘用协议。
      </div>
    );
  }

  // ── 律师侧 ─────────────────────────────────────────────────────────────
  if (userRole === "ATTORNEY" || userRole === "ADMIN") {
    // 已发起请求，等待律师签名
    if (status === "AWAITING_ATTORNEY") {
      return (
        <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">✍️</span>
              <div>
                <p className="font-semibold text-amber-400">请完成电子签名</p>
                <p className="text-sm text-slate-400">点击下方按钮在协议上签名，客户将随后收到签名请求</p>
              </div>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
              >
                打开签名界面 →
              </button>
            )}
          </div>
          {showForm && embedToken && (
            <SignatureEmbed
              token={embedToken}
              onComplete={handleSignComplete}
              signerLabel="律师"
            />
          )}
        </div>
      );
    }

    // 律师已签，等待客户
    if (status === "AWAITING_CLIENT") {
      return (
        <div className="rounded-xl border border-blue-700/40 bg-blue-900/10 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <p className="font-semibold text-blue-400">等待客户签名中…</p>
              <p className="text-sm text-slate-400">您已完成签名，客户收到通知后需登录签署协议</p>
            </div>
          </div>
          <button
            onClick={refreshStatus}
            className="mt-3 text-xs text-slate-500 hover:text-slate-300 underline"
          >
            刷新状态
          </button>
        </div>
      );
    }

    // PENDING：律师尚未发起签名请求（在确认条款后触发）
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl">📄</span>
          <div>
            <p className="font-semibold text-white">聘用协议电子签名</p>
            <p className="text-sm text-slate-400">
              确认服务条款后，需双方完成电子签名方可激活协议（符合 ESIGN Act）
            </p>
          </div>
        </div>
        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-900/30 border border-red-600/30 text-red-400 text-sm">
            {error}
          </div>
        )}
        <button
          onClick={createSignatureRequest}
          disabled={creating}
          className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-sm transition-colors"
        >
          {creating ? "准备签名文件中…" : "✍️ 确认条款并发起电子签名"}
        </button>
      </div>
    );
  }

  // ── 客户侧 ─────────────────────────────────────────────────────────────
  if (userRole === "CLIENT") {
    // 待律师签名，客户等待
    if (status === "AWAITING_ATTORNEY" || status === "PENDING" || status === null) {
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="text-lg">⏳</span>
            <div>
              <p className="text-white font-medium">等待律师签署聘用协议</p>
              <p>律师完成签名后，您将收到通知，届时需要您也签署协议以激活服务。</p>
            </div>
          </div>
        </div>
      );
    }

    // 律师已签，轮到客户
    if (status === "AWAITING_CLIENT") {
      return (
        <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">✍️</span>
              <div>
                <p className="font-semibold text-amber-400">请签署聘用协议</p>
                <p className="text-sm text-slate-400">律师已完成签名，您的签名将正式激活本聘用协议</p>
              </div>
            </div>
            {!showForm && (
              <button
                onClick={async () => {
                  // 客户首次点击时先获取 embed token（如果还没有）
                  if (!embedToken) {
                    try {
                      const res = await fetch(`/api/marketplace/engagements/${engagementId}/signature`);
                      const d = await res.json();
                      if (d.ok && d.signature?.embedToken) {
                        setEmbedToken(d.signature.embedToken);
                      }
                    } catch {
                      setError("获取签名链接失败，请刷新重试");
                      return;
                    }
                  }
                  setShowForm(true);
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
              >
                查看并签署协议 →
              </button>
            )}
          </div>
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-900/30 border border-red-600/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          {showForm && embedToken && (
            <SignatureEmbed
              token={embedToken}
              onComplete={handleSignComplete}
              signerLabel="您"
            />
          )}
        </div>
      );
    }
  }

  return null;
}
