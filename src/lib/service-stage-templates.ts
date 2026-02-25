import { ServiceBoundaryType } from "@prisma/client";

type StageTemplate = { title: string; description: string };

export const STAGE_TEMPLATES: Record<string, StageTemplate[]> = {
  CONSULTATION: [
    { title: "预约咨询", description: "确认咨询时间与方式" },
    { title: "咨询进行", description: "律师评估案情" },
    { title: "出具意见", description: "提供初步法律意见" },
  ],
  DOCUMENT_PREP: [
    { title: "材料收集", description: "客户提交所需材料" },
    { title: "文书起草", description: "律师起草法律文书" },
    { title: "客户审核", description: "客户审核文书内容" },
    { title: "文书定稿", description: "最终定稿与递交准备" },
  ],
  COURT_APPEARANCE: [
    { title: "材料收集", description: "收集案件相关证据材料" },
    { title: "案件分析", description: "法律分析与策略制定" },
    { title: "文书准备", description: "起草法律文书" },
    { title: "庭前准备", description: "模拟庭审/庭前会议" },
    { title: "出庭代理", description: "律师出庭代理" },
    { title: "判决跟进", description: "跟进判决结果" },
  ],
  FULL_REPRESENTATION: [
    { title: "签约启动", description: "正式代理关系确立" },
    { title: "材料收集与评估", description: "全面收集案件材料" },
    { title: "策略制定", description: "制定法律策略方案" },
    { title: "文书与递交", description: "文书准备与政府/法院递交" },
    { title: "跟进与响应", description: "跟进审批/庭审进展" },
    { title: "结案", description: "案件完结与归档" },
  ],
  CUSTOM: [
    { title: "阶段一", description: "自定义阶段" },
    { title: "阶段二", description: "自定义阶段" },
    { title: "阶段三", description: "自定义阶段" },
  ],
};

export function getTemplateForBoundary(boundary: string): StageTemplate[] {
  return STAGE_TEMPLATES[boundary] || STAGE_TEMPLATES.CUSTOM;
}

export function computeProgress(stages: Array<{ status: string }>) {
  const total = stages.length;
  const completed = stages.filter(s => s.status === "COMPLETED").length;
  const current = stages.find(s => s.status === "IN_PROGRESS");
  return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0, currentTitle: current ? (current as any).title : null };
}
