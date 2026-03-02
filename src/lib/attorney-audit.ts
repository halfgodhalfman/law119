/**
 * 律师档案变更审计工具
 * 修复 #8: 律师修改个人信息时记录变更快照
 */

import { prisma } from "./prisma";

type AuditableAttorneyFields = {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  firmName?: string | null;
  bio?: string | null;
  barLicenseNumber?: string | null;
  barNumberVerified?: boolean;
  isVerified?: boolean;
  yearsExperience?: number | null;
  website?: string | null;
  linkedinUrl?: string | null;
  consultationFee?: number | null;
  freeConsultation?: boolean;
  proBonoAvailable?: boolean;
  slidingScaleAvailable?: boolean;
  legalAidPartner?: boolean;
  [key: string]: unknown;
};

type OperationType = "SELF_UPDATE" | "ADMIN_UPDATE" | "ADMIN_VERIFY";

/**
 * 比较两个对象的差异，返回变更字段列表及前后快照
 */
function diffObjects(
  before: AuditableAttorneyFields,
  after: AuditableAttorneyFields,
): { changedFields: string[]; beforeSnapshot: Record<string, unknown>; afterSnapshot: Record<string, unknown> } {
  const changedFields: string[] = [];
  const beforeSnapshot: Record<string, unknown> = {};
  const afterSnapshot: Record<string, unknown> = {};

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    const beforeVal = before[key];
    const afterVal = after[key];
    // 深比较（JSON stringify 用于简单对象和数组）
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changedFields.push(key);
      beforeSnapshot[key] = beforeVal;
      afterSnapshot[key] = afterVal;
    }
  }

  return { changedFields, beforeSnapshot, afterSnapshot };
}

/**
 * 记录律师档案变更审计日志
 *
 * @param attorneyId - 律师档案 ID
 * @param operatorUserId - 操作者用户 ID（律师本人或管理员）
 * @param operationType - 操作类型
 * @param before - 变更前的字段值
 * @param after - 变更后的字段值
 * @param request - 可选请求对象（用于提取 IP 和 UA）
 * @param note - 可选备注
 */
export async function logAttorneyProfileChange(
  attorneyId: string,
  operatorUserId: string | null,
  operationType: OperationType,
  before: AuditableAttorneyFields,
  after: AuditableAttorneyFields,
  request?: Request | null,
  note?: string,
): Promise<void> {
  try {
    const { changedFields, beforeSnapshot, afterSnapshot } = diffObjects(before, after);
    if (changedFields.length === 0) return; // 无实际变更，跳过

    const ipAddress = request
      ? (request.headers.get("cf-connecting-ip") ??
         request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
         request.headers.get("x-real-ip") ??
         null)
      : null;
    const userAgent = request ? request.headers.get("user-agent")?.slice(0, 300) ?? null : null;

    const p = prisma as unknown as {
      attorneyProfileAuditLog?: {
        create: (args: unknown) => Promise<unknown>;
      };
    };
    if (!p.attorneyProfileAuditLog) return; // schema 未迁移时静默跳过

    await p.attorneyProfileAuditLog.create({
      data: {
        attorneyId,
        operatorUserId,
        operationType,
        changedFields,
        beforeSnapshot,
        afterSnapshot,
        ipAddress,
        userAgent,
        note: note ?? null,
      },
    });
  } catch (err) {
    // 审计日志失败不应阻断主流程
    console.warn("[AttorneyAudit] Failed to log profile change:", err);
  }
}
