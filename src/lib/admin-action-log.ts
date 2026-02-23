import { AdminActionEntityType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type LogAdminActionInput = {
  adminUserId: string;
  entityType: AdminActionEntityType;
  entityId: string;
  action: string;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export async function logAdminAction(input: LogAdminActionInput) {
  return prisma.adminActionLog.create({
    data: {
      adminUserId: input.adminUserId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      reason: input.reason ?? null,
      metadata: input.metadata ?? undefined,
    },
    select: { id: true, createdAt: true },
  });
}

