type MatchNotification = {
  attorneyEmail: string;
  attorneyName: string;
  caseId: string;
  category: string;
  zipCode: string;
};

export async function notifyMatchedAttorneys(notifications: MatchNotification[]) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !from) {
    await Promise.all(
      notifications.map(async (item) => {
        console.info(
          `[MockEmail] -> ${item.attorneyEmail} | ${item.attorneyName} | case=${item.caseId} | ${item.category} @ ${item.zipCode}`,
        );
      }),
    );
    return;
  }

  await Promise.all(
    notifications.map(async (item) => {
      const subject = `New ${item.category} case near ${item.zipCode} (Law119 - 美国华人119找律师网)`;
      const html = `<p>Hello ${item.attorneyName},</p>
<p>A new case in <strong>${item.category}</strong> was posted near ZIP <strong>${item.zipCode}</strong>.</p>
<p>Case ID: ${item.caseId}</p>
<p>Please sign in to Law119 (美国华人119找律师网) to respond.</p>`;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [item.attorneyEmail],
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`Resend email failed for ${item.attorneyEmail}: ${body}`);
      }
    }),
  );
}
