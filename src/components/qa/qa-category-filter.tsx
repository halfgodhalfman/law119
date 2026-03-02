"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LEGAL_CATEGORIES } from "@/lib/legal-categories";

const SORTS = [
  { value: "hot", label: "最热" },
  { value: "new", label: "最新" },
  { value: "unanswered", label: "待解答" },
];

export function QaCategoryFilter() {
  const router = useRouter();
  const sp = useSearchParams();
  const activeCategory = sp.get("category") ?? "";
  const activeSort = sp.get("sort") ?? "hot";
  const activeState = sp.get("state") ?? "";

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/qa?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      {/* 排序 */}
      <div className="flex gap-2">
        {SORTS.map((s) => (
          <button
            key={s.value}
            onClick={() => updateParam("sort", s.value === "hot" ? "" : s.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              activeSort === s.value || (s.value === "hot" && !activeSort)
                ? "bg-amber-600 text-white"
                : "bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 分类 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => updateParam("category", "")}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !activeCategory
              ? "bg-slate-600 text-white"
              : "bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700"
          }`}
        >
          全部类别
        </button>
        {LEGAL_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() =>
              updateParam("category", activeCategory === cat.key ? "" : cat.key)
            }
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
              activeCategory === cat.key
                ? "bg-slate-600 text-white"
                : "bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.nameZh}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
