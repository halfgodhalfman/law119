export type AttorneyReviewTemplateKey = "APPROVE_STANDARD" | "REQUEST_MORE_INFO" | "REJECT_INCOMPLETE";

export const ATTORNEY_REVIEW_TEMPLATES: Record<
  AttorneyReviewTemplateKey,
  { label: string; action: "approve" | "request_info" | "reject"; defaultReason: string; replyTemplate: string }
> = {
  APPROVE_STANDARD: {
    label: "通过（标准）",
    action: "approve",
    defaultReason: "资料完整，执照信息与执业州信息满足平台审核要求。",
    replyTemplate:
      "您好，您的律师资料已通过平台审核。后续如修改执照信息、执业州或关键资料，系统会自动进入复审队列。感谢配合。",
  },
  REQUEST_MORE_INFO: {
    label: "补充材料",
    action: "request_info",
    defaultReason: "请补充缺失资料（头像/执照号/执业州/事务所/执业年限/简介）后再提交审核。",
    replyTemplate:
      "您好，平台已完成初步审核。当前资料仍需补充（如头像、执照号、执业州、事务所、执业年限或简介）后才能继续认证，请更新后重新提交。",
  },
  REJECT_INCOMPLETE: {
    label: "拒绝（资料不完整）",
    action: "reject",
    defaultReason: "当前提交资料不足以完成平台律师审核，请完善后重新提交。",
    replyTemplate:
      "您好，本次律师资料审核未通过。请根据平台提示完善资料后重新提交审核。如有疑问，可联系平台客服。",
  },
};

type AttorneyReviewSource = {
  firstName?: string | null;
  lastName?: string | null;
  firmName?: string | null;
  barLicenseNumber?: string | null;
  barState?: string | null;
  yearsExperience?: number | null;
  avatarUrl?: string | null;
  bio?: string | null;
};

export function buildAttorneyReviewChecklist(attorney: AttorneyReviewSource) {
  const items = [
    {
      key: "barLicenseNumber",
      label: "执照号",
      passed: Boolean(attorney.barLicenseNumber?.trim()),
      detail: attorney.barLicenseNumber?.trim() || "未填写",
      weight: 2,
    },
    {
      key: "barState",
      label: "执业州",
      passed: Boolean(attorney.barState?.trim()),
      detail: attorney.barState?.trim() || "未填写",
      weight: 2,
    },
    {
      key: "firmName",
      label: "事务所",
      passed: Boolean(attorney.firmName?.trim()),
      detail: attorney.firmName?.trim() || "未填写",
      weight: 1,
    },
    {
      key: "yearsExperience",
      label: "执业年限",
      passed: typeof attorney.yearsExperience === "number" && attorney.yearsExperience >= 0,
      detail:
        typeof attorney.yearsExperience === "number"
          ? `${attorney.yearsExperience} 年`
          : "未填写",
      weight: 1,
    },
    {
      key: "avatarUrl",
      label: "头像",
      passed: Boolean(attorney.avatarUrl?.trim()),
      detail: attorney.avatarUrl?.trim() ? "已上传" : "未上传",
      weight: 1,
    },
    {
      key: "bio",
      label: "简介",
      passed: Boolean(attorney.bio?.trim() && attorney.bio.trim().length >= 20),
      detail: attorney.bio?.trim()
        ? `长度 ${attorney.bio.trim().length}`
        : "未填写",
      weight: 1,
    },
  ] as const;

  const totalWeight = items.reduce((sum, it) => sum + it.weight, 0);
  const passedWeight = items.reduce((sum, it) => sum + (it.passed ? it.weight : 0), 0);
  const checklistScore = Math.round((passedWeight / totalWeight) * 100);

  return {
    items,
    checklistScore,
    missingKeys: items.filter((i) => !i.passed).map((i) => i.key),
  };
}

export function computeAttorneyProfileCompleteness(attorney: AttorneyReviewSource & {
  specialtiesCount?: number;
  serviceAreasCount?: number;
  languagesCount?: number;
}) {
  const checklist = buildAttorneyReviewChecklist(attorney);
  const extraPoints =
    (attorney.specialtiesCount ? 10 : 0) +
    (attorney.serviceAreasCount ? 10 : 0) +
    (attorney.languagesCount ? 5 : 0) +
    ((attorney.firstName?.trim() || attorney.lastName?.trim()) ? 5 : 0);
  return Math.min(100, checklist.checklistScore + extraPoints);
}

export function deriveAttorneyQueueState(attorney: {
  reviewStatus: string;
  isVerified: boolean;
  barNumberVerified: boolean;
  updatedAt: Date | string;
  lastReviewedAt?: Date | string | null;
}) {
  const updatedAt = new Date(attorney.updatedAt);
  const lastReviewedAt = attorney.lastReviewedAt ? new Date(attorney.lastReviewedAt) : null;
  const needsReReview = Boolean(lastReviewedAt && updatedAt.getTime() > lastReviewedAt.getTime());
  const pending =
    attorney.reviewStatus === "PENDING_REVIEW" ||
    attorney.reviewStatus === "NEEDS_INFO" ||
    attorney.reviewStatus === "RE_REVIEW_REQUIRED" ||
    (!attorney.isVerified && !attorney.barNumberVerified);

  return {
    needsReReview,
    pendingReviewQueue: pending || needsReReview,
    displayStatus: needsReReview ? "RE_REVIEW_REQUIRED" : attorney.reviewStatus,
  };
}
