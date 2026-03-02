"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";

// ─── Types ───────────────────────────────────────────────────────────────────

type PackageType = "PRO_BONO" | "SLIDING_SCALE" | "FIXED_PRICE" | "FREE_CONSULT";
type LegalCategory =
  | "IMMIGRATION" | "CRIMINAL" | "CIVIL" | "REAL_ESTATE"
  | "FAMILY" | "BUSINESS" | "ESTATE_PLAN" | "LABOR" | "TAX" | "OTHER";

interface ServicePackage {
  id: string;
  title: string;
  titleEn?: string | null;
  category: LegalCategory;
  stateCode?: string | null;
  description: string;
  deliverables: string;
  packageType: PackageType;
  price?: number | null;
  priceLabel?: string | null;
  incomeCapAnnual?: number | null;
  eligibilityCriteria?: string | null;
  estimatedDays?: number | null;
  maxCasesPerMonth?: number | null;
  sessionCount?: number | null;
  sessionMinutes?: number | null;
  isActive: boolean;
  sortOrder: number;
  totalBooked: number;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

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

const TYPE_OPTIONS: { value: PackageType; label: string; icon: string; desc: string; color: string }[] = [
  { value: "PRO_BONO",     label: "完全免费",  icon: "🤝", desc: "公益服务，不收取任何费用",         color: "text-emerald-300" },
  { value: "FREE_CONSULT", label: "免费初次咨询", icon: "💬", desc: "初次咨询免费，后续按需收费",      color: "text-sky-300" },
  { value: "SLIDING_SCALE",label: "滑动收费",  icon: "📊", desc: "按客户收入比例协商费用",          color: "text-amber-300" },
  { value: "FIXED_PRICE",  label: "固定低价",  icon: "🏷️", desc: "固定透明价格，适合预算有限用户",   color: "text-violet-300" },
];

const US_STATES = [
  "CA","NY","TX","WA","IL","MA","NJ","GA","FL","VA",
  "MD","PA","AZ","NC","MI","OH","CO","MN","OR","CT",
];

// ─── Form Component ──────────────────────────────────────────────────────────

interface FormData {
  title: string;
  titleEn: string;
  category: LegalCategory;
  stateCode: string;
  description: string;
  deliverables: string;
  packageType: PackageType;
  price: string;
  priceLabel: string;
  incomeCapAnnual: string;
  eligibilityCriteria: string;
  estimatedDays: string;
  maxCasesPerMonth: string;
  sessionCount: string;
  sessionMinutes: string;
  sortOrder: string;
}

const DEFAULT_FORM: FormData = {
  title: "", titleEn: "", category: "IMMIGRATION", stateCode: "",
  description: "", deliverables: "", packageType: "FREE_CONSULT",
  price: "", priceLabel: "", incomeCapAnnual: "", eligibilityCriteria: "",
  estimatedDays: "", maxCasesPerMonth: "", sessionCount: "", sessionMinutes: "30",
  sortOrder: "0",
};

function PackageForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormData>({ ...DEFAULT_FORM, ...initial });

  const set = (key: keyof FormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const needsPrice = form.packageType === "FIXED_PRICE" || form.packageType === "SLIDING_SCALE";
  const isFree = form.packageType === "PRO_BONO" || form.packageType === "FREE_CONSULT";

  return (
    <div className="space-y-5">
      {/* 服务类型 */}
      <div>
        <label className="block text-slate-300 text-sm font-semibold mb-3">服务类型 *</label>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("packageType", t.value)}
              className={`p-3 rounded-xl border text-left transition-colors ${
                form.packageType === t.value
                  ? "border-emerald-500 bg-emerald-900/30"
                  : "border-slate-600 bg-slate-800/50 hover:border-slate-400"
              }`}
            >
              <div className={`text-sm font-bold mb-0.5 ${t.color}`}>{t.icon} {t.label}</div>
              <div className="text-slate-400 text-xs">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 基本信息 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-slate-300 text-sm font-semibold mb-1.5">服务包名称（中文）*</label>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="例：移民咨询免费初次咨询"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-slate-400 text-xs mb-1">英文名称（可选）</label>
          <input
            value={form.titleEn}
            onChange={(e) => set("titleEn", e.target.value)}
            placeholder="Free Initial Immigration Consultation"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-slate-400"
          />
        </div>
        <div>
          <label className="block text-slate-300 text-sm font-semibold mb-1.5">法律领域 *</label>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value as LegalCategory)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-300 text-sm font-semibold mb-1.5">服务州</label>
          <select
            value={form.stateCode}
            onChange={(e) => set("stateCode", e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全国（不限州）</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* 定价 */}
      {!isFree && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-1.5">
              {form.packageType === "SLIDING_SCALE" ? "最低收费（$）" : "固定价格（$）"} *
            </label>
            <input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="例：99"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-1.5">价格展示文字</label>
            <input
              value={form.priceLabel}
              onChange={(e) => set("priceLabel", e.target.value)}
              placeholder="如：$99 起 / 按收入定价"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      {/* 滑动收费：年收入上限 */}
      {form.packageType === "SLIDING_SCALE" && (
        <div>
          <label className="block text-slate-300 text-sm font-semibold mb-1.5">申请者年收入上限（$）</label>
          <input
            type="number"
            min={0}
            value={form.incomeCapAnnual}
            onChange={(e) => set("incomeCapAnnual", e.target.value)}
            placeholder="例：50000（年收入低于此数才可申请）"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      )}

      {/* 服务描述 */}
      <div>
        <label className="block text-slate-300 text-sm font-semibold mb-1.5">服务描述 *</label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          placeholder="简述这个服务包的内容、适合什么情况的客户使用..."
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
        />
      </div>

      {/* 包含内容 */}
      <div>
        <label className="block text-slate-300 text-sm font-semibold mb-1.5">包含内容（明细）*</label>
        <textarea
          value={form.deliverables}
          onChange={(e) => set("deliverables", e.target.value)}
          rows={4}
          placeholder={"- 30分钟视频/电话咨询\n- 案情分析和初步法律意见\n- 书面回复（发送至您的邮箱）\n- 后续1次免费追问"}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none font-mono"
        />
        <p className="text-slate-500 text-xs mt-1">每行一条，用「-」开头</p>
      </div>

      {/* 申请资格 */}
      <div>
        <label className="block text-slate-300 text-sm font-semibold mb-1.5">申请资格说明（可选）</label>
        <textarea
          value={form.eligibilityCriteria}
          onChange={(e) => set("eligibilityCriteria", e.target.value)}
          rows={2}
          placeholder="如：仅限低收入华人家庭，年收入低于联邦贫困线200%..."
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
        />
      </div>

      {/* 服务细节 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-slate-400 text-xs mb-1">咨询次数</label>
          <input
            type="number" min={1} max={20}
            value={form.sessionCount}
            onChange={(e) => set("sessionCount", e.target.value)}
            placeholder="次"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-400"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1">每次时长(分钟)</label>
          <input
            type="number" min={15} max={240}
            value={form.sessionMinutes}
            onChange={(e) => set("sessionMinutes", e.target.value)}
            placeholder="分钟"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-400"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1">预计天数</label>
          <input
            type="number" min={1} max={365}
            value={form.estimatedDays}
            onChange={(e) => set("estimatedDays", e.target.value)}
            placeholder="天"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-400"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1">每月接收上限</label>
          <input
            type="number" min={1} max={100}
            value={form.maxCasesPerMonth}
            onChange={(e) => set("maxCasesPerMonth", e.target.value)}
            placeholder="个"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors"
        >
          取消
        </button>
        <button
          type="button"
          disabled={submitting || !form.title || !form.description || !form.deliverables}
          onClick={() => onSubmit(form)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold transition-colors"
        >
          {submitting ? "保存中…" : "保存服务包"}
        </button>
      </div>
    </div>
  );
}

// ─── Package Row ─────────────────────────────────────────────────────────────

const TYPE_ICON: Record<PackageType, string> = {
  PRO_BONO: "🤝", FREE_CONSULT: "💬", SLIDING_SCALE: "📊", FIXED_PRICE: "🏷️",
};
const TYPE_LABEL: Record<PackageType, string> = {
  PRO_BONO: "完全免费", FREE_CONSULT: "免费咨询", SLIDING_SCALE: "滑动收费", FIXED_PRICE: "固定低价",
};

function PackageRow({
  pkg,
  onEdit,
  onToggle,
  onDelete,
}: {
  pkg: ServicePackage;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className={`rounded-xl border p-4 transition-colors ${pkg.isActive ? "border-slate-600/60 bg-slate-800/50" : "border-slate-700/40 bg-slate-800/20 opacity-60"}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{TYPE_ICON[pkg.packageType]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-white font-bold text-sm">{pkg.title}</span>
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{TYPE_LABEL[pkg.packageType]}</span>
            {!pkg.isActive && <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">已下架</span>}
          </div>
          <p className="text-slate-400 text-xs line-clamp-1 mb-2">{pkg.description}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-emerald-400 text-xs font-semibold">
              {pkg.priceLabel ?? (pkg.price != null ? `$${pkg.price}` : "免费")}
            </span>
            {pkg.stateCode && <span className="text-slate-500 text-xs">📍 {pkg.stateCode}</span>}
            {pkg.sessionCount && <span className="text-slate-500 text-xs">🗓️ {pkg.sessionCount}次</span>}
            <span className="text-slate-500 text-xs">📦 {pkg.totalBooked}次预约</span>
            <span className="text-slate-600 text-xs">{new Date(pkg.createdAt).toLocaleDateString("zh-CN")}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors"
          >
            编辑
          </button>
          <button
            type="button"
            onClick={onToggle}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pkg.isActive
                ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                : "bg-emerald-900/50 hover:bg-emerald-800/50 text-emerald-300"
            }`}
          >
            {pkg.isActive ? "下架" : "上架"}
          </button>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-red-900/50 text-slate-400 hover:text-red-300 text-xs font-medium transition-colors"
            >
              删除
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setConfirmDelete(false); onDelete(); }}
              className="px-3 py-1.5 rounded-lg bg-red-900/50 text-red-300 text-xs font-bold animate-pulse"
            >
              确认删除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AttorneyServicePackagesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load MY packages (as the authenticated attorney)
      const res = await fetch("/api/marketplace/service-packages?pageSize=40&myOwn=1");
      const json = await res.json();
      // Server returns all packages - filter would need attorney context
      // For now show all returned
      if (json.ok) setPackages(json.packages ?? []);
      else setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async (form: FormData) => {
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        title: form.title.trim(),
        titleEn: form.titleEn.trim() || null,
        category: form.category,
        stateCode: form.stateCode || null,
        description: form.description.trim(),
        deliverables: form.deliverables.trim(),
        packageType: form.packageType,
        price: form.price ? Number(form.price) : null,
        priceLabel: form.priceLabel.trim() || null,
        incomeCapAnnual: form.incomeCapAnnual ? Number(form.incomeCapAnnual) : null,
        eligibilityCriteria: form.eligibilityCriteria.trim() || null,
        estimatedDays: form.estimatedDays ? Number(form.estimatedDays) : null,
        maxCasesPerMonth: form.maxCasesPerMonth ? Number(form.maxCasesPerMonth) : null,
        sessionCount: form.sessionCount ? Number(form.sessionCount) : null,
        sessionMinutes: form.sessionMinutes ? Number(form.sessionMinutes) : null,
        sortOrder: Number(form.sortOrder) || 0,
      };
      const res = await fetch("/api/marketplace/service-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "创建失败");
      setSuccess("服务包已创建！");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, form: FormData) => {
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        title: form.title.trim(),
        titleEn: form.titleEn.trim() || null,
        category: form.category,
        stateCode: form.stateCode || null,
        description: form.description.trim(),
        deliverables: form.deliverables.trim(),
        packageType: form.packageType,
        price: form.price ? Number(form.price) : null,
        priceLabel: form.priceLabel.trim() || null,
        incomeCapAnnual: form.incomeCapAnnual ? Number(form.incomeCapAnnual) : null,
        eligibilityCriteria: form.eligibilityCriteria.trim() || null,
        estimatedDays: form.estimatedDays ? Number(form.estimatedDays) : null,
        maxCasesPerMonth: form.maxCasesPerMonth ? Number(form.maxCasesPerMonth) : null,
        sessionCount: form.sessionCount ? Number(form.sessionCount) : null,
        sessionMinutes: form.sessionMinutes ? Number(form.sessionMinutes) : null,
        sortOrder: Number(form.sortOrder) || 0,
      };
      const res = await fetch(`/api/marketplace/service-packages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "更新失败");
      setSuccess("服务包已更新！");
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (pkg: ServicePackage) => {
    try {
      await fetch(`/api/marketplace/service-packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      await load();
    } catch {
      setError("操作失败");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/marketplace/service-packages/${id}`, { method: "DELETE" });
      setSuccess("服务包已删除");
      await load();
    } catch {
      setError("删除失败");
    }
  };

  const editingPkg = packages.find((p) => p.id === editingId);

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
                <span>服务包管理</span>
              </div>
              <h1 className="text-xl font-black text-white">法律援助 &amp; 服务包管理</h1>
              <p className="text-slate-400 text-sm mt-1">
                发布免费、低价或滑动收费服务包，展示在
                <Link href="/legal-aid" className="text-emerald-400 hover:text-emerald-300 mx-1">法律援助专区</Link>
                吸引更多客户
              </p>
            </div>
            {!showForm && !editingId && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-colors flex items-center gap-2"
              >
                + 新增服务包
              </button>
            )}
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-900/20 border border-red-600/30 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
              <span className="text-red-400 text-sm">{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-slate-400 hover:text-white">×</button>
            </div>
          )}
          {success && (
            <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
              <span className="text-emerald-400 text-sm">✓ {success}</span>
              <button type="button" onClick={() => setSuccess(null)} className="text-slate-400 hover:text-white">×</button>
            </div>
          )}

          {/* Pro Bono badge promo */}
          <div className="bg-gradient-to-r from-emerald-950 to-slate-800/80 border border-emerald-600/20 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-2xl">🏅</span>
            <div>
              <p className="text-emerald-300 font-semibold text-sm">发布免费服务包，获得「Pro Bono 公益律师」徽章</p>
              <p className="text-slate-400 text-xs mt-0.5">平台将在您的律师主页显示专属徽章，提升信任度和曝光率。您的服务包将在法律援助专区优先展示。</p>
            </div>
          </div>

          {/* Create Form */}
          {showForm && (
            <div className="bg-slate-800/60 border border-slate-600/50 rounded-2xl p-6 mb-6">
              <h2 className="text-white font-bold text-base mb-5">✨ 创建新服务包</h2>
              <PackageForm
                onSubmit={handleCreate}
                onCancel={() => setShowForm(false)}
                submitting={submitting}
              />
            </div>
          )}

          {/* Edit Form */}
          {editingId && editingPkg && (
            <div className="bg-slate-800/60 border border-slate-600/50 rounded-2xl p-6 mb-6">
              <h2 className="text-white font-bold text-base mb-5">✏️ 编辑服务包</h2>
              <PackageForm
                initial={{
                  title: editingPkg.title,
                  titleEn: editingPkg.titleEn ?? "",
                  category: editingPkg.category,
                  stateCode: editingPkg.stateCode ?? "",
                  description: editingPkg.description,
                  deliverables: editingPkg.deliverables,
                  packageType: editingPkg.packageType,
                  price: editingPkg.price?.toString() ?? "",
                  priceLabel: editingPkg.priceLabel ?? "",
                  incomeCapAnnual: editingPkg.incomeCapAnnual?.toString() ?? "",
                  eligibilityCriteria: editingPkg.eligibilityCriteria ?? "",
                  estimatedDays: editingPkg.estimatedDays?.toString() ?? "",
                  maxCasesPerMonth: editingPkg.maxCasesPerMonth?.toString() ?? "",
                  sessionCount: editingPkg.sessionCount?.toString() ?? "",
                  sessionMinutes: editingPkg.sessionMinutes?.toString() ?? "30",
                  sortOrder: editingPkg.sortOrder?.toString() ?? "0",
                }}
                onSubmit={(form) => handleUpdate(editingId, form)}
                onCancel={() => setEditingId(null)}
                submitting={submitting}
              />
            </div>
          )}

          {/* Package List */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/40">
              <div className="text-4xl mb-4">📦</div>
              <p className="text-slate-300 font-semibold mb-2">还没有服务包</p>
              <p className="text-slate-500 text-sm mb-6">
                发布您的第一个免费或低价服务包，让更多华人找到您
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-colors"
              >
                + 创建服务包
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-white font-semibold text-sm">我的服务包 ({packages.length})</h2>
                <Link
                  href="/legal-aid"
                  target="_blank"
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  查看公开展示页 →
                </Link>
              </div>
              {packages.map((pkg) => (
                <PackageRow
                  key={pkg.id}
                  pkg={pkg}
                  onEdit={() => { setEditingId(pkg.id); setShowForm(false); }}
                  onToggle={() => handleToggle(pkg)}
                  onDelete={() => handleDelete(pkg.id)}
                />
              ))}
            </div>
          )}

          {/* Tips */}
          <div className="mt-10 bg-slate-800/30 border border-slate-700/30 rounded-xl p-5">
            <h3 className="text-slate-300 font-semibold text-sm mb-3">💡 发布建议</h3>
            <ul className="space-y-1.5">
              {[
                "免费服务包会在专区优先展示，有助于积累初始评价",
                "每月接收上限建议设置 3-5 个，避免承接过多而影响质量",
                "在「包含内容」中详细列明服务边界，避免客户期望过高",
                "滑动收费服务建议注明资格评估流程（如：发布案情 → 律师审核 → 确认费率）",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-400 text-xs">
                  <span className="text-emerald-500 flex-shrink-0">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </main>
    </>
  );
}
