"use client";

/**
 * /uscis — USCIS 案件状态公开查询页
 *
 * 无需登录，输入收据号即可实时查询状态
 * 登录用户可将案件保存到追踪列表
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import type { USCISStatusResult } from "@/lib/uscis-tracker";
import { STATUS_CATEGORY_UI, getAttorneyRecommendation } from "@/lib/uscis-tracker";

// 常见表格类型供参考
const COMMON_FORMS = [
  { code: "I-485", label: "绿卡申请（调整身份）" },
  { code: "I-130", label: "家庭移民请愿" },
  { code: "I-140", label: "职业移民请愿" },
  { code: "N-400", label: "入籍申请" },
  { code: "I-765", label: "工卡（EAD）申请" },
  { code: "I-131", label: "回美证 / 旅行证" },
  { code: "I-90",  label: "绿卡更新 / 换卡" },
  { code: "I-539", label: "延期居留 / 身份变更" },
  { code: "I-751", label: "撤销绿卡条件（IR-1 延期）" },
  { code: "I-864", label: "经济担保（Affidavit of Support）" },
];

type CheckState = "idle" | "loading" | "done" | "error";

export default function USCISTrackerPage() {
  const [receipt, setReceipt] = useState("");
  const [state, setState] = useState<CheckState>("idle");
  const [result, setResult] = useState<USCISStatusResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [viewerLoggedIn, setViewerLoggedIn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 检测登录状态
  useEffect(() => {
    fetch("/api/marketplace/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j?.user?.id) setViewerLoggedIn(true); })
      .catch(() => {});
  }, []);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = receipt.trim().toUpperCase().replace(/[\s-]/g, "");
    if (!trimmed) return;

    setState("loading");
    setResult(null);
    setErrorMsg("");
    setSaveMsg("");

    try {
      const res = await fetch("/api/uscis/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptNumber: trimmed }),
      });
      const json = await res.json();

      if (!json.ok) {
        setErrorMsg(json.error ?? "查询失败");
        setState("error");
        return;
      }

      setResult(json.result as USCISStatusResult);
      setState("done");
    } catch {
      setErrorMsg("网络错误，请检查网络后重试");
      setState("error");
    }
  };

  const handleSave = async () => {
    if (!result || !viewerLoggedIn) return;
    setIsSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/marketplace/uscis/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptNumber: result.receiptNumber }),
      });
      const json = await res.json();
      if (json.ok) {
        setSaveMsg("已保存到追踪列表！");
      } else if (res.status === 409) {
        setSaveMsg("该收据号已在追踪列表中");
      } else {
        setSaveMsg(json.error ?? "保存失败");
      }
    } catch {
      setSaveMsg("网络错误，保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  const ui = result ? STATUS_CATEGORY_UI[result.category] : null;
  const rec = result ? getAttorneyRecommendation(result.category) : null;

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-900">
        {/* Hero */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700 py-12">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 border border-blue-600/30 text-blue-400 text-xs font-medium mb-4">
              🛂 USCIS 案件追踪
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              USCIS 案件状态查询
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-xl mx-auto">
              输入收据号（Receipt Number）即可查询绿卡、工卡、入籍等申请的实时状态。
              <br />
              <span className="text-slate-500 text-sm">状态直接来自 USCIS，无需跳转官网。</span>
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-10">

          {/* 查询表单 */}
          <form onSubmit={handleCheck} className="mb-8">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={receipt}
                onChange={(e) => setReceipt(e.target.value.toUpperCase())}
                placeholder="收据号，如 LIN2401234567"
                maxLength={20}
                className="flex-1 bg-slate-800 border border-slate-600 focus:border-blue-500 focus:outline-none rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 font-mono tracking-wider"
                disabled={state === "loading"}
              />
              <button
                type="submit"
                disabled={state === "loading" || !receipt.trim()}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center gap-2 flex-shrink-0"
              >
                {state === "loading" ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    查询中…
                  </>
                ) : "🔍 查询状态"}
              </button>
            </div>
            <p className="text-slate-500 text-xs mt-2 ml-1">
              收据号格式：3 个英文字母 + 10~11 位数字，位于 USCIS 寄送的 I-797 通知书顶部
            </p>
          </form>

          {/* 错误提示 */}
          {state === "error" && (
            <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-4 mb-6 flex gap-3">
              <span className="text-red-400 flex-shrink-0">⚠️</span>
              <p className="text-red-300 text-sm">{errorMsg}</p>
            </div>
          )}

          {/* 查询结果 */}
          {state === "done" && result && ui && (
            <div className="space-y-4">
              {/* 状态主卡 */}
              <div className={`rounded-xl border p-5 ${ui.bg} ${ui.border}`}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-slate-400 text-xs font-mono mb-1">{result.receiptNumber}</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ui.dot}`} />
                      <p className={`font-semibold text-base ${ui.color}`}>{result.statusZh}</p>
                    </div>
                    <p className="text-slate-300 text-sm mt-0.5 font-mono">{result.status}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${ui.border} ${ui.color} bg-black/20 flex-shrink-0`}>
                    {ui.label}
                  </span>
                </div>

                {result.statusBody && !result.error && (
                  <div className="bg-black/20 rounded-lg p-4 mt-3">
                    <p className="text-slate-300 text-xs leading-relaxed">{result.statusBody}</p>
                  </div>
                )}

                {result.error && (
                  <div className="bg-amber-900/20 border border-amber-600/20 rounded-lg px-4 py-2.5 mt-3">
                    <p className="text-amber-300 text-xs">
                      ⚠️ 无法自动从 USCIS 获取状态，请
                      <a
                        href={`https://egov.uscis.gov/casestatus/mycasestatus.do`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline ml-1 text-amber-400 hover:text-amber-300"
                      >
                        直接访问 USCIS 官网查询
                      </a>
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <p className="text-slate-500 text-xs">
                    查询时间：{new Date(result.checkedAt).toLocaleString("zh-CN")}
                  </p>
                  <div className="flex gap-2">
                    {viewerLoggedIn ? (
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-1.5 rounded-lg bg-blue-600/20 border border-blue-600/40 text-blue-400 hover:bg-blue-600/30 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {isSaving ? "保存中…" : "📌 保存到追踪列表"}
                      </button>
                    ) : (
                      <Link
                        href={`/marketplace/uscis-cases`}
                        className="px-4 py-1.5 rounded-lg bg-blue-600/20 border border-blue-600/40 text-blue-400 hover:bg-blue-600/30 text-xs font-medium transition-colors"
                      >
                        🔒 登录后可保存追踪
                      </Link>
                    )}
                  </div>
                </div>

                {saveMsg && (
                  <p className={`text-xs mt-2 ${saveMsg.includes("已保存") ? "text-green-400" : "text-amber-400"}`}>
                    {saveMsg}
                    {saveMsg.includes("已保存") && (
                      <Link href="/marketplace/uscis-cases" className="ml-2 underline">
                        查看追踪列表 →
                      </Link>
                    )}
                  </p>
                )}
              </div>

              {/* 律师推荐 CTA */}
              {rec?.show && (
                <div className="rounded-xl border border-red-600/30 bg-red-900/15 p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">⚠️</span>
                    <div className="flex-1">
                      <p className="text-red-300 font-semibold text-sm mb-1">建议咨询移民律师</p>
                      <p className="text-slate-400 text-xs leading-relaxed mb-3">{rec.message}</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Link
                          href="/qa"
                          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-colors text-center"
                        >
                          💬 免费向律师提问
                        </Link>
                        <Link
                          href={`/case/new?category=IMMIGRATION&title=${encodeURIComponent("USCIS 案件咨询：" + result.statusZh)}&description=${encodeURIComponent(`收据号 ${result.receiptNumber} 状态为「${result.status}」，需要律师协助处理。`)}`}
                          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors text-center"
                        >
                          🚨 紧急咨询移民律师 →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 常见表格说明 */}
          {state === "idle" && (
            <div className="mt-4">
              <h2 className="text-slate-300 font-medium text-sm mb-4 flex items-center gap-2">
                <span className="h-4 w-1 bg-blue-500 rounded-full" />
                常见移民申请表格
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMMON_FORMS.map((f) => (
                  <div
                    key={f.code}
                    className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3"
                  >
                    <span className="text-blue-400 font-mono font-semibold text-xs flex-shrink-0 w-14">{f.code}</span>
                    <span className="text-slate-400 text-xs">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 说明区 */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <p className="text-2xl mb-2">🔄</p>
              <p className="text-white font-medium text-sm mb-1">实时查询</p>
              <p className="text-slate-500 text-xs">直接查询 USCIS 官方数据，与官网完全同步</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <p className="text-2xl mb-2">🔔</p>
              <p className="text-white font-medium text-sm mb-1">状态推送</p>
              <p className="text-slate-500 text-xs">登录后追踪案件，状态变化时自动通知</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <p className="text-2xl mb-2">⚖️</p>
              <p className="text-white font-medium text-sm mb-1">律师直连</p>
              <p className="text-slate-500 text-xs">RFE、拒绝等异常状态一键连接移民律师</p>
            </div>
          </div>

          {/* 登录引导 */}
          {!viewerLoggedIn && (
            <div className="mt-8 bg-gradient-to-br from-blue-950/40 to-slate-800 border border-blue-600/30 rounded-xl p-5 text-center">
              <p className="text-white font-medium mb-1">📌 追踪多个案件？</p>
              <p className="text-slate-400 text-sm mb-4">
                登录后可保存多个收据号，系统自动刷新状态，出现 RFE 等异常立即通知。
              </p>
              <Link
                href="/marketplace/uscis-cases"
                className="inline-block px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
              >
                登录查看我的追踪列表 →
              </Link>
            </div>
          )}

          {/* 免责声明 */}
          <div className="mt-8 bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
            <p className="text-slate-500 text-xs leading-relaxed">
              ⚠️ 本工具通过 USCIS 公开接口查询状态，结果与 uscis.gov 一致，但不保证实时性。
              如遇任何查询问题，请直接访问&nbsp;
              <a
                href="https://egov.uscis.gov/casestatus/landing.do"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                USCIS 官网
              </a>
              &nbsp;核实。本页面内容不构成法律建议。
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
