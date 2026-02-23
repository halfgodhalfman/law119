import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

type InAppPriority = "P0" | "P1" | "P2" | "P3";

function inferPriority(input: CreateNotificationInput): InAppPriority {
  const metadata = (input.metadata ?? null) as Record<string, unknown> | null;
  const explicit = typeof metadata?.priority === "string" ? metadata.priority.toUpperCase() : null;
  if (explicit === "P0" || explicit === "P1" || explicit === "P2" || explicit === "P3") return explicit;

  switch (input.type) {
    case "REPORT_UPDATE":
      return "P0";
    case "DISPUTE_UPDATE":
    case "PAYMENT_UPDATE":
      return "P1";
    case "SUPPORT_TICKET_UPDATE":
      return "P2";
    case "SYSTEM_NOTICE":
    default:
      return "P2";
  }
}

function isInQuietHours(now: Date, start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return false;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s === e) return false;
  return s < e ? mins >= s && mins < e : mins >= s || mins < e;
}

async function shouldDeliverInAppNotification(input: CreateNotificationInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      role: true,
      attorneyNotificationPreference: {
        select: {
          inAppP0: true,
          inAppP1: true,
          inAppP2: true,
          inAppP3: true,
          quietHoursEnabled: true,
          quietHoursStart: true,
          quietHoursEnd: true,
        },
      },
    },
  });
  if (!user || user.role !== "ATTORNEY") return true;

  const pref = user.attorneyNotificationPreference;
  if (!pref) return true;
  const priority = inferPriority(input);
  const enabled =
    priority === "P0" ? pref.inAppP0 :
    priority === "P1" ? pref.inAppP1 :
    priority === "P2" ? pref.inAppP2 :
    pref.inAppP3;
  if (!enabled) return false;

  // Quiet hours suppress non-critical in-app notifications for attorneys.
  if (
    pref.quietHoursEnabled &&
    priority !== "P0" &&
    isInQuietHours(new Date(), pref.quietHoursStart, pref.quietHoursEnd)
  ) {
    return false;
  }
  return true;
}

export async function createUserNotification(input: CreateNotificationInput) {
  const allowed = await shouldDeliverInAppNotification(input).catch(() => true);
  if (!allowed) {
    return { id: null, createdAt: null, skipped: true as const };
  }
  return prisma.userNotification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      linkUrl: input.linkUrl ?? null,
      metadata: input.metadata ?? undefined,
    },
    select: { id: true, createdAt: true },
  });
}

export async function createManyUserNotifications(inputs: CreateNotificationInput[]) {
  if (!inputs.length) return [];
  return Promise.all(inputs.map((i) => createUserNotification(i).catch(() => null)));
}
