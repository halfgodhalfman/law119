"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ChangeEvent } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type HallItem = {
  id: string;
  title: string;
  category: string;
  stateCode: string;
  city: string | null;
  zipCodeMasked: string;
  urgency: string;
  status: string;
  feeMode?: string | null;
  budgetMin?: string | number | null;
  budgetMax?: string | number | null;
  quoteDeadline?: string | null;
  quoteCount: number;
  hasMyBid?: boolean;
  recommendationReasons?: string[];
  riskHints?: string[];
  descriptionMasked: string;
  createdAt: string;
};

type HallResponse = {
  items?: HallItem[];
  filters?: {
    page: number;
    totalPages: number;
    total: number;
    sort: string;
    recommendationReasons?: string[];
    quoteableOnly?: boolean;
  };
  error?: string;
};

function moneyRange(min?: string | number | null, max?: string | number | null) {
  if (min == null && max == null) return "未填写";
  if (min != null && max != null && `${min}` === `${max}`) return `$${min}`;
  return `$${min ?? "?"} - $${max ?? "?"}`;
}

function fmtDeadline(input?: string | null) {
  if (!input) return "未设置截止";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "无效截止时间";
  return d.toLocaleString();
}

function isDeadlinePassed(input?: string | null) {
  if (!input) return false;
  const ts = new Date(input).getTime();
  return !Number.isNaN(ts) && ts <= Date.now();
}

function isDeadlineSoon(input?: string | null) {
  if (!input) return false;
  const ts = new Date(input).getTime();
  if (Number.isNaN(ts)) return false;
  const diff = ts - Date.now();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
}

export default function CaseHallPage() {
  return (<Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">加载中...</div>}><CaseHallInner /></Suspense>);
}

function CaseHallInner() {
  const RECOMMEND_PREF_KEY = "law119:casehall:recommended-filter-presets:v2";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [items, setItems] = useState<HallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(() => ({
    category: searchParams.get("category") ?? "",
    stateCode: searchParams.get("stateCode") ?? "",
    feeMode: searchParams.get("feeMode") ?? "",
    budgetMin: searchParams.get("budgetMin") ?? "",
    budgetMax: searchParams.get("budgetMax") ?? "",
    deadlineWindow: searchParams.get("deadlineWindow") ?? "",
    mineBidOnly: searchParams.get("mineBidOnly") === "1",
    urgency:
      searchParams.get("urgency") === "LOW" ||
      searchParams.get("urgency") === "MEDIUM" ||
      searchParams.get("urgency") === "HIGH" ||
      searchParams.get("urgency") === "URGENT"
        ? (searchParams.get("urgency") as "LOW" | "MEDIUM" | "HIGH" | "URGENT")
        : "",
    sort:
      searchParams.get("sort") === "quotes_desc" ||
      searchParams.get("sort") === "deadline_asc" ||
      searchParams.get("sort") === "recommended" ||
      searchParams.get("sort") === "budget_desc" ||
      searchParams.get("sort") === "low_competition"
        ? (searchParams.get("sort") as "quotes_desc" | "deadline_asc" | "recommended" | "budget_desc" | "low_competition")
        : "latest",
    recommendationReasons: (searchParams.get("recommendationReasons") ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
    page: Math.max(Number(searchParams.get("page") ?? "1") || 1, 1),
    quoteableOnly: searchParams.get("quoteableOnly") === "1",
  }));
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [prefMsg, setPrefMsg] = useState<string | null>(null);
  const [savedPresets, setSavedPresets] = useState<Array<{ id: string; name: string; recommendationReasons: string[]; quoteableOnly: boolean }>>([]);
  const importPresetInputRef = useRef<HTMLInputElement | null>(null);
  const [importPreview, setImportPreview] = useState<null | {
    fileName: string;
    presets: Array<{ id: string; name: string; recommendationReasons: string[]; quoteableOnly: boolean }>;
  }>(null);

  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.category) next.set("category", filters.category);
    if (filters.stateCode) next.set("stateCode", filters.stateCode.toUpperCase());
    if (filters.urgency) next.set("urgency", filters.urgency);
    if (filters.feeMode) next.set("feeMode", filters.feeMode);
    if (filters.budgetMin) next.set("budgetMin", filters.budgetMin);
    if (filters.budgetMax) next.set("budgetMax", filters.budgetMax);
    if (filters.deadlineWindow) next.set("deadlineWindow", filters.deadlineWindow);
    if (filters.sort !== "latest") next.set("sort", filters.sort);
    if (filters.sort === "recommended" && filters.recommendationReasons.length > 0) {
      next.set("recommendationReasons", filters.recommendationReasons.join(","));
    }
    if (filters.page > 1) next.set("page", String(filters.page));
    if (filters.quoteableOnly) next.set("quoteableOnly", "1");
    if (filters.mineBidOnly) next.set("mineBidOnly", "1");
    const nextQs = next.toString();
    const currentQs = searchParams.toString();
    if (nextQs !== currentQs) {
      router.replace(nextQs ? `${pathname}?${nextQs}` : pathname, { scroll: false });
    }
  }, [filters, pathname, router, searchParams]);

  useEffect(() => {
    setFilters((v) => ({ ...v, page: 1 }));
  }, [filters.category, filters.stateCode, filters.urgency, filters.feeMode, filters.budgetMin, filters.budgetMax, filters.deadlineWindow, filters.sort, filters.quoteableOnly, filters.mineBidOnly, filters.recommendationReasons]);

  useEffect(() => {
    if (filters.sort !== "recommended" && filters.recommendationReasons.length > 0) {
      setFilters((v) => ({ ...v, recommendationReasons: [] }));
    }
  }, [filters.sort, filters.recommendationReasons]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.stateCode) params.set("stateCode", filters.stateCode.toUpperCase());
    if (filters.urgency) params.set("urgency", filters.urgency);
    if (filters.feeMode) params.set("feeMode", filters.feeMode);
    if (filters.budgetMin) params.set("budgetMin", filters.budgetMin);
    if (filters.budgetMax) params.set("budgetMax", filters.budgetMax);
    if (filters.deadlineWindow) params.set("deadlineWindow", filters.deadlineWindow);
    params.set("sort", filters.sort);
    if (filters.sort === "recommended" && filters.recommendationReasons.length > 0) {
      params.set("recommendationReasons", filters.recommendationReasons.join(","));
    }
    params.set("page", String(filters.page));
    params.set("pageSize", "12");
    if (filters.quoteableOnly && viewer.user?.role === "ATTORNEY") {
      params.set("quoteableOnly", "1");
    }
    if (filters.mineBidOnly && viewer.user?.role === "ATTORNEY") {
      params.set("mineBidOnly", "1");
    }

    setLoading(true);
    setError(null);

    fetch(`/api/marketplace/cases/hall?${params.toString()}`, { signal: controller.signal })
      .then(async (r) => {
        const data = (await r.json()) as HallResponse;
        if (!r.ok) throw new Error(data.error || "Failed to load");
        return data;
      })
      .then((data) => {
        setItems(data.items ?? []);
        setMeta({
          page: data.filters?.page ?? 1,
          totalPages: data.filters?.totalPages ?? 1,
          total: data.filters?.total ?? 0,
        });
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [filters.category, filters.stateCode, filters.urgency, filters.feeMode, filters.budgetMin, filters.budgetMax, filters.deadlineWindow, filters.sort, filters.recommendationReasons, filters.page, filters.quoteableOnly, filters.mineBidOnly, viewer.user?.role]);

  const recommendationReasonOptions = [
    "未报价",
    "可报价",
    "24h内截止",
    "类目匹配",
    "服务州匹配",
    "紧急度HIGH",
    "紧急度URGENT",
  ] as const;

  useEffect(() => {
    if (viewer.user?.role !== "ATTORNEY") return;
    try {
      const raw = localStorage.getItem(RECOMMEND_PREF_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{ id: string; name: string; recommendationReasons: string[]; quoteableOnly: boolean }>;
      if (Array.isArray(parsed)) setSavedPresets(parsed);
    } catch {
      // ignore broken local presets
    }
  }, [viewer.user?.role]);

  function toggleRecommendationReason(reason: (typeof recommendationReasonOptions)[number]) {
    setFilters((v) => ({
      ...v,
      recommendationReasons: v.recommendationReasons.includes(reason)
        ? v.recommendationReasons.filter((r) => r !== reason)
        : [...v.recommendationReasons, reason],
    }));
  }

  function flashPrefMsg(msg: string) {
    setPrefMsg(msg);
    window.setTimeout(() => setPrefMsg(null), 1500);
  }

  function persistPresets(next: Array<{ id: string; name: string; recommendationReasons: string[]; quoteableOnly: boolean }>) {
    setSavedPresets(next);
    localStorage.setItem(RECOMMEND_PREF_KEY, JSON.stringify(next));
  }

  function saveRecommendedPrefs() {
    if (viewer.user?.role !== "ATTORNEY") return;
    try {
      const name = window.prompt("给这套常用筛选起个名字（例如：移民急单 / 加州匹配）", "");
      if (!name || !name.trim()) return;
      const trimmedName = name.trim().slice(0, 20);
      const next = [
        {
          id: `${Date.now()}`,
          name: trimmedName,
          recommendationReasons: [...filters.recommendationReasons],
          quoteableOnly: filters.quoteableOnly,
        },
        ...savedPresets.filter((p) => p.name !== trimmedName),
      ].slice(0, 8);
      persistPresets(next);
      flashPrefMsg(`已保存方案：${trimmedName}`);
    } catch {
      flashPrefMsg("保存失败");
    }
  }

  function applyRecommendedPrefs(preset?: { recommendationReasons: string[]; quoteableOnly: boolean }) {
    if (viewer.user?.role !== "ATTORNEY") return;
    try {
      let target = preset;
      if (!target) {
        const raw = localStorage.getItem(RECOMMEND_PREF_KEY);
        if (!raw) {
          flashPrefMsg("暂无已保存筛选");
          return;
        }
        const parsed = JSON.parse(raw) as Array<{ recommendationReasons: string[]; quoteableOnly: boolean }>;
        if (!Array.isArray(parsed) || !parsed[0]) {
          flashPrefMsg("暂无已保存筛选");
          return;
        }
        target = parsed[0];
      }
      setFilters((v) => ({
        ...v,
        sort: "recommended",
        recommendationReasons: Array.isArray(target.recommendationReasons) ? target.recommendationReasons : [],
        quoteableOnly: Boolean(target.quoteableOnly),
        page: 1,
      }));
      flashPrefMsg("已应用常用推荐筛选");
    } catch {
      flashPrefMsg("读取失败");
    }
  }

  function clearRecommendedPrefs() {
    localStorage.removeItem(RECOMMEND_PREF_KEY);
    setSavedPresets([]);
    flashPrefMsg("已清除全部命名方案");
  }

  function exportRecommendedPresetsJson() {
    try {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        presets: savedPresets,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `law119-casehall-presets-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flashPrefMsg("已导出命名方案 JSON");
    } catch {
      flashPrefMsg("导出失败");
    }
  }

  async function onImportRecommendedPresetsFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        presets?: Array<{ id?: string; name?: string; recommendationReasons?: string[]; quoteableOnly?: boolean }>;
      };
      if (!Array.isArray(parsed.presets)) throw new Error("格式不正确");
      const normalized = parsed.presets
        .map((p, idx) => ({
          id: String(p.id ?? `${Date.now()}-${idx}`),
          name: String(p.name ?? `方案${idx + 1}`).trim().slice(0, 20),
          recommendationReasons: Array.isArray(p.recommendationReasons)
            ? p.recommendationReasons.filter((v): v is string => typeof v === "string").slice(0, 10)
            : [],
          quoteableOnly: Boolean(p.quoteableOnly),
        }))
        .filter((p) => p.name);
      if (normalized.length === 0) throw new Error("未找到可导入方案");
      setImportPreview({
        fileName: file.name,
        presets: normalized,
      });
    } catch (err) {
      flashPrefMsg(err instanceof Error ? `导入失败：${err.message}` : "导入失败");
    } finally {
      e.target.value = "";
    }
  }

  function applyImportedPresets(mode: "merge" | "overwrite") {
    if (!importPreview) return;
    try {
      const next =
        mode === "overwrite"
          ? importPreview.presets.slice(0, 8)
          : [...importPreview.presets, ...savedPresets]
              .filter((p, idx, arr) => arr.findIndex((x) => x.name === p.name) === idx)
              .slice(0, 8);
      persistPresets(next);
      flashPrefMsg(mode === "overwrite" ? `已覆盖导入 ${importPreview.presets.length} 个方案` : `已合并导入 ${importPreview.presets.length} 个方案`);
      setImportPreview(null);
    } catch {
      flashPrefMsg("导入应用失败");
    }
  }

  function deletePreset(id: string) {
    try {
      const next = savedPresets.filter((p) => p.id !== id);
      persistPresets(next);
      flashPrefMsg("已删除方案");
    } catch {
      flashPrefMsg("删除失败");
    }
  }

  function renamePreset(id: string) {
    const current = savedPresets.find((p) => p.id === id);
    if (!current) return;
    const nextName = window.prompt("重命名方案", current.name);
    if (!nextName || !nextName.trim()) return;
    const trimmed = nextName.trim().slice(0, 20);
    const next = savedPresets.map((p) => (p.id === id ? { ...p, name: trimmed } : p));
    persistPresets(next);
    flashPrefMsg(`已重命名为：${trimmed}`);
  }

  function movePreset(id: string, direction: "up" | "down") {
    const idx = savedPresets.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= savedPresets.length) return;
    const next = [...savedPresets];
    const [item] = next.splice(idx, 1);
    next.splice(targetIdx, 0, item);
    persistPresets(next);
    flashPrefMsg(direction === "up" ? "方案已上移" : "方案已下移");
  }

  function pinPreset(id: string) {
    const idx = savedPresets.findIndex((p) => p.id === id);
    if (idx <= 0) return;
    const next = [...savedPresets];
    const [item] = next.splice(idx, 1);
    next.unshift(item);
    persistPresets(next);
    flashPrefMsg("方案已置顶");
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">案件大厅 / Case Hall</h1>
                <p className="text-sm text-slate-500 mt-2">浏览开放案件，选择您擅长的案件提交报价。</p>
                {!authLoading && viewer.user?.role === "ATTORNEY" && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Link href="/marketplace/my-cases" className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200">
                      我的案件
                    </Link>
                    <Link href="/marketplace/my-bids" className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200">
                      我的报价
                    </Link>
                  </div>
                )}
              </div>
              <Link
                href="/marketplace/post-case"
                className="rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-700"
              >
                发布新案件
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-10">
              <input
                placeholder="类别（如 CIVIL）"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.category}
                onChange={(e) => setFilters((v) => ({ ...v, category: e.target.value }))}
              />
              <input
                placeholder="州（如 CA）"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
                value={filters.stateCode}
                onChange={(e) => setFilters((v) => ({ ...v, stateCode: e.target.value.toUpperCase() }))}
                maxLength={2}
              />
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.urgency}
                onChange={(e) => setFilters((v) => ({ ...v, urgency: e.target.value }))}
              >
                <option value="">全部紧急度</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.feeMode}
                onChange={(e) => setFilters((v) => ({ ...v, feeMode: e.target.value }))}
              >
                <option value="">全部收费模式</option>
                <option value="CONSULTATION">CONSULTATION</option>
                <option value="AGENCY">AGENCY</option>
                <option value="STAGED">STAGED</option>
                <option value="HOURLY">HOURLY</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
              <input
                placeholder="预算最低"
                type="number"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.budgetMin}
                onChange={(e) => setFilters((v) => ({ ...v, budgetMin: e.target.value }))}
              />
              <input
                placeholder="预算最高"
                type="number"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.budgetMax}
                onChange={(e) => setFilters((v) => ({ ...v, budgetMax: e.target.value }))}
              />
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.deadlineWindow}
                onChange={(e) => setFilters((v) => ({ ...v, deadlineWindow: e.target.value }))}
              >
                <option value="">全部截止时间</option>
                <option value="24h">24h内截止</option>
                <option value="7d">7天内截止</option>
                <option value="overdue">已过截止</option>
              </select>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.sort}
                onChange={(e) => setFilters((v) => ({ ...v, sort: e.target.value as typeof v.sort }))}
              >
                <option value="latest">最新发布</option>
                <option value="recommended">推荐排序（律师）</option>
                <option value="quotes_desc">报价数最多</option>
                <option value="deadline_asc">即将截止优先</option>
                <option value="budget_desc">高预算优先</option>
                <option value="low_competition">低竞争（报价少）</option>
              </select>
              <div className={`rounded-lg border px-2 py-2 ${filters.sort === "recommended" ? "border-slate-300" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex flex-wrap gap-1">
                  {recommendationReasonOptions.map((reason) => {
                    const active = filters.recommendationReasons.includes(reason);
                    return (
                      <button
                        key={reason}
                        type="button"
                        disabled={filters.sort !== "recommended"}
                        onClick={() => toggleRecommendationReason(reason)}
                        className={`rounded-full px-2 py-1 text-xs border ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 bg-white text-slate-700"
                        } disabled:opacity-50`}
                      >
                        {reason}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
                onClick={() => setFilters({ category: "", stateCode: "", feeMode: "", budgetMin: "", budgetMax: "", deadlineWindow: "", urgency: "", sort: "latest", recommendationReasons: [], page: 1, quoteableOnly: false, mineBidOnly: false })}
              >
                清空筛选
              </button>
              <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${viewer.user?.role === "ATTORNEY" ? "border-slate-300" : "border-slate-200 text-slate-400 bg-slate-50"}`}>
                <input
                  type="checkbox"
                  checked={filters.quoteableOnly}
                  disabled={viewer.user?.role !== "ATTORNEY"}
                  onChange={(e) => setFilters((v) => ({ ...v, quoteableOnly: e.target.checked, page: 1 }))}
                />
                只看我能报价
              </label>
              <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${viewer.user?.role === "ATTORNEY" ? "border-slate-300" : "border-slate-200 text-slate-400 bg-slate-50"}`}>
                <input
                  type="checkbox"
                  checked={filters.mineBidOnly}
                  disabled={viewer.user?.role !== "ATTORNEY"}
                  onChange={(e) => setFilters((v) => ({ ...v, mineBidOnly: e.target.checked, page: 1 }))}
                />
                仅看我已报价
              </label>
            </div>
            <p className="mt-3 text-sm text-slate-500">共 {meta.total} 条开放案件</p>
            {viewer.user?.role === "ATTORNEY" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={saveRecommendedPrefs}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  保存常用推荐筛选
                </button>
                <button
                  type="button"
                  onClick={() => applyRecommendedPrefs()}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  应用常用筛选
                </button>
                <button
                  type="button"
                  onClick={clearRecommendedPrefs}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  清除常用筛选
                </button>
                {prefMsg && <span className="text-xs text-emerald-700">{prefMsg}</span>}
              </div>
            )}
            {viewer.user?.role === "ATTORNEY" && savedPresets.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {savedPresets.map((preset) => (
                  <div key={preset.id} className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white pl-3 pr-1 py-1">
                    <button
                      type="button"
                      onClick={() => applyRecommendedPrefs(preset)}
                      className="text-xs text-slate-700 hover:underline"
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => renamePreset(preset.id)}
                      className="rounded-full px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                      aria-label={`重命名方案 ${preset.name}`}
                    >
                      改名
                    </button>
                    <button
                      type="button"
                      onClick={() => pinPreset(preset.id)}
                      className="rounded-full px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                      aria-label={`置顶方案 ${preset.name}`}
                      disabled={savedPresets[0]?.id === preset.id}
                    >
                      置顶
                    </button>
                    <button
                      type="button"
                      onClick={() => movePreset(preset.id, "up")}
                      className="rounded-full px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                      aria-label={`上移方案 ${preset.name}`}
                      disabled={savedPresets[0]?.id === preset.id}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => movePreset(preset.id, "down")}
                      className="rounded-full px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                      aria-label={`下移方案 ${preset.name}`}
                      disabled={savedPresets[savedPresets.length - 1]?.id === preset.id}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePreset(preset.id)}
                      className="rounded-full px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                      aria-label={`删除方案 ${preset.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {loading && <div className="text-sm text-slate-500">加载案件大厅中...</div>}
          {error && <div className="text-sm text-rose-700">加载失败：{error}</div>}

          {!loading && !error && items.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-base font-semibold text-slate-800">当前暂无开放案件</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                目前没有符合筛选条件的新案件。新案件发布后会第一时间出现在此处。
              </p>
              <p className="text-xs text-slate-400 mt-1">
                No open cases match your current filters. New cases will appear here when posted.
              </p>
              <div className="mt-5 flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setFilters({ category: "", stateCode: "", feeMode: "", budgetMin: "", budgetMax: "", deadlineWindow: "", urgency: "", sort: "latest", recommendationReasons: [], page: 1, quoteableOnly: false, mineBidOnly: false })}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  清空筛选 / Clear Filters
                </button>
                <button
                  type="button"
                  onClick={() => void (async () => { setLoading(true); setError(null); })()}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
                >
                  刷新 / Refresh
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {items.map((item) => (
              <article
                key={item.id}
                className={`bg-white border rounded-2xl p-5 shadow-sm ${
                  isDeadlinePassed(item.quoteDeadline) ? "border-rose-200 bg-rose-50/30" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">{item.category}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">{item.urgency}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{item.status}</span>
                      {isDeadlinePassed(item.quoteDeadline) && (
                        <span className="text-xs px-2 py-1 rounded-full bg-rose-100 text-rose-700">已过截止</span>
                      )}
                      {!isDeadlinePassed(item.quoteDeadline) && isDeadlineSoon(item.quoteDeadline) && (
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">24h内截止</span>
                      )}
                      {viewer.user?.role === "ATTORNEY" && item.hasMyBid && (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">我已报过价</span>
                      )}
                      {viewer.user?.role === "ATTORNEY" &&
                        filters.sort === "recommended" &&
                        (item.recommendationReasons ?? []).map((reason) => (
                          <span key={`${item.id}-${reason}`} className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                            推荐：{reason}
                          </span>
                        ))}
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {item.stateCode} {item.city ?? ""} · ZIP {item.zipCodeMasked} · {item.quoteCount} 位律师已报价
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      收费模式 {item.feeMode ?? "CUSTOM"} · 预算 {moneyRange(item.budgetMin, item.budgetMax)} · 截止 {fmtDeadline(item.quoteDeadline)}
                    </p>
                    {(item.riskHints ?? []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(item.riskHints ?? []).map((hint) => (
                          <span key={`${item.id}-${hint}`} className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                            风险：{hint}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-slate-700 mt-3 leading-6">{item.descriptionMasked}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {viewer.user?.role === "ATTORNEY" && isDeadlinePassed(item.quoteDeadline) ? (
                      <div className="rounded-lg bg-slate-300 text-white px-4 py-2 text-sm font-semibold text-center cursor-not-allowed">
                        已过截止（不可报价）
                      </div>
                    ) : (
                      <Link
                        href={`/marketplace/cases/${item.id}`}
                        className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-700 text-center"
                      >
                        {viewer.user?.role === "ATTORNEY"
                          ? item.hasMyBid
                            ? "查看详情 / 修改报价"
                            : "查看详情 / 报价"
                          : "查看详情"}
                      </Link>
                    )}
                    {(viewer.user?.role === "CLIENT" || viewer.user?.role === "ADMIN") && (
                      <Link
                        href={`/marketplace/cases/${item.id}/select`}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 text-center"
                      >
                        发布方选择页
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => setFilters((v) => ({ ...v, page: Math.max(1, v.page - 1) }))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              上一页
            </button>
            <p className="text-sm text-slate-500">第 {meta.page} / {meta.totalPages} 页</p>
            <button
              type="button"
              disabled={filters.page >= meta.totalPages}
              onClick={() => setFilters((v) => ({ ...v, page: Math.min(meta.totalPages, v.page + 1) }))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>

        {importPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">导入方案预览</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    文件：{importPreview.fileName} · 共 {importPreview.presets.length} 个方案
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setImportPreview(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  关闭
                </button>
              </div>
              <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-slate-200 p-3 space-y-2">
                {importPreview.presets.map((p) => (
                  <div key={p.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                      <span className="text-xs text-slate-500">{p.quoteableOnly ? "仅可报价" : "全部案件"}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.recommendationReasons.length > 0 ? p.recommendationReasons.map((r) => (
                        <span key={`${p.id}-${r}`} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                          {r}
                        </span>
                      )) : (
                        <span className="text-xs text-slate-400">无推荐原因筛选</span>
                      )}
                    </div>
                    {savedPresets.some((s) => s.name === p.name) && (
                      <p className="mt-2 text-xs text-amber-700">提示：当前已有同名方案，合并模式下会按名称去重保留导入项。</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportPreview(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => applyImportedPresets("merge")}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  合并导入
                </button>
                <button
                  type="button"
                  onClick={() => applyImportedPresets("overwrite")}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  覆盖导入
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
