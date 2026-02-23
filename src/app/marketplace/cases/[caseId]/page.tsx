"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/ui/nav-bar";
import { useMarketplaceAuth } from "@/lib/use-marketplace-auth";

type BidItem = {
  id: string;
  proposalText: string;
  priceMin: string | number | null;
  priceMax: string | number | null;
  feeMode?: string | null;
  serviceScope?: string | null;
  estimatedDays?: number | null;
  includesConsultation?: boolean;
  version?: number;
  versionHistory?: Array<{
    id: string;
    version: number;
    proposalText: string;
    priceMin: string | number | null;
    priceMax: string | number | null;
    feeMode: string;
    serviceScope: string | null;
    estimatedDays: number | null;
    includesConsultation: boolean;
    status: string;
    createdAt: string;
  }>;
  status: string;
  updatedAt: string;
  attorneyProfileId: string;
};

type CaseDetail = {
  id: string;
  title: string;
  category: string;
  stateCode: string;
  city: string | null;
  zipCodeMasked: string;
  urgency: string;
  status: string;
  preferredLanguage: string;
  descriptionMasked: string;
  description: string;
  feeMode?: string | null;
  budgetMin?: string | number | null;
  budgetMax?: string | number | null;
  quoteDeadline?: string | null;
  selectedBidId?: string | null;
  engagementSummary?: {
    id: string;
    status: string;
    bidId: string;
    conversationId: string | null;
    isMyEngagement: boolean;
    updatedAt: string;
  } | null;
  quoteCount: number;
  bids: BidItem[];
  viewer?: {
    authenticated: boolean;
    role: "ANONYMOUS" | "CLIENT" | "ATTORNEY" | "ADMIN";
    isOwnerClient: boolean;
    canBid: boolean;
    canSelectBid: boolean;
    canSeeFullDescription: boolean;
    canSeeAllBids: boolean;
  };
};

type ApiResult = { ok?: boolean; error?: string; case?: CaseDetail };
type TimelineEvent = {
  id: string;
  at: string;
  type: string;
  title: string;
  detail?: string;
  meta?: { conversationId?: string };
};

function moneyRange(min: string | number | null, max: string | number | null) {
  if (min == null && max == null) return "未填写";
  if (min != null && max != null && `${min}` === `${max}`) return `$${min}`;
  return `$${min ?? "?"} - $${max ?? "?"}`;
}

function formatDateTime(input?: string | null) {
  if (!input) return "未设置";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "无效日期";
  return d.toLocaleString();
}

function timelineStyle(type: string) {
  if (type === "status_changed" || type === "case_created") {
    return {
      dot: "bg-blue-500",
      pill: "bg-blue-100 text-blue-700",
      label: type === "case_created" ? "状态/创建" : "状态变更",
      icon: "S",
    };
  }
  if (type === "bid_version") {
    return {
      dot: "bg-amber-500",
      pill: "bg-amber-100 text-amber-700",
      label: "报价版本",
      icon: "B",
    };
  }
  return {
    dot: "bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-700",
    label: "沟通会话",
    icon: "C",
  };
}

function versionChangeSummary(
  current: {
    priceMin: string | number | null;
    priceMax: string | number | null;
    feeMode: string;
    estimatedDays: number | null;
  },
  previous?: {
    priceMin: string | number | null;
    priceMax: string | number | null;
    feeMode: string;
    estimatedDays: number | null;
  },
) {
  if (!previous) return [] as string[];
  const changes: string[] = [];
  const currentPrice = Number(current.priceMax ?? current.priceMin ?? NaN);
  const prevPrice = Number(previous.priceMax ?? previous.priceMin ?? NaN);
  if (`${current.priceMin ?? ""}` !== `${previous.priceMin ?? ""}` || `${current.priceMax ?? ""}` !== `${previous.priceMax ?? ""}`) {
    if (!Number.isNaN(currentPrice) && !Number.isNaN(prevPrice)) {
      changes.push(currentPrice > prevPrice ? "价格上调" : currentPrice < prevPrice ? "价格下调" : "价格结构调整");
    } else {
      changes.push("价格变更");
    }
  }
  if (current.feeMode !== previous.feeMode) changes.push("收费模式变更");
  if ((current.estimatedDays ?? null) !== (previous.estimatedDays ?? null)) {
    if (typeof current.estimatedDays === "number" && typeof previous.estimatedDays === "number") {
      changes.push(
        current.estimatedDays > previous.estimatedDays
          ? "周期延长"
          : current.estimatedDays < previous.estimatedDays
            ? "周期缩短"
            : "周期变更",
      );
    } else {
      changes.push("周期变更");
    }
  }
  return changes;
}

function versionChangeDetails(
  current: {
    priceMin: string | number | null;
    priceMax: string | number | null;
    feeMode: string;
    estimatedDays: number | null;
    proposalText?: string | null;
    serviceScope?: string | null;
  },
  previous?: {
    priceMin: string | number | null;
    priceMax: string | number | null;
    feeMode: string;
    estimatedDays: number | null;
    proposalText?: string | null;
    serviceScope?: string | null;
  },
  options?: { onlyChanged?: boolean },
) {
  if (!previous) return [] as Array<{ label: string; from: string; to: string }>;
  const onlyChanged = options?.onlyChanged ?? true;
  const rows: Array<{ label: string; from: string; to: string }> = [];
  const pushRow = (label: string, from: string, to: string) => {
    if (!onlyChanged || from !== to) rows.push({ label, from, to });
  };
  if (`${current.priceMin ?? ""}` !== `${previous.priceMin ?? ""}` || `${current.priceMax ?? ""}` !== `${previous.priceMax ?? ""}`) {
    pushRow("价格", moneyRange(previous.priceMin, previous.priceMax), moneyRange(current.priceMin, current.priceMax));
  } else if (!onlyChanged) {
    pushRow("价格", moneyRange(previous.priceMin, previous.priceMax), moneyRange(current.priceMin, current.priceMax));
  }
  if (current.feeMode !== previous.feeMode) {
    pushRow("收费模式", previous.feeMode, current.feeMode);
  } else if (!onlyChanged) {
    pushRow("收费模式", previous.feeMode, current.feeMode);
  }
  if ((current.estimatedDays ?? null) !== (previous.estimatedDays ?? null)) {
    pushRow(
      "预计周期",
      previous.estimatedDays != null ? `${previous.estimatedDays}天` : "未填写",
      current.estimatedDays != null ? `${current.estimatedDays}天` : "未填写",
    );
  } else if (!onlyChanged) {
    pushRow(
      "预计周期",
      previous.estimatedDays != null ? `${previous.estimatedDays}天` : "未填写",
      current.estimatedDays != null ? `${current.estimatedDays}天` : "未填写",
    );
  }
  const curProposal = (current.proposalText ?? "").trim();
  const prevProposal = (previous.proposalText ?? "").trim();
  if (curProposal !== prevProposal) {
    pushRow(
      "方案文本",
      prevProposal ? `${prevProposal.slice(0, 40)}${prevProposal.length > 40 ? "..." : ""}` : "未填写",
      curProposal ? `${curProposal.slice(0, 40)}${curProposal.length > 40 ? "..." : ""}` : "未填写",
    );
  } else if (!onlyChanged) {
    pushRow(
      "方案文本",
      prevProposal ? `${prevProposal.slice(0, 40)}${prevProposal.length > 40 ? "..." : ""}` : "未填写",
      curProposal ? `${curProposal.slice(0, 40)}${curProposal.length > 40 ? "..." : ""}` : "未填写",
    );
  }
  const curScope = (current.serviceScope ?? "").trim();
  const prevScope = (previous.serviceScope ?? "").trim();
  if (curScope !== prevScope) {
    pushRow(
      "服务范围",
      prevScope ? `${prevScope.slice(0, 40)}${prevScope.length > 40 ? "..." : ""}` : "未填写",
      curScope ? `${curScope.slice(0, 40)}${curScope.length > 40 ? "..." : ""}` : "未填写",
    );
  } else if (!onlyChanged) {
    pushRow(
      "服务范围",
      prevScope ? `${prevScope.slice(0, 40)}${prevScope.length > 40 ? "..." : ""}` : "未填写",
      curScope ? `${curScope.slice(0, 40)}${curScope.length > 40 ? "..." : ""}` : "未填写",
    );
  }
  return rows;
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type LocalBidTemplate = {
  id: string;
  name: string;
  category: string;
  feeMode: string;
  estimatedDays: number | "";
  includesConsultation: boolean;
  serviceScope: string;
  message: string;
  updatedAt: string;
};

const BID_TEMPLATE_STORAGE_KEY = "law119_attorney_bid_templates_v1";

function loadLocalBidTemplates(): LocalBidTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BID_TEMPLATE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function MarketplaceCaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawingBidId, setWithdrawingBidId] = useState<string | null>(null);
  const [withdrawConfirmBidId, setWithdrawConfirmBidId] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineConversationId, setTimelineConversationId] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<"all" | "status" | "bid" | "conversation">("all");
  const [timelineMineOnly, setTimelineMineOnly] = useState(false);
  const [expandedVersionDiffIds, setExpandedVersionDiffIds] = useState<Record<string, boolean>>({});
  const [versionDiffOnlyChanged, setVersionDiffOnlyChanged] = useState(true);
  const [copyDiffIncludeCaseTitle, setCopyDiffIncludeCaseTitle] = useState(true);
  const [copyDiffIncludeAttorneyProfileId, setCopyDiffIncludeAttorneyProfileId] = useState(false);
  const [copyDiffIncludeCaseLink, setCopyDiffIncludeCaseLink] = useState(false);
  const [copyDiffIncludeDetailUrl, setCopyDiffIncludeDetailUrl] = useState(false);
  const [copyDiffTemplate, setCopyDiffTemplate] = useState<"default" | "ops">("default");
  const [copyDiffFormat, setCopyDiffFormat] = useState<"text" | "markdown">("text");
  const { viewer, loading: authLoading } = useMarketplaceAuth();
  const [bidForm, setBidForm] = useState({
    proposalText: "",
    priceAmount: "",
    serviceScope: "",
    estimatedDays: "",
    includesConsultation: true,
    feeMode: "CUSTOM",
  });
  const [localBidTemplates, setLocalBidTemplates] = useState<LocalBidTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const quoteDeadlinePassed = Boolean(
    detail?.quoteDeadline && new Date(detail.quoteDeadline).getTime() < Date.now(),
  );
  const budgetMinNum = detail?.budgetMin != null ? Number(detail.budgetMin) : null;
  const budgetMaxNum = detail?.budgetMax != null ? Number(detail.budgetMax) : null;
  const budgetRangeInvalid =
    budgetMinNum != null && budgetMaxNum != null && !Number.isNaN(budgetMinNum) && !Number.isNaN(budgetMaxNum)
      ? budgetMinNum > budgetMaxNum
      : false;
  const bidAmountNum = bidForm.priceAmount ? Number(bidForm.priceAmount) : null;
  const bidOutsideBudget =
    bidAmountNum != null &&
    !Number.isNaN(bidAmountNum) &&
    ((budgetMinNum != null && bidAmountNum < budgetMinNum) ||
      (budgetMaxNum != null && bidAmountNum > budgetMaxNum));
  const myCurrentBid = useMemo(
    () => (viewer.user?.role === "ATTORNEY" ? detail?.bids?.[0] ?? null : null),
    [detail?.bids, viewer.user?.role],
  );
  const lawyerEngagementEntry = useMemo(() => {
    if (!detail?.engagementSummary) return null;
    if (viewer.user?.role !== "ATTORNEY") return detail.engagementSummary;
    return detail.engagementSummary.isMyEngagement ? detail.engagementSummary : null;
  }, [detail?.engagementSummary, viewer.user?.role]);
  const lawyerRiskHints = useMemo(() => {
    if (!detail) return [] as string[];
    const hints: string[] = [];
    const text = `${detail.descriptionMasked ?? ""} ${detail.description ?? ""}`.toLowerCase();
    if (!detail.budgetMin && !detail.budgetMax) hints.push("资料不足：未填写预算");
    if ((detail.descriptionMasked ?? "").trim().length < 40) hints.push("资料不足：脱敏摘要较短");
    if (quoteDeadlinePassed) hints.push("报价风险：已过报价截止");
    if (budgetRangeInvalid) hints.push("数据异常：预算区间配置异常");
    if (/(passport|ssn|social security|身份证|护照|住址|address)/i.test(text)) hints.push("隐私风险：疑似包含敏感证据信息");
    if (/(threat|威胁|骚扰|报复)/i.test(text)) hints.push("沟通风险：案情可能涉及冲突升级");
    return hints;
  }, [detail, quoteDeadlinePassed, budgetRangeInvalid]);

  const recommendedTemplates = useMemo(() => {
    const category = detail?.category;
    const all = localBidTemplates;
    const matched = category ? all.filter((t) => t.category === category) : [];
    return (matched.length ? matched : all).slice(0, 10);
  }, [localBidTemplates, detail?.category]);

  function restoreBidVersion(version: NonNullable<BidItem["versionHistory"]>[number]) {
    setBidForm((v) => ({
      ...v,
      proposalText: version.proposalText || v.proposalText,
      priceAmount:
        version.priceMax != null
          ? String(version.priceMax)
          : version.priceMin != null
            ? String(version.priceMin)
            : v.priceAmount,
      feeMode: version.feeMode ?? v.feeMode,
      serviceScope: version.serviceScope ?? v.serviceScope,
      estimatedDays:
        typeof version.estimatedDays === "number" ? String(version.estimatedDays) : v.estimatedDays,
      includesConsultation: version.includesConsultation ?? v.includesConsultation,
    }));
    setSubmitResult(`已将版本 v${version.version} 内容恢复到报价表单（未提交）。`);
  }

  useEffect(() => {
    setLocalBidTemplates(loadLocalBidTemplates());
  }, []);

  useEffect(() => {
    if (!caseId) return;
    let canceled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/marketplace/cases/${caseId}`)
      .then(async (r) => {
        const data = (await r.json()) as ApiResult;
        if (!r.ok) throw new Error(data.error || "Failed to load");
        return data;
      })
      .then((data) => {
        if (!canceled) {
          setDetail(data.case ?? null);
          if (data.case?.feeMode) {
            setBidForm((v) => ({ ...v, feeMode: data.case?.feeMode ?? v.feeMode }));
          }
          const myBid = viewer.user?.role === "ATTORNEY" ? (data.case?.bids ?? [])[0] : null;
          if (myBid) {
            setBidForm((v) => ({
              ...v,
              proposalText: myBid.proposalText || v.proposalText,
              priceAmount:
                myBid.priceMax != null
                  ? String(myBid.priceMax)
                  : myBid.priceMin != null
                    ? String(myBid.priceMin)
                    : v.priceAmount,
              serviceScope: myBid.serviceScope ?? v.serviceScope,
              estimatedDays:
                typeof myBid.estimatedDays === "number" ? String(myBid.estimatedDays) : v.estimatedDays,
              includesConsultation: myBid.includesConsultation ?? v.includesConsultation,
              feeMode: myBid.feeMode ?? v.feeMode,
            }));
          }
        }
      })
      .catch((e: unknown) => {
        if (!canceled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [caseId, submitResult, viewer.user?.role]);

  function applyBidTemplate(templateId: string) {
    const tpl = localBidTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    setBidForm((v) => ({
      ...v,
      proposalText: tpl.message || v.proposalText,
      serviceScope: tpl.serviceScope || v.serviceScope,
      feeMode: tpl.feeMode || v.feeMode,
      estimatedDays:
        typeof tpl.estimatedDays === "number" && Number.isFinite(tpl.estimatedDays)
          ? String(tpl.estimatedDays)
          : v.estimatedDays,
      includesConsultation: tpl.includesConsultation,
    }));
    setSubmitResult(`已应用报价模板：${tpl.name}（请确认价格与服务范围后提交）。`);
  }

  useEffect(() => {
    if (!caseId) return;
    let canceled = false;
    fetch(`/api/marketplace/cases/${caseId}/timeline`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load timeline");
        return data;
      })
      .then((data) => {
        if (canceled) return;
        setTimeline(data.events ?? []);
        setTimelineConversationId(data.conversationEntry ?? null);
      })
      .catch(() => {
        if (canceled) return;
        setTimeline([]);
        setTimelineConversationId(null);
      });
    return () => {
      canceled = true;
    };
  }, [caseId, submitResult]);

  async function onSubmitBid(e: FormEvent) {
    e.preventDefault();
    if (!caseId) return;
    if (quoteDeadlinePassed) {
      setSubmitResult("报价失败：该案件报价截止时间已过。");
      return;
    }
    if (budgetRangeInvalid) {
      setSubmitResult("报价失败：案件预算区间配置异常（最小值大于最大值），请联系发布方或管理员。");
      return;
    }
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const r = await fetch(`/api/marketplace/cases/${caseId}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalText: bidForm.proposalText,
          priceAmount: bidForm.priceAmount ? Number(bidForm.priceAmount) : undefined,
          serviceScope: bidForm.serviceScope || undefined,
          estimatedDays: bidForm.estimatedDays ? Number(bidForm.estimatedDays) : undefined,
          includesConsultation: bidForm.includesConsultation,
          feeMode: bidForm.feeMode,
        }),
      });
      const data = (await r.json()) as { error?: string; bid?: { id: string } };
      if (!r.ok) throw new Error(data.error || "提交失败");
                  setSubmitResult(`报价已提交/更新（Bid ID: ${data.bid?.id ?? "-"}）`);
    } catch (e: unknown) {
      setSubmitResult(`报价失败：${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredTimeline = useMemo(() => {
    return timeline.filter((e) => {
      if (
        timelineMineOnly &&
        viewer.user?.role === "ATTORNEY" &&
        (e.type === "case_created" || e.type === "status_changed")
      ) {
        return false;
      }
      if (timelineFilter === "all") return true;
      if (timelineFilter === "status") return e.type === "case_created" || e.type === "status_changed";
      if (timelineFilter === "bid") return e.type === "bid_version";
      if (timelineFilter === "conversation") return e.type === "conversation_opened" || e.type === "conversation_closed";
      return true;
    });
  }, [timeline, timelineFilter, timelineMineOnly, viewer.user?.role]);

  async function onWithdrawBid(bidId: string) {
    setWithdrawingBidId(bidId);
    try {
      const r = await fetch(`/api/marketplace/bids/${bidId}/withdraw`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "撤回失败");
      setSubmitResult("报价已撤回。你可以稍后修改并重新提交。");
    } catch (e: unknown) {
      setSubmitResult(`撤回失败：${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setWithdrawingBidId(null);
      setWithdrawConfirmBidId(null);
    }
  }

  function exportTimelineJson() {
    if (!detail) return;
    downloadTextFile(
      `case-timeline-${detail.id}.json`,
      JSON.stringify(
        {
          caseId: detail.id,
          exportedAt: new Date().toISOString(),
          filters: { timelineFilter, timelineMineOnly },
          events: filteredTimeline,
        },
        null,
        2,
      ),
      "application/json;charset=utf-8",
    );
    setSubmitResult("时间线 JSON 已导出。");
  }

  function exportTimelineCsv() {
    if (!detail) return;
    const rows = [
      ["id", "type", "title", "detail", "at", "conversationId"].join(","),
      ...filteredTimeline.map((e) =>
        [
          e.id,
          e.type,
          `"${(e.title ?? "").replace(/"/g, '""')}"`,
          `"${(e.detail ?? "").replace(/"/g, '""')}"`,
          e.at,
          e.meta?.conversationId ?? "",
        ].join(","),
      ),
    ];
    downloadTextFile(`case-timeline-${detail.id}.csv`, rows.join("\n"), "text/csv;charset=utf-8");
    setSubmitResult("时间线 CSV 已导出。");
  }

  async function copyVersionDiffSummary(params: {
    bidId: string;
    version: number;
    createdAt: string;
    caseTitle?: string | null;
    attorneyProfileId?: string | null;
    includeCaseTitle?: boolean;
    includeAttorneyProfileId?: boolean;
    includeCaseLink?: boolean;
    includeDetailUrl?: boolean;
    caseId?: string;
    detailUrl?: string | null;
    template?: "default" | "ops";
    format?: "text" | "markdown";
    rows: Array<{ label: string; from: string; to: string }>;
  }) {
    const template = params.template ?? "default";
    const format = params.format ?? "text";
    const casePath = params.caseId ? `/marketplace/cases/${params.caseId}` : null;
    const lines =
      template === "ops"
        ? [
            `【运营转发】报价变更`,
            ...(params.includeCaseTitle && params.caseTitle ? [`案件：${params.caseTitle}`] : []),
            ...(params.includeCaseLink && casePath ? [`案件链接：${casePath}`] : []),
            ...(params.includeDetailUrl && params.detailUrl ? [`详情页链接：${params.detailUrl}`] : []),
            `报价ID：${params.bidId}`,
            ...(params.includeAttorneyProfileId && params.attorneyProfileId ? [`律师档案ID：${params.attorneyProfileId}`] : []),
            `版本：v${params.version}`,
            `时间：${formatDateTime(params.createdAt)}`,
            `变更项：${params.rows.length} 项`,
            ...params.rows.map((r, idx) => `${idx + 1}. ${r.label}：${r.from} -> ${r.to}`),
            `请运营同学按案件阶段确认是否需要人工跟进。`,
          ]
        : [
            `报价变更摘要`,
            ...(params.includeCaseTitle && params.caseTitle ? [`案件标题: ${params.caseTitle}`] : []),
            ...(params.includeCaseLink && casePath ? [`案件链接: ${casePath}`] : []),
            ...(params.includeDetailUrl && params.detailUrl ? [`详情页链接: ${params.detailUrl}`] : []),
            `Bid: ${params.bidId}`,
            ...(params.includeAttorneyProfileId && params.attorneyProfileId ? [`律师档案ID: ${params.attorneyProfileId}`] : []),
            `版本: v${params.version}`,
            `时间: ${formatDateTime(params.createdAt)}`,
            ...params.rows.map((r) => `- ${r.label}: ${r.from} -> ${r.to}`),
          ];
    const markdownLines =
      template === "ops"
        ? [
            `## 运营转发：报价变更`,
            ...(params.includeCaseTitle && params.caseTitle ? [`- 案件：${params.caseTitle}`] : []),
            ...(params.includeCaseLink && casePath ? [`- 案件链接：${casePath}`] : []),
            ...(params.includeDetailUrl && params.detailUrl ? [`- 详情页链接：${params.detailUrl}`] : []),
            `- 报价ID：${params.bidId}`,
            ...(params.includeAttorneyProfileId && params.attorneyProfileId ? [`- 律师档案ID：${params.attorneyProfileId}`] : []),
            `- 版本：v${params.version}`,
            `- 时间：${formatDateTime(params.createdAt)}`,
            `- 变更项：${params.rows.length} 项`,
            ...params.rows.map((r) => `  - ${r.label}：\`${r.from}\` -> \`${r.to}\``),
            ``,
            `> 请运营同学按案件阶段确认是否需要人工跟进。`,
          ]
        : [
            `## 报价变更摘要`,
            ...(params.includeCaseTitle && params.caseTitle ? [`- 案件标题：${params.caseTitle}`] : []),
            ...(params.includeCaseLink && casePath ? [`- 案件链接：${casePath}`] : []),
            ...(params.includeDetailUrl && params.detailUrl ? [`- 详情页链接：${params.detailUrl}`] : []),
            `- Bid：${params.bidId}`,
            ...(params.includeAttorneyProfileId && params.attorneyProfileId ? [`- 律师档案ID：${params.attorneyProfileId}`] : []),
            `- 版本：v${params.version}`,
            `- 时间：${formatDateTime(params.createdAt)}`,
            ...params.rows.map((r) => `  - ${r.label}：\`${r.from}\` -> \`${r.to}\``),
          ];
    try {
      await navigator.clipboard.writeText((format === "markdown" ? markdownLines : lines).join("\n"));
      setSubmitResult(`已复制版本 v${params.version} 的变更摘要。`);
    } catch {
      setSubmitResult("复制变更摘要失败，请检查浏览器剪贴板权限。");
    }
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Marketplace MVP</p>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">案件详情 / 律师报价页</h1>
              <p className="text-sm text-slate-500 mt-2">
                借鉴帮帮网的详情页交互：左侧案件信息，右侧报价提交；下方查看现有报价。
              </p>
              {!authLoading && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                    当前角色：{viewer.user?.role ?? "ANONYMOUS"}
                  </span>
                  <Link href="/marketplace/my-cases" className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200">
                    我的案件
                  </Link>
                  <Link href="/marketplace/my-bids" className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200">
                    我的报价
                  </Link>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Link href="/marketplace/case-hall" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">
                返回大厅
              </Link>
              {caseId && detail?.viewer?.canSelectBid && (
                <Link href={`/marketplace/cases/${caseId}/select`} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-700">
                  发布方选择报价
                </Link>
              )}
            </div>
          </div>

          {loading && <div className="text-sm text-slate-500">加载案件详情中...</div>}
          {error && <div className="text-sm text-rose-700">加载失败：{error}</div>}

          {detail && (
            <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100">{detail.category}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">{detail.urgency}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{detail.status}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{detail.title}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {detail.stateCode} {detail.city ?? ""} · ZIP {detail.zipCodeMasked} · 语言 {detail.preferredLanguage}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">收费模式</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{detail.feeMode ?? "CUSTOM"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">预算区间</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {moneyRange(detail.budgetMin ?? null, detail.budgetMax ?? null)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">报价截止时间</p>
                    <p className={`mt-1 text-sm font-semibold ${quoteDeadlinePassed ? "text-rose-700" : "text-slate-900"}`}>
                      {formatDateTime(detail.quoteDeadline)}
                    </p>
                  </div>
                </div>
                {(quoteDeadlinePassed || budgetRangeInvalid) && (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    {quoteDeadlinePassed && <p>该案件报价截止时间已过，律师不能再提交报价。</p>}
                    {budgetRangeInvalid && <p>案件预算区间异常（最低预算大于最高预算）。</p>}
                  </div>
                )}
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500 mb-2">大厅脱敏摘要</p>
                  <p className="text-sm text-slate-700 leading-6">{detail.descriptionMasked}</p>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-500 mb-2">原始描述（仅示范；正式版应做权限控制）</p>
                  {detail.viewer?.canSeeFullDescription ? (
                    <p className="text-sm text-slate-700 leading-6 whitespace-pre-wrap">{detail.description}</p>
                  ) : (
                    <p className="text-sm text-slate-500">请登录律师或案件发布方账号查看完整案情。</p>
                  )}
                </div>
                {(viewer.user?.role === "ATTORNEY" || viewer.user?.role === "ADMIN") && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1.2fr_1fr]">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-semibold text-amber-700">律师侧风险提示</p>
                      {lawyerRiskHints.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm text-amber-900">
                          {lawyerRiskHints.map((hint) => (
                            <li key={hint}>• {hint}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-emerald-700">当前未发现明显结构化风险提示，可正常推进沟通与报价。</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-500">沟通 / 委托快捷入口</p>
                      <div className="mt-2 flex flex-col gap-2">
                        {timelineConversationId ? (
                          <>
                            <Link href={`/chat/${timelineConversationId}`} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white text-center hover:bg-slate-700">
                              打开聊天会话
                            </Link>
                            <Link href={`/marketplace/conversations/${timelineConversationId}/workflow`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-center hover:bg-slate-50">
                              打开工作流面板
                            </Link>
                          </>
                        ) : (
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                            暂无会话（客户选中并创建会话后出现）
                          </span>
                        )}
                        {lawyerEngagementEntry ? (
                          <Link href={`/marketplace/engagements/${lawyerEngagementEntry.id}`} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-center text-emerald-700 hover:bg-emerald-100">
                            委托确认单（{lawyerEngagementEntry.status}）
                          </Link>
                        ) : detail.selectedBidId && myCurrentBid && detail.selectedBidId === myCurrentBid.id ? (
                          <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                            已中选，委托确认单尚未生成或加载中
                          </span>
                        ) : (
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                            委托确认入口将在客户选中后显示
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">提交报价（律师侧）</h3>
                <p className="text-sm text-slate-500 mt-1">对应帮帮网的“接单报价”交互，业务字段替换为法律报价。</p>
                {authLoading ? (
                  <div className="mt-4 text-sm text-slate-500">加载登录态中...</div>
                ) : detail.viewer?.canBid ? (
                <form className="space-y-4 mt-4" onSubmit={onSubmitBid}>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">预报价模板</p>
                        <p className="text-xs text-slate-500">
                          按案件类目 {detail.category} 优先推荐模板，可一键填充报价说明/服务范围/收费模式。
                        </p>
                      </div>
                      <Link href="/attorney/bid-templates" className="text-xs text-blue-700 underline">
                        管理模板
                      </Link>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <select
                        className="min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                      >
                        <option value="">选择模板...</option>
                        {recommendedTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} · {tpl.category} · {tpl.feeMode}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedTemplateId}
                        onClick={() => applyBidTemplate(selectedTemplateId)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
                      >
                        一键填充
                      </button>
                      {recommendedTemplates.length === 0 && (
                        <span className="text-xs text-slate-500">暂无模板，可先在“报价模板系统”创建。</span>
                      )}
                    </div>
                  </div>
                  <label className="block text-sm">
                    <span className="block text-slate-700 mb-1.5">报价方案说明</span>
                    <textarea
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 min-h-28"
                      value={bidForm.proposalText}
                      onChange={(e) => setBidForm((v) => ({ ...v, proposalText: e.target.value }))}
                      placeholder="说明服务范围、处理策略、关键步骤..."
                      required
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">收费模式</span>
                      <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={bidForm.feeMode}
                        onChange={(e) => setBidForm((v) => ({ ...v, feeMode: e.target.value }))}
                      >
                        <option value="CUSTOM">CUSTOM</option>
                        <option value="CONSULTATION">CONSULTATION</option>
                        <option value="AGENCY">AGENCY</option>
                        <option value="STAGED">STAGED</option>
                        <option value="HOURLY">HOURLY</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">报价金额（MVP）</span>
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={bidForm.priceAmount}
                        onChange={(e) => setBidForm((v) => ({ ...v, priceAmount: e.target.value }))}
                        required
                      />
                      {bidOutsideBudget && (
                        <span className="block mt-1 text-xs text-amber-700">
                          当前报价超出发布方预算区间（可提交，但建议确认服务范围）。
                        </span>
                      )}
                    </label>
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1.5">预计天数（预留）</span>
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={bidForm.estimatedDays}
                        onChange={(e) => setBidForm((v) => ({ ...v, estimatedDays: e.target.value }))}
                      />
                    </label>
                  </div>
                  <label className="block text-sm">
                    <span className="block text-slate-700 mb-1.5">服务范围（预留字段）</span>
                    <textarea
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 min-h-20"
                      value={bidForm.serviceScope}
                      onChange={(e) => setBidForm((v) => ({ ...v, serviceScope: e.target.value }))}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={bidForm.includesConsultation}
                      onChange={(e) => setBidForm((v) => ({ ...v, includesConsultation: e.target.checked }))}
                    />
                    包含首次咨询（预留）
                  </label>

                  <button
                    type="submit"
                    disabled={submitting || quoteDeadlinePassed || budgetRangeInvalid}
                    className="w-full rounded-lg bg-amber-600 text-white font-semibold py-2.5 hover:bg-amber-500 disabled:opacity-60"
                  >
                    {quoteDeadlinePassed ? "已过报价截止时间" : submitting ? "提交中..." : "提交 / 更新报价"}
                  </button>
                  {viewer.user?.role === "ATTORNEY" &&
                    detail.bids[0] &&
                    detail.bids[0].status !== "WITHDRAWN" &&
                    detail.bids[0].status !== "ACCEPTED" && (
                      <button
                        type="button"
                        disabled={withdrawingBidId === detail.bids[0].id}
                        onClick={() => setWithdrawConfirmBidId(detail.bids[0].id)}
                        className="w-full rounded-lg border border-rose-300 text-rose-700 font-semibold py-2.5 hover:bg-rose-50 disabled:opacity-60"
                      >
                        {withdrawingBidId === detail.bids[0].id ? "撤回中..." : "撤回报价"}
                      </button>
                    )}
                </form>
                ) : (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-2">
                    <p>该区域仅律师账号可提交报价。</p>
                    {!viewer.authenticated && (
                      <Link href="/auth/sign-in?role=attorney" className="underline">
                        前往律师登录
                      </Link>
                    )}
                    {viewer.user?.role === "CLIENT" && <p>当前为发布方账号，请使用律师账号登录。</p>}
                  </div>
                )}

                {submitResult && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {submitResult}
                  </div>
                )}
              </section>
            </div>
          )}

          {detail && (
            <section className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-slate-900">案件时间线 / Case Timeline</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={timelineFilter}
                    onChange={(e) => setTimelineFilter(e.target.value as typeof timelineFilter)}
                  >
                    <option value="all">全部事件</option>
                    <option value="status">状态事件</option>
                    <option value="bid">报价事件</option>
                    <option value="conversation">会话事件</option>
                  </select>
                  {viewer.user?.role === "ATTORNEY" && (
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={timelineMineOnly}
                        onChange={(e) => setTimelineMineOnly(e.target.checked)}
                      />
                      只看我相关事件
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={exportTimelineJson}
                    disabled={filteredTimeline.length === 0}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    导出 JSON
                  </button>
                  <button
                    type="button"
                    onClick={exportTimelineCsv}
                    disabled={filteredTimeline.length === 0}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    导出 CSV
                  </button>
                  {timelineConversationId ? (
                    <Link
                      href={`/chat/${timelineConversationId}`}
                      className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold hover:bg-slate-700"
                    >
                      进入沟通
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-500">暂无可用沟通入口</span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                显示 {filteredTimeline.length} / {timeline.length} 条事件
              </p>
              <div className="mt-4 space-y-3">
                {filteredTimeline.length === 0 && <p className="text-sm text-slate-500">当前筛选下暂无时间线数据。</p>}
                {filteredTimeline.map((e) => {
                  const style = timelineStyle(e.type);
                  return (
                  <div key={e.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${style.dot}`}>
                          {style.icon}
                        </span>
                        <span className={`text-xs rounded-full px-2 py-1 ${style.pill}`}>{style.label}</span>
                        <p className="text-sm font-semibold text-slate-900">{e.title}</p>
                      </div>
                      <span className="text-xs text-slate-500">{formatDateTime(e.at)}</span>
                    </div>
                    {e.detail && <p className="text-sm text-slate-600 mt-2">{e.detail}</p>}
                    {e.meta?.conversationId && (
                      <div className="mt-2">
                        <Link href={`/chat/${e.meta.conversationId}`} className="text-xs underline text-slate-700">
                          打开会话 {e.meta.conversationId.slice(-6)}
                        </Link>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            </section>
          )}

          {detail && (
            <section className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-slate-900">当前报价列表（发布方对比区）</h3>
                <span className="text-sm text-slate-500">{detail.quoteCount} 条报价</span>
              </div>
              <div className="mt-4 grid gap-3">
                {detail.bids.length === 0 && <p className="text-sm text-slate-500">{detail.viewer?.canSeeAllBids ? "暂无报价。" : "登录发布方账号可查看全部报价；律师仅显示自己的报价。"} </p>}
                {detail.bids.map((bid) => (
                  <div key={bid.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Bid #{bid.id.slice(-6)}</p>
                        <p className="text-xs text-slate-500 mt-1">律师档案：{bid.attorneyProfileId}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          版本 v{bid.version ?? 1} · 更新于 {formatDateTime(bid.updatedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{moneyRange(bid.priceMin, bid.priceMax)}</p>
                        <p className="text-xs text-slate-500 mt-1">{bid.status}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">收费模式 {bid.feeMode ?? "CUSTOM"}</span>
                      {typeof bid.estimatedDays === "number" && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">预计 {bid.estimatedDays} 天</span>
                      )}
                      {bid.includesConsultation && (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">含首次咨询</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mt-3 leading-6 whitespace-pre-wrap">{bid.proposalText}</p>
                    {bid.serviceScope && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-500 mb-1">服务范围</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{bid.serviceScope}</p>
                      </div>
                    )}
                    <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-slate-500">报价版本历史（MVP）</p>
                        <label className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                          <input
                            type="checkbox"
                            checked={versionDiffOnlyChanged}
                            onChange={(e) => setVersionDiffOnlyChanged(e.target.checked)}
                          />
                          仅显示有变化字段
                        </label>
                      </div>
                      {bid.versionHistory && bid.versionHistory.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {bid.versionHistory.map((v, idx) => {
                            const history = bid.versionHistory ?? [];
                            const prev = history[idx + 1];
                            const changes = versionChangeSummary(v, prev);
                            const diffRows = versionChangeDetails(
                              { ...v, proposalText: v.proposalText, serviceScope: v.serviceScope },
                              prev ? { ...prev, proposalText: prev.proposalText, serviceScope: prev.serviceScope } : undefined,
                              { onlyChanged: versionDiffOnlyChanged },
                            );
                            return (
                              <div key={v.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-md bg-white border px-2.5 py-2 ${changes.length ? "border-amber-200" : "border-slate-200"}`}>
                                <div className="text-xs text-slate-700">
                                  <span className="font-semibold">v{v.version}</span>
                                  <span className="mx-2">·</span>
                                  <span>{moneyRange(v.priceMin, v.priceMax)}</span>
                                  <span className="mx-2">·</span>
                                  <span>{v.feeMode}</span>
                                  {typeof v.estimatedDays === "number" && <span className="ml-2">{v.estimatedDays}天</span>}
                                  {changes.length > 0 && (
                                    <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                                      {changes.map((c) => (
                                        <span key={`${v.id}-${c}`} className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
                                          {c}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {formatDateTime(v.createdAt)} · {v.status}
                                </div>
                                {changes.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedVersionDiffIds((m) => ({ ...m, [v.id]: !m[v.id] }))
                                    }
                                    className="text-xs rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50"
                                  >
                                    {expandedVersionDiffIds[v.id] ? "收起差异" : "查看差异"}
                                  </button>
                                )}
                                {viewer.user?.role === "ATTORNEY" && detail.viewer?.canBid && (
                                  <button
                                    type="button"
                                    onClick={() => restoreBidVersion(v)}
                                    className="text-xs rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50"
                                  >
                                    恢复到表单
                                  </button>
                                )}
                                {expandedVersionDiffIds[v.id] && (
                                  <div className="w-full rounded-md border border-slate-200 bg-slate-50 p-2">
                                    <div className="mb-1 flex items-center justify-between gap-2 flex-wrap">
                                      <p className="text-[11px] font-semibold text-slate-600">版本差异（旧值 → 新值）</p>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <label className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                                          <input
                                            type="checkbox"
                                            checked={copyDiffIncludeCaseTitle}
                                            onChange={(e) => setCopyDiffIncludeCaseTitle(e.target.checked)}
                                          />
                                          含案件标题
                                        </label>
                                        <label className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                                          <input
                                            type="checkbox"
                                            checked={copyDiffIncludeAttorneyProfileId}
                                            onChange={(e) => setCopyDiffIncludeAttorneyProfileId(e.target.checked)}
                                          />
                                          含律师档案ID
                                        </label>
                                        <label className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                                          <input
                                            type="checkbox"
                                            checked={copyDiffIncludeCaseLink}
                                            onChange={(e) => setCopyDiffIncludeCaseLink(e.target.checked)}
                                          />
                                          含案件链接
                                        </label>
                                        <label className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                                          <input
                                            type="checkbox"
                                            checked={copyDiffIncludeDetailUrl}
                                            onChange={(e) => setCopyDiffIncludeDetailUrl(e.target.checked)}
                                          />
                                          含详情页链接
                                        </label>
                                        <select
                                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px]"
                                          value={copyDiffTemplate}
                                          onChange={(e) => setCopyDiffTemplate(e.target.value as "default" | "ops")}
                                        >
                                          <option value="default">默认模板</option>
                                          <option value="ops">运营模板</option>
                                        </select>
                                        <select
                                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px]"
                                          value={copyDiffFormat}
                                          onChange={(e) => setCopyDiffFormat(e.target.value as "text" | "markdown")}
                                        >
                                          <option value="text">纯文本</option>
                                          <option value="markdown">Markdown</option>
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void copyVersionDiffSummary({
                                              bidId: bid.id,
                                              version: v.version,
                                              createdAt: v.createdAt,
                                              caseTitle: detail.title,
                                              caseId: detail.id,
                                              detailUrl: typeof window !== "undefined" ? window.location.href : null,
                                              attorneyProfileId: bid.attorneyProfileId,
                                              includeCaseTitle: copyDiffIncludeCaseTitle,
                                              includeAttorneyProfileId: copyDiffIncludeAttorneyProfileId,
                                              includeCaseLink: copyDiffIncludeCaseLink,
                                              includeDetailUrl: copyDiffIncludeDetailUrl,
                                              template: copyDiffTemplate,
                                              format: copyDiffFormat,
                                              rows: diffRows,
                                            })
                                          }
                                          className="text-[11px] rounded-md border border-slate-300 px-2 py-1 hover:bg-white"
                                        >
                                          复制本次变更摘要
                                        </button>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      {diffRows.map((row) => (
                                        <div key={`${v.id}-${row.label}`} className="text-[11px] text-slate-700 flex flex-wrap gap-1">
                                          <span className="font-medium">{row.label}:</span>
                                          <span className="text-slate-500">{row.from}</span>
                                          <span>→</span>
                                          <span className={`font-medium ${row.from === row.to ? "text-slate-500" : "text-slate-900"}`}>{row.to}</span>
                                          {row.from === row.to && <span className="text-slate-400">(未变化)</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600">当前仅有一个版本。</p>
                      )}
                    </div>
                    {detail.viewer?.canSelectBid && (
                      <div className="mt-3">
                        <Link
                          href={`/marketplace/cases/${detail.id}/select`}
                          className="text-sm underline text-slate-700"
                        >
                          去发布方选择报价页面
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {withdrawConfirmBidId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <h3 className="text-lg font-semibold text-slate-900">确认撤回报价？</h3>
                <p className="mt-2 text-sm text-slate-600">
                  撤回后发布方将无法选择该报价。你后续仍可在本案件中重新编辑并提交新的报价版本。
                </p>
                <p className="mt-2 text-xs text-slate-400 break-all">Bid ID: {withdrawConfirmBidId}</p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawConfirmBidId(null)}
                    disabled={withdrawingBidId !== null}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => onWithdrawBid(withdrawConfirmBidId)}
                    disabled={withdrawingBidId !== null}
                    className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    {withdrawingBidId === withdrawConfirmBidId ? "撤回中..." : "确认撤回"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
