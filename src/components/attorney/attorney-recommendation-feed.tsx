"use client";

import { useEffect, useMemo, useState } from "react";
import { RespondIntentForm } from "../respond-intent-form";

type RecommendationItem = {
  id: string;
  title: string | null;
  category: string;
  urgency: string;
  preferredLanguage: string;
  stateCode: string;
  zipCode: string;
  summary: string;
  createdAtLabel: string;
  quoteDeadlineLabel?: string | null;
  quoteDeadlinePassed: boolean;
  alreadyResponded: boolean;
  existingBidId?: string;
  recommendationReasons: string[];
  riskHints: string[];
};

const STORAGE_KEY = "law119_attorney_reco_actions_v1";

type StoredState = {
  snoozedUntilByCaseId: Record<string, string>;
  uninterestedCaseIds: string[];
};

function loadState(): StoredState {
  if (typeof window === "undefined") {
    return { snoozedUntilByCaseId: {}, uninterestedCaseIds: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      snoozedUntilByCaseId: parsed?.snoozedUntilByCaseId ?? {},
      uninterestedCaseIds: Array.isArray(parsed?.uninterestedCaseIds) ? parsed.uninterestedCaseIds : [],
    };
  } catch {
    return { snoozedUntilByCaseId: {}, uninterestedCaseIds: [] };
  }
}

function saveState(state: StoredState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const URGENCY_STYLES: Record<string, { bar: string; badge: string; label: string; dot?: boolean }> = {
  LOW: { bar: "bg-slate-400", badge: "bg-slate-100 text-slate-700", label: "Low" },
  MEDIUM: { bar: "bg-blue-500", badge: "bg-blue-100 text-blue-700", label: "Medium" },
  HIGH: { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-700", label: "High" },
  URGENT: { bar: "bg-rose-500", badge: "bg-rose-100 text-rose-700", label: "URGENT", dot: true },
};

const CATEGORY_ICONS: Record<string, string> = {
  IMMIGRATION: "✈️",
  CIVIL: "⚖️",
  CRIMINAL: "🛡️",
  FAMILY: "🏠",
  LABOR: "💼",
  BUSINESS: "🏢",
  REAL_ESTATE: "🏘️",
  ESTATE_PLAN: "📜",
  TAX: "🧾",
  OTHER: "📋",
};

export function AttorneyRecommendationFeed({ items }: { items: RecommendationItem[] }) {
  const [state, setState] = useState<StoredState>({ snoozedUntilByCaseId: {}, uninterestedCaseIds: [] });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setState(loadState());
  }, []);

  const visibleItems = useMemo(() => {
    const now = Date.now();
    return items.filter((item) => {
      if (state.uninterestedCaseIds.includes(item.id)) return false;
      const snooze = state.snoozedUntilByCaseId[item.id];
      if (snooze && new Date(snooze).getTime() > now) return false;
      return true;
    });
  }, [items, state]);

  const persist = (next: StoredState, msg?: string) => {
    setState(next);
    saveState(next);
    if (msg) setMessage(msg);
  };

  const snoozeCase = (caseId: string, hours = 24) => {
    const next: StoredState = {
      ...state,
      snoozedUntilByCaseId: {
        ...state.snoozedUntilByCaseId,
        [caseId]: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
      },
    };
    persist(next, `已稍后处理（${hours}h）`);
  };

  const markUninterested = (caseId: string) => {
    const ids = Array.from(new Set([...state.uninterestedCaseIds, caseId]));
    persist({ ...state, uninterestedCaseIds: ids }, "已标记不感兴趣（本地记忆）");
  };

  const clearHidden = () => {
    persist({ snoozedUntilByCaseId: {}, uninterestedCaseIds: [] }, "已恢复全部推荐案件");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="text-xs text-slate-500">
          可见推荐 <span className="font-semibold text-slate-900">{visibleItems.length}</span> / {items.length}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={clearHidden}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
          >
            恢复隐藏推荐
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
          {message}
        </div>
      )}

      {visibleItems.length === 0 && items.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          当前推荐已被你“稍后处理”或“不感兴趣”隐藏，可点击“恢复隐藏推荐”查看。
        </div>
      )}

      {visibleItems.map((item) => {
        const urgency = URGENCY_STYLES[item.urgency] ?? URGENCY_STYLES.MEDIUM;
        return (
          <article
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className={`h-1 w-full ${urgency.bar}`} />
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${urgency.badge}`}>
                  {urgency.dot && <span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-pulse" />}
                  {urgency.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  <span>{CATEGORY_ICONS[item.category] ?? "📋"}</span>
                  {item.category}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700 font-medium">
                  {item.preferredLanguage}
                </span>
                <span className="ml-auto text-xs text-slate-400">{item.createdAtLabel}</span>
              </div>

              {item.title && <p className="text-sm font-semibold text-slate-900 mb-1">{item.title}</p>}
              <p className="text-sm text-slate-600 leading-6 line-clamp-2">{item.summary}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{item.stateCode} {item.zipCode}</span>
                {item.quoteDeadlineLabel && (
                  <span className={item.quoteDeadlinePassed ? "text-rose-600" : "text-slate-500"}>
                    截止 {item.quoteDeadlineLabel}
                  </span>
                )}
              </div>

              {item.recommendationReasons.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-[11px] font-medium text-slate-500">推荐原因</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.recommendationReasons.map((reason) => (
                      <span key={reason} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.riskHints.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-[11px] font-medium text-slate-500">风险提示</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.riskHints.map((hint) => (
                      <span key={hint} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                        {hint}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => snoozeCase(item.id, 24)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  稍后处理（24h）
                </button>
                <button
                  type="button"
                  onClick={() => markUninterested(item.id)}
                  className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
                >
                  不感兴趣
                </button>
                <span className="text-[11px] text-slate-400">本地记忆，不影响平台案件数据</span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <RespondIntentForm
                  caseId={item.id}
                  alreadyResponded={item.alreadyResponded}
                  existingBidId={item.existingBidId}
                />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

