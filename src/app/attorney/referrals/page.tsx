"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";

// ─── Types ───────────────────────────────────────────────────────────────────

type ReferralStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "EXPIRED";
type FeeMode = "PERCENTAGE" | "FIXED" | "NONE";
type FeeStatus = "PENDING" | "HELD" | "RELEASED" | "DISPUTED" | "WAIVED";
type LegalCategory = "IMMIGRATION" | "CRIMINAL" | "CIVIL" | "REAL_ESTATE" | "FAMILY" | "BUSINESS" | "ESTATE_PLAN" | "LABOR" | "TAX" | "OTHER";

interface Attorney {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  firmName?: string | null;
  avatarUrl?: string | null;
  barNumberVerified: boolean;
  isVerified: boolean;
  yearsExperience?: number | null;
  userId?: string;
  specialties: { category: LegalCategory }[];
  serviceAreas: { stateCode: string }[];
  languages: { language: string }[];
}

interface FeeRecord {
  id: string;
  feeAmount: number;
  feeCurrency: string;
  calculationNote?: string | null;
  status: FeeStatus;
  heldAt?: string | null;
  releasedAt?: string | null;
  waivedAt?: string | null;
}

interface Referral {
  id: string;
  clientDescBrief: string;
  legalCategory: LegalCategory;
  stateCode?: string | null;
  urgencyNote?: string | null;
  feeMode: FeeMode;
  feePercent?: number | null;
  feeAmount?: number | null;
  feeCurrency: string;
  feeNote?: string | null;
  status: ReferralStatus;
  declineReason?: string | null;
  notes?: string | null;
  receiverNote?: string | null;
  acceptedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  referrerAttorney: Attorney;
  receiverAttorney: Attorney;
  feeRecord?: FeeRecord | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CAT_LABELS: Record<LegalCategory, string> = {
  IMMIGRATION: "🌎 移民", CRIMINAL: "⚖️ 刑事", CIVIL: "🏛️ 民事",
  REAL_ESTATE: "🏠 房产", FAMILY: "👨‍👩‍👧 家庭", BUSINESS: "💼 商业",
  ESTATE_PLAN: "📜 信托遗产", LABOR: "👷 劳工", TAX: "💰 税务", OTHER: "📋 其他",
};

const STATUS_CONFIG: Record<ReferralStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING:     { label: "待确认",  color: "text-amber-300",  bg: "bg-amber-900/30",   border: "border-amber-600/40" },
  ACCEPTED:    { label: "已接受",  color: "text-sky-300",    bg: "bg-sky-900/30",     border: "border-sky-600/40" },
  DECLINED:    { label: "已拒绝",  color: "text-slate-400",  bg: "bg-slate-800/50",   border: "border-slate-600/40" },
  IN_PROGRESS: { label: "进行中",  color: "text-emerald-300",bg: "bg-emerald-900/30", border: "border-emerald-600/40" },
  COMPLETED:   { label: "已完成",  color: "text-violet-300", bg: "bg-violet-900/30",  border: "border-violet-600/40" },
  CANCELLED:   { label: "已撤销",  color: "text-slate-500",  bg: "bg-slate-800/30",   border: "border-slate-700/30" },
  EXPIRED:     { label: "已过期",  color: "text-slate-500",  bg: "bg-slate-800/30",   border: "border-slate-700/30" },
};

const FEE_STATUS_CONFIG: Record<FeeStatus, { label: string; color: string }> = {
  PENDING:  { label: "待触发",  color: "text-slate-400" },
  HELD:     { label: "托管中",  color: "text-amber-400" },
  RELEASED: { label: "已释放",  color: "text-emerald-400" },
  DISPUTED: { label: "争议中",  color: "text-red-400" },
  WAIVED:   { label: "已放弃",  color: "text-slate-500" },
};

const LANG_LABELS: Record<string, string> = { MANDARIN: "普", CANTONESE: "粤", ENGLISH: "英" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function attyName(a: Attorney) {
  return [a.firstName, a.lastName].filter(Boolean).join(" ") || a.firmName || "律师";
}

function feeDisplay(r: Referral) {
  if (r.feeMode === "NONE") return "无 Fee";
  if (r.feeMode === "PERCENTAGE") return `律师费 ${r.feePercent}%`;
  if (r.feeMode === "FIXED") return `固定 $${r.feeAmount}`;
  return "";
}

function AttorneyChip({ a }: { a: Attorney }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden">
        {a.avatarUrl ? (
          <img src={a.avatarUrl} alt={attyName(a)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
            {attyName(a).slice(0, 1)}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-white text-xs font-semibold">{attyName(a)}</span>
          {a.barNumberVerified && <span className="text-emerald-400 text-[10px]">✓执照</span>}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          {a.yearsExperience && <span>{a.yearsExperience}年</span>}
          {a.specialties.slice(0, 2).map((s) => <span key={s.category}>{CAT_LABELS[s.category].split(" ")[1]}</span>)}
          {a.languages.map((l) => <span key={l.language}>{LANG_LABELS[l.language]}</span>)}
        </div>
      </div>
    </div>
  );
}

// ─── Referral Card ────────────────────────────────────────────────────────────

function ReferralCard({
  referral,
  myRole,
  onRefresh,
}: {
  referral: Referral;
  myRole: "referrer" | "receiver";
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);
  const [declineNote, setDeclineNote] = useState("");
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [finalFeeAmt, setFinalFeeAmt] = useState("");
  const cfg = STATUS_CONFIG[referral.status];
  const counterparty = myRole === "referrer" ? referral.receiverAttorney : referral.referrerAttorney;

  const act = async (action: string, extra?: Record<string, unknown>) => {
    setActing(true);
    try {
      const res = await fetch(`/api/marketplace/referrals/${referral.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (json.ok) onRefresh();
      else alert(json.error ?? "操作失败");
    } catch { alert("网络错误，请重试"); }
    finally { setActing(false); }
  };

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Status */}
          <div className="flex-shrink-0 pt-0.5">
            <span className={`inline-flex text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            {/* Category + State */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-white font-semibold text-sm">{CAT_LABELS[referral.legalCategory]}</span>
              {referral.stateCode && <span className="text-slate-400 text-xs">📍 {referral.stateCode}</span>}
              {referral.urgencyNote && <span className="text-amber-400 text-xs">⚡ {referral.urgencyNote}</span>}
            </div>
            {/* Brief description */}
            <p className="text-slate-300 text-xs leading-relaxed line-clamp-2 mb-2">{referral.clientDescBrief}</p>
            {/* Counterparty + fee */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span>{myRole === "referrer" ? "转给→" : "来自←"}</span>
                <AttorneyChip a={counterparty} />
              </div>
              <span className={`text-xs font-semibold ${referral.feeMode === "NONE" ? "text-slate-500" : "text-amber-400"}`}>
                💰 {feeDisplay(referral)}
              </span>
              <span className="text-slate-600 text-xs">{new Date(referral.createdAt).toLocaleDateString("zh-CN")}</span>
            </div>
            {/* Fee record */}
            {referral.feeRecord && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-400">Fee 托管：</span>
                <span className={`text-xs font-semibold ${FEE_STATUS_CONFIG[referral.feeRecord.status].color}`}>
                  {FEE_STATUS_CONFIG[referral.feeRecord.status].label}
                </span>
                <span className="text-xs text-slate-400">
                  ${referral.feeRecord.feeAmount} {referral.feeRecord.feeCurrency}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        {/* Receiver: accept / decline */}
        {myRole === "receiver" && referral.status === "PENDING" && (
          <>
            <button
              type="button"
              disabled={acting}
              onClick={() => act("accept")}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              {acting ? "…" : "✓ 接受转介绍"}
            </button>
            {!showDeclineInput ? (
              <button
                type="button"
                onClick={() => setShowDeclineInput(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors"
              >
                婉拒
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full mt-1">
                <input
                  value={declineNote}
                  onChange={(e) => setDeclineNote(e.target.value)}
                  placeholder="拒绝原因（可选）"
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
                />
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => act("decline", { declineReason: declineNote })}
                  className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-300 text-xs font-medium disabled:opacity-50"
                >
                  确认拒绝
                </button>
                <button type="button" onClick={() => setShowDeclineInput(false)} className="text-slate-500 text-xs">取消</button>
              </div>
            )}
          </>
        )}

        {/* Referrer: cancel */}
        {myRole === "referrer" && ["PENDING", "ACCEPTED"].includes(referral.status) && (
          <button
            type="button"
            disabled={acting}
            onClick={() => { if (confirm("确认撤销此转介绍？")) act("cancel"); }}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs font-medium transition-colors disabled:opacity-50"
          >
            撤销
          </button>
        )}

        {/* Referrer: mark complete */}
        {myRole === "referrer" && ["ACCEPTED", "IN_PROGRESS"].includes(referral.status) && (
          <div className="flex items-center gap-2 flex-wrap">
            {referral.feeMode === "PERCENTAGE" && (
              <input
                type="number"
                min={0}
                value={finalFeeAmt}
                onChange={(e) => setFinalFeeAmt(e.target.value)}
                placeholder="最终 fee 金额 $"
                className="w-32 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
              />
            )}
            <button
              type="button"
              disabled={acting}
              onClick={() => {
                if (confirm("标记此案件为完成？")) {
                  act("complete", { finalFeeAmount: finalFeeAmt ? Number(finalFeeAmt) : undefined });
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-violet-800 hover:bg-violet-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              ✓ 标记完成
            </button>
          </div>
        )}

        {/* Fee waive */}
        {referral.feeRecord && ["HELD", "PENDING"].includes(referral.feeRecord.status) && (
          <button
            type="button"
            disabled={acting}
            onClick={() => { if (confirm("确认放弃 referral fee？")) act("waive-fee"); }}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs transition-colors disabled:opacity-50"
          >
            放弃 Fee
          </button>
        )}

        {/* Toggle expand */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          {expanded ? "收起 ▲" : "查看详情 ▼"}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-700/40 px-4 py-4 bg-slate-800/40 space-y-3">
          <div>
            <p className="text-slate-400 text-xs font-semibold mb-1">📋 案情描述</p>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{referral.clientDescBrief}</p>
          </div>
          {referral.notes && (
            <div>
              <p className="text-slate-400 text-xs font-semibold mb-1">💬 转出方备注</p>
              <p className="text-slate-300 text-xs leading-relaxed">{referral.notes}</p>
            </div>
          )}
          {referral.receiverNote && (
            <div>
              <p className="text-slate-400 text-xs font-semibold mb-1">💬 接收方回复</p>
              <p className="text-slate-300 text-xs leading-relaxed">{referral.receiverNote}</p>
            </div>
          )}
          {referral.declineReason && (
            <div className="bg-red-900/20 border border-red-600/20 rounded-lg px-3 py-2">
              <p className="text-red-400 text-xs font-semibold mb-0.5">婉拒原因</p>
              <p className="text-red-300/80 text-xs">{referral.declineReason}</p>
            </div>
          )}
          {referral.feeMode !== "NONE" && (
            <div className="bg-amber-900/20 border border-amber-600/20 rounded-lg px-3 py-2">
              <p className="text-amber-300 text-xs font-semibold mb-1">💰 Referral Fee 约定</p>
              <p className="text-amber-200/80 text-xs">{feeDisplay(referral)}{referral.feeNote ? ` — ${referral.feeNote}` : ""}</p>
              <p className="text-amber-200/60 text-[10px] mt-1">
                合规声明：已客户披露 ✓ | 冲突检查 ✓ | 律师协会规则 ✓
              </p>
            </div>
          )}
          {referral.feeRecord && (
            <div className="bg-slate-700/40 rounded-lg px-3 py-2">
              <p className="text-slate-300 text-xs font-semibold mb-1">🏦 Fee 托管记录</p>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold ${FEE_STATUS_CONFIG[referral.feeRecord.status].color}`}>
                  {FEE_STATUS_CONFIG[referral.feeRecord.status].label}
                </span>
                <span className="text-slate-300 text-xs">${referral.feeRecord.feeAmount} {referral.feeRecord.feeCurrency}</span>
                {referral.feeRecord.calculationNote && (
                  <span className="text-slate-500 text-xs">{referral.feeRecord.calculationNote}</span>
                )}
              </div>
              {referral.feeRecord.status === "HELD" && (
                <p className="text-slate-500 text-[10px] mt-1">Fee 正在托管中，请联系平台管理员确认释放</p>
              )}
            </div>
          )}
          <div className="flex items-center gap-4 text-[10px] text-slate-600">
            <span>创建：{new Date(referral.createdAt).toLocaleString("zh-CN")}</span>
            {referral.acceptedAt && <span>接受：{new Date(referral.acceptedAt).toLocaleString("zh-CN")}</span>}
            {referral.completedAt && <span>完成：{new Date(referral.completedAt).toLocaleString("zh-CN")}</span>}
            {referral.expiresAt && <span>有效期至：{new Date(referral.expiresAt).toLocaleDateString("zh-CN")}</span>}
            <span className="font-mono text-[9px]">ID: {referral.id.slice(-8)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Attorney Autocomplete ───────────────────────────────────────────────────

function AttorneySearch({
  category,
  onSelect,
  selected,
}: {
  category: LegalCategory;
  onSelect: (a: Attorney) => void;
  selected: Attorney | null;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Attorney[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected) return;
    if (debounce.current) clearTimeout(debounce.current);
    if (q.length < 1) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/marketplace/referrals/attorney-search?q=${encodeURIComponent(q)}&category=${category}`);
        const json = await res.json();
        if (json.ok) setResults(json.attorneys ?? []);
      } finally { setSearching(false); }
    }, 400);
  }, [q, category, selected]);

  if (selected) {
    return (
      <div className="flex items-center justify-between bg-slate-700/60 border border-emerald-600/40 rounded-xl px-4 py-3">
        <AttorneyChip a={selected} />
        <button type="button" onClick={() => { onSelect(null as unknown as Attorney); setQ(""); }} className="text-slate-400 hover:text-white text-xs ml-3">× 重选</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索律师姓名或律所名称..."
        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
      />
      {searching && <div className="absolute right-3 top-3 w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-xl overflow-hidden">
          {results.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => { onSelect(a); setResults([]); setQ(""); }}
              className="w-full px-4 py-3 hover:bg-slate-700 transition-colors flex items-start gap-3 text-left"
            >
              <div className="w-8 h-8 rounded-full bg-slate-600 flex-shrink-0 overflow-hidden">
                {a.avatarUrl ? (
                  <img src={a.avatarUrl} alt={attyName(a)} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">{attyName(a).slice(0, 1)}</div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-sm font-semibold">{attyName(a)}</span>
                  {a.barNumberVerified && <span className="text-emerald-400 text-xs">✓执照核验</span>}
                </div>
                <div className="text-slate-400 text-xs">
                  {a.specialties.slice(0, 3).map((s) => CAT_LABELS[s.category]).join(" · ")}
                  {a.serviceAreas.length > 0 && ` · ${a.serviceAreas.slice(0, 3).map((s) => s.stateCode).join("/")} 州`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Form ─────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: LegalCategory; label: string }[] = [
  { value: "IMMIGRATION",  label: "🌎 移民法" },
  { value: "CRIMINAL",     label: "⚖️ 刑事法" },
  { value: "CIVIL",        label: "🏛️ 民事诉讼" },
  { value: "REAL_ESTATE",  label: "🏠 房产地产" },
  { value: "FAMILY",       label: "👨‍👩‍👧 家庭法" },
  { value: "BUSINESS",     label: "💼 商业公司" },
  { value: "ESTATE_PLAN",  label: "📜 信托遗产" },
  { value: "LABOR",        label: "👷 劳工雇佣" },
  { value: "TAX",          label: "💰 税务" },
  { value: "OTHER",        label: "📋 其他" },
];

function CreateForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [receiver, setReceiver] = useState<Attorney | null>(null);
  const [category, setCategory] = useState<LegalCategory>("IMMIGRATION");
  const [stateCode, setStateCode] = useState("");
  const [clientDesc, setClientDesc] = useState("");
  const [urgencyNote, setUrgencyNote] = useState("");
  const [feeMode, setFeeMode] = useState<FeeMode>("NONE");
  const [feePercent, setFeePercent] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeNote, setFeeNote] = useState("");
  const [clientDisclosureAck, setClientDisclosureAck] = useState(false);
  const [conflictCheckDone, setConflictCheckDone] = useState(false);
  const [barRuleAck, setBarRuleAck] = useState(false);
  const [notes, setNotes] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFee = feeMode !== "NONE";

  const handleSubmit = async () => {
    if (!receiver) { setError("请选择接收方律师"); return; }
    if (!clientDesc.trim()) { setError("请填写案情描述"); return; }
    if (hasFee && (!clientDisclosureAck || !conflictCheckDone || !barRuleAck)) {
      setError("有 referral fee 时，需勾选全部三项合规声明"); return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverAttorneyId: receiver.id,
          clientDescBrief: clientDesc.trim(),
          legalCategory: category,
          stateCode: stateCode || null,
          urgencyNote: urgencyNote.trim() || null,
          feeMode,
          feePercent: feeMode === "PERCENTAGE" && feePercent ? Number(feePercent) : null,
          feeAmount: feeMode === "FIXED" && feeAmount ? Number(feeAmount) : null,
          feeNote: feeNote.trim() || null,
          clientDisclosureAck,
          conflictCheckDone,
          barRuleAck,
          notes: notes.trim() || null,
          expiresInDays: expiresInDays ? Number(expiresInDays) : null,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "创建失败");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-600/50 rounded-2xl p-6 space-y-5">
      <h2 className="text-white font-bold text-base">↔ 新建案件转介绍</h2>

      {error && (
        <div className="bg-red-900/20 border border-red-600/30 rounded-xl px-4 py-2.5 text-red-400 text-sm">{error}</div>
      )}

      {/* 法律领域 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-slate-300 text-sm font-semibold mb-1.5">法律领域 *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as LegalCategory)}
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
          >
            {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-300 text-sm font-semibold mb-1.5">案件所在州</label>
          <input
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="如 CA / NY"
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* 搜索接收方律师 */}
      <div>
        <label className="block text-slate-300 text-sm font-semibold mb-1.5">接收方律师 *</label>
        <AttorneySearch category={category} onSelect={setReceiver} selected={receiver} />
        <p className="text-slate-500 text-xs mt-1">仅显示已通过执照核验的平台律师</p>
      </div>

      {/* 案情描述 */}
      <div>
        <label className="block text-slate-300 text-sm font-semibold mb-1.5">脱敏案情描述 *</label>
        <textarea
          value={clientDesc}
          onChange={(e) => setClientDesc(e.target.value)}
          rows={4}
          placeholder={"请简要描述案情（勿包含客户真实姓名、联系方式等隐私信息）\n例：客户为在美 H-1B 持有者，公司即将裁员，需咨询转换身份至 O-1 的可行性及时间窗口..."}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
        />
        <p className="text-slate-500 text-xs mt-1">⚠️ 请勿在此填写客户个人身份信息，仅描述法律问题概况</p>
      </div>

      {/* 紧急程度 */}
      <div>
        <label className="block text-slate-400 text-xs mb-1">紧急程度说明（可选）</label>
        <input
          value={urgencyNote}
          onChange={(e) => setUrgencyNote(e.target.value)}
          placeholder="如：H-1B 状态将于 30 天内到期，需尽快处理"
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Referral Fee */}
      <div>
        <label className="block text-slate-300 text-sm font-semibold mb-2">Referral Fee 约定</label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {([["NONE", "不收 Fee", "🤝"], ["PERCENTAGE", "按比例", "📊"], ["FIXED", "固定金额", "💵"]] as const).map(([val, label, icon]) => (
            <button
              key={val}
              type="button"
              onClick={() => setFeeMode(val)}
              className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-colors ${
                feeMode === val ? "border-amber-500 bg-amber-900/30 text-amber-300" : "border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-400"
              }`}
            >
              <div className="text-base mb-0.5">{icon}</div>
              {label}
            </button>
          ))}
        </div>

        {feeMode === "PERCENTAGE" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Fee 百分比 (%)</label>
              <input type="number" min={0} max={100} value={feePercent} onChange={(e) => setFeePercent(e.target.value)}
                placeholder="如 25" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">补充说明</label>
              <input value={feeNote} onChange={(e) => setFeeNote(e.target.value)} placeholder="如：律师费收到后 30 天内支付"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none" />
            </div>
          </div>
        )}
        {feeMode === "FIXED" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">固定金额 (USD)</label>
              <input type="number" min={0} value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)}
                placeholder="如 500" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">支付说明</label>
              <input value={feeNote} onChange={(e) => setFeeNote(e.target.value)} placeholder="如：案件结案后 14 天内"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none" />
            </div>
          </div>
        )}

        {/* 合规声明（有 fee 时必填）*/}
        {hasFee && (
          <div className="mt-3 bg-amber-950/30 border border-amber-600/20 rounded-xl p-4 space-y-2">
            <p className="text-amber-300 text-xs font-semibold mb-2">⚖️ 合规声明（ABA Model Rule 1.5(e)，有 Referral Fee 时必选）</p>
            {[
              { key: "disclosure", label: "已向客户书面披露本次案件转介绍安排及 fee 约定", val: clientDisclosureAck, set: setClientDisclosureAck },
              { key: "conflict",   label: "已对本案件完成利益冲突检查（Conflict Check）", val: conflictCheckDone, set: setConflictCheckDone },
              { key: "bar",        label: "确认本约定符合我所在州律师协会的职业规范", val: barRuleAck, set: setBarRuleAck },
            ].map((item) => (
              <label key={item.key} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.val}
                  onChange={(e) => item.set(e.target.checked)}
                  className="mt-0.5 accent-amber-500"
                />
                <span className="text-amber-200/80 text-xs">{item.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 附加备注 + 有效期 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-slate-400 text-xs mb-1">附加备注（对方可见）</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="如：客户希望尽快安排初次咨询..."
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none resize-none"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1">邀请有效期（天）</label>
          <input
            type="number" min={1} max={90}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
          />
          <p className="text-slate-600 text-xs mt-1">超期后自动变为「已过期」</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors">
          取消
        </button>
        <button
          type="button"
          disabled={submitting || !receiver || !clientDesc.trim()}
          onClick={handleSubmit}
          className="flex-1 px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-bold transition-colors"
        >
          {submitting ? "发送中…" : "发送转介绍邀请 →"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AttorneyReferralsPage() {
  const [outgoing, setOutgoing] = useState<Referral[]>([]);
  const [incoming, setIncoming] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"outgoing" | "incoming">("incoming");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace/referrals");
      const json = await res.json();
      if (json.ok) {
        setOutgoing(json.outgoing ?? []);
        setIncoming(json.incoming ?? []);
      } else {
        setError(json.error ?? "加载失败");
      }
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pendingIncoming = incoming.filter((r) => r.status === "PENDING").length;
  const pendingOutgoing = outgoing.filter((r) => r.status === "PENDING").length;

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Link href="/attorney/dashboard" className="hover:text-amber-400">律师后台</Link>
                <span>/</span>
                <span>转介绍网络</span>
              </div>
              <h1 className="text-xl font-black text-white">律师转介绍网络 · Referral Network</h1>
              <p className="text-slate-400 text-sm mt-1">与其他律师互相转介绍案件，透明记录 referral fee 安排</p>
            </div>
            {!showCreate && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold transition-colors"
              >
                + 发起转介绍
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-600/30 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
              <span className="text-red-400 text-sm">{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-slate-400">×</button>
            </div>
          )}

          {/* Info banner */}
          <div className="bg-amber-950/30 border border-amber-600/20 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-2xl">⚖️</span>
            <div>
              <p className="text-amber-300 font-semibold text-sm">Referral Fee 合规提示</p>
              <p className="text-amber-200/70 text-xs mt-0.5 leading-relaxed">
                根据 ABA Model Rule 1.5(e)，律师转介绍 fee 需满足：
                <strong className="text-amber-300/90">① 按服务比例分成或承担共同责任</strong> ·
                <strong className="text-amber-300/90">② 书面告知客户</strong> ·
                <strong className="text-amber-300/90">③ 总费用合理</strong>。
                平台记录所有转介绍约定，作为合规存档。
              </p>
            </div>
          </div>

          {/* Create Form */}
          {showCreate && (
            <div className="mb-6">
              <CreateForm onSuccess={() => { setShowCreate(false); void load(); }} onCancel={() => setShowCreate(false)} />
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-5 bg-slate-800/50 rounded-xl p-1">
            {([
              { key: "incoming", label: "收到的转介绍", count: pendingIncoming },
              { key: "outgoing", label: "我发出的转介绍", count: pendingOutgoing },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  activeTab === tab.key ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {(activeTab === "incoming" ? incoming : outgoing).length === 0 ? (
                <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/40">
                  <div className="text-4xl mb-3">{activeTab === "incoming" ? "📩" : "📤"}</div>
                  <p className="text-slate-300 font-semibold mb-2">
                    {activeTab === "incoming" ? "暂无收到的转介绍" : "暂未发起转介绍"}
                  </p>
                  <p className="text-slate-500 text-sm">
                    {activeTab === "incoming" ? "当其他律师向您发送转介绍时，将显示在这里" : "点击「发起转介绍」将案件推荐给合适的同行律师"}
                  </p>
                </div>
              ) : (
                (activeTab === "incoming" ? incoming : outgoing).map((r) => (
                  <ReferralCard
                    key={r.id}
                    referral={r}
                    myRole={activeTab === "incoming" ? "receiver" : "referrer"}
                    onRefresh={load}
                  />
                ))
              )}
            </div>
          )}

          {/* Fee stats summary */}
          {(outgoing.some((r) => r.feeRecord) || incoming.some((r) => r.feeRecord)) && (
            <div className="mt-8 bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
              <h3 className="text-slate-300 font-semibold text-sm mb-3">💰 Referral Fee 汇总</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: "托管中",
                    value: [...outgoing, ...incoming].filter((r) => r.feeRecord?.status === "HELD")
                      .reduce((s, r) => s + Number(r.feeRecord?.feeAmount ?? 0), 0),
                  },
                  {
                    label: "已释放",
                    value: [...outgoing, ...incoming].filter((r) => r.feeRecord?.status === "RELEASED")
                      .reduce((s, r) => s + Number(r.feeRecord?.feeAmount ?? 0), 0),
                  },
                  {
                    label: "待触发",
                    value: [...outgoing, ...incoming].filter((r) => r.feeRecord?.status === "PENDING")
                      .reduce((s, r) => s + Number(r.feeRecord?.feeAmount ?? 0), 0),
                  },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-white font-black text-xl">${stat.value.toFixed(0)}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
