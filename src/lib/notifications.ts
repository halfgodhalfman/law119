import { prisma } from "./prisma";

type MatchNotification = {
  attorneyEmail: string;
  attorneyName: string;
  caseId: string;
  category: string;
  zipCode: string;
};

/** Internal helper: send a single email via Resend (or mock-log if keys are absent). */
async function sendEmail(params: { to: string; subject: string; html: string }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !from) {
    console.info(`[MockEmail] -> ${params.to} | subject: ${params.subject}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [params.to], subject: params.subject, html: params.html }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Resend email failed for ${params.to}: ${body}`);
  }
}

export async function notifyMatchedAttorneys(notifications: MatchNotification[]) {
  await Promise.all(
    notifications.map(async (item) => {
      const subject = `New ${item.category} case near ${item.zipCode} (Law119 - 美国华人119找律师网)`;
      const html = `<p>Hello ${item.attorneyName},</p>
<p>A new case in <strong>${item.category}</strong> was posted near ZIP <strong>${item.zipCode}</strong>.</p>
<p>Case ID: ${item.caseId}</p>
<p>Please sign in to Law119 (美国华人119找律师网) to respond.</p>`;
      await sendEmail({ to: item.attorneyEmail, subject, html });
    }),
  );
}

// ─── Bid Notification ────────────────────────────────────────────────────────

type BidNotificationParams = {
  caseId: string;
  bidId: string;
  feeQuoteMin: number | null;
  feeQuoteMax: number | null;
  attorneyProfileId: string;
};

/**
 * Notify the case client that an attorney submitted a bid.
 * - For logged-in clients: creates an in-app UserNotification.
 * - For anonymous clients with a contactEmail: sends an email.
 */
export async function notifyClientAboutBid(params: BidNotificationParams) {
  const legalCase = await prisma.case
    .findUnique({
      where: { id: params.caseId },
      select: {
        title: true,
        contactEmail: true,
        client: { select: { userId: true } },
      },
    })
    .catch(() => null);

  if (!legalCase) return;

  const attorney = await prisma.attorneyProfile
    .findUnique({
      where: { id: params.attorneyProfileId },
      select: { firstName: true, lastName: true },
    })
    .catch(() => null);

  const attorneyName =
    [attorney?.firstName, attorney?.lastName].filter(Boolean).join(" ") || "一位律师";

  const priceStr =
    params.feeQuoteMin != null
      ? `$${params.feeQuoteMin}${params.feeQuoteMax != null ? ` – $${params.feeQuoteMax}` : "+"}`
      : "";

  // 1. In-app notification for logged-in clients
  const userId = legalCase.client?.userId;
  if (userId) {
    await prisma.userNotification
      .create({
        data: {
          userId,
          type: "SYSTEM_NOTICE",
          title: "收到新报价 / New Bid Received",
          body: `${attorneyName} 向您的案件提交了报价${priceStr ? `（${priceStr}）` : ""}，请登录查看详情。`,
          linkUrl: `/marketplace/my-cases`,
        },
      })
      .catch((e: unknown) => console.error("Failed to create bid notification:", e));
  }

  // 2. Email notification for anonymous clients with a contactEmail
  if (!userId && legalCase.contactEmail) {
    await sendEmail({
      to: legalCase.contactEmail,
      subject: `您的案件收到新报价 / New bid on your Law119 case`,
      html: `<p>您好，</p>
<p>您在 Law119（美国华人119找律师网）发布的案件「${legalCase.title}」收到了${priceStr ? ` ${priceStr} 的` : ""}报价。</p>
<p>律师：${attorneyName}</p>
<p>查看案件状态（无需登录）：<a href="https://law119.com/case/track/${params.caseId}">点击此处</a></p>
<p>如需查看完整报价详情，请登录平台：<a href="https://law119.com/auth/sign-in?role=client">登录</a></p>
<p>---</p>
<p>Law119 is not a law firm and does not provide legal advice.</p>`,
    });
  }
}
