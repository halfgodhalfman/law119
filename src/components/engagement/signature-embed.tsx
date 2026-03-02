"use client";

/**
 * Docuseal 嵌入式签名组件
 * 使用 @docuseal/react 的 DocusealForm 将签名界面嵌入 Law119 页面内
 */

import { DocusealForm } from "@docuseal/react";
import { useState } from "react";

interface SignatureEmbedProps {
  /** Docuseal submitter 的 embed token（从 /api/.../signature GET 获取）*/
  token: string;
  /** 签名完成回调 */
  onComplete?: () => void;
  /** 签署方显示名称（律师 / 客户） */
  signerLabel?: string;
}

export function SignatureEmbed({ token, onComplete, signerLabel = "您" }: SignatureEmbedProps) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="w-full">
      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <svg className="animate-spin mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-sm">正在加载签名界面…</span>
        </div>
      )}
      <div className={loading ? "hidden" : "block"}>
        <DocusealForm
          token={token}
          host={process.env.NEXT_PUBLIC_DOCUSEAL_HOST ?? "docuseal.com"}
          withTitle={false}
          withDownloadButton={false}
          withSendCopyButton={false}
          withDecline={false}
          language="zh"
          completedMessage={{
            title: "签署完成",
            body: `${signerLabel}已成功完成电子签名，感谢您！`,
          }}
          backgroundColor="#1e293b"   // slate-800 匹配 Law119 深色主题
          onLoad={() => setLoading(false)}
          onComplete={() => {
            onComplete?.();
          }}
          style={{ minHeight: "500px", borderRadius: "12px", overflow: "hidden" }}
        />
      </div>
    </div>
  );
}
