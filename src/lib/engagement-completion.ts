import { prisma } from "@/lib/prisma";
import { createUserNotification } from "@/lib/user-notifications";

export async function checkAutoCompletion(engagementId: string): Promise<boolean> {
  const eng = await prisma.engagementConfirmation.findUnique({
    where: { id: engagementId },
    select: { completionStatus: true, completionAutoAt: true, clientProfileId: true, attorneyProfileId: true, client: { select: { userId: true } }, attorney: { select: { userId: true } } },
  });
  if (!eng) return false;
  if (eng.completionStatus !== "REQUESTED_BY_ATTORNEY") return false;
  if (!eng.completionAutoAt || eng.completionAutoAt > new Date()) return false;

  await prisma.engagementConfirmation.update({
    where: { id: engagementId },
    data: { completionStatus: "AUTO_COMPLETED", completionConfirmedAt: eng.completionAutoAt },
  });

  // Send review reminder to client
  if (eng.client?.userId) {
    await createUserNotification({
      userId: eng.client.userId,
      type: "REVIEW_REMINDER",
      title: "请对律师服务进行评价",
      body: "您的委托已自动完成，请花 1 分钟为律师的服务进行评价。",
      linkUrl: `/marketplace/engagements/${engagementId}`,
    });
  }
  return true;
}
