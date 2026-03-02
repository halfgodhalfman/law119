export const dynamic = "force-dynamic";

/**
 * Docuseal Webhook 处理器
 *
 * 在 Docuseal Dashboard > Settings > Webhooks 配置：
 * URL: https://www.law119.com/api/webhooks/docuseal
 * Secret: 与 DOCUSEAL_WEBHOOK_SECRET 环境变量一致
 * Events: form.completed, submission.completed
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import {
  verifyWebhookSignature,
  downloadSignedPdf,
  type DocusealWebhookEvent,
} from "@/lib/docuseal";
import { createUserNotification } from "@/lib/user-notifications";

const BUCKET = "engagement-signatures";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  // ── HMAC 验证 ────────────────────────────────────────────────────────────
  const webhookSecret = process.env.DOCUSEAL_WEBHOOK_SECRET ?? "";
  const signature = request.headers.get("x-docuseal-signature") ?? "";

  if (webhookSecret) {
    // 如果配置了 secret，则强制校验
    if (!verifyWebhookSignature(rawBody, webhookSecret, signature)) {
      console.warn("Docuseal webhook signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    // 开发环境可暂时不配置 secret（生产必须配置）
    console.warn("DOCUSEAL_WEBHOOK_SECRET not set — skipping HMAC check (dev mode)");
  }

  // ── 解析事件 ──────────────────────────────────────────────────────────────
  let event: DocusealWebhookEvent;
  try {
    event = JSON.parse(rawBody) as DocusealWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event_type, data } = event;

  // ── 处理「单人签名完成」事件 ───────────────────────────────────────────────
  if (event_type === "form.completed") {
    // data.submission_id = submissionId, data.role = 签署方角色
    const submissionId = String(data.submission_id ?? data.id);
    const role = (data.role ?? "").toLowerCase(); // "attorney" | "client"
    const completedAt = data.completed_at ? new Date(data.completed_at) : new Date();

    const sig = await prisma.engagementSignature.findFirst({
      where: { submissionId },
    });

    if (!sig) {
      console.log(`No EngagementSignature found for submissionId ${submissionId}`);
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (role === "attorney") {
      await prisma.engagementSignature.update({
        where: { id: sig.id },
        data: {
          attorneySignedAt: completedAt,
          status: "AWAITING_CLIENT",
        },
      });

      // 通知客户现在可以签名
      const engagement = await prisma.engagementConfirmation.findUnique({
        where: { id: sig.engagementId },
        select: { client: { select: { userId: true } }, caseId: true },
      });
      if (engagement?.client?.userId) {
        await createUserNotification({
          userId: engagement.client.userId,
          type: "ENGAGEMENT_UPDATE",
          title: "聘用协议待您签署",
          body: "律师已完成签名，请登录 Law119 查看并签署聘用协议以激活服务。",
          linkUrl: `/marketplace/engagements/${sig.engagementId}`,
        }).catch(console.warn);
      }

    } else if (role === "client") {
      await prisma.engagementSignature.update({
        where: { id: sig.id },
        data: { clientSignedAt: completedAt },
      });
    }

    return NextResponse.json({ ok: true, handled: "form.completed", role });
  }

  // ── 处理「全部签名完成」事件 ──────────────────────────────────────────────
  if (event_type === "submission.completed") {
    const submissionId = String(data.id);

    const sig = await prisma.engagementSignature.findFirst({
      where: { submissionId },
      include: {
        engagement: {
          select: {
            id: true,
            caseId: true,
            attorney: { select: { userId: true } },
            client: { select: { userId: true } },
          },
        },
      },
    });

    if (!sig) {
      console.log(`No EngagementSignature found for submissionId ${submissionId}`);
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (sig.status === "COMPLETED") {
      return NextResponse.json({ ok: true, skipped: "already completed" });
    }

    // ── 下载签名 PDF ──────────────────────────────────────────────────────
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await downloadSignedPdf(submissionId);
    } catch (e) {
      console.error("Failed to download signed PDF:", e);
      // 不因 PDF 下载失败而阻断流程，继续激活 engagement
    }

    // ── 上传 PDF 到 Supabase Storage ──────────────────────────────────────
    let signedPdfUrl: string | null = null;
    let signedPdfStoragePath: string | null = null;

    if (pdfBuffer) {
      const supabase = getSupabase();
      const storagePath = `${sig.engagementId}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase PDF upload error:", uploadError.message);
      } else {
        // 生成 10 年有效的签名 URL（合同存档不应频繁失效）
        const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
        const { data: urlData, error: urlError } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(storagePath, TEN_YEARS);

        if (!urlError && urlData?.signedUrl) {
          signedPdfUrl = urlData.signedUrl;
          signedPdfStoragePath = storagePath;
        }
      }
    }

    const now = new Date();

    // ── 更新签名记录 ────────────────────────────────────────────────────────
    await prisma.engagementSignature.update({
      where: { id: sig.id },
      data: {
        status: "COMPLETED",
        completedAt: now,
        signedPdfStoragePath,
        signedPdfUrl,
        // 确保时间戳都有值
        clientSignedAt: sig.clientSignedAt ?? now,
        attorneySignedAt: sig.attorneySignedAt ?? now,
      },
    });

    // ── 激活 EngagementConfirmation ────────────────────────────────────────
    await prisma.engagementConfirmation.update({
      where: { id: sig.engagementId },
      data: {
        status: "ACTIVE",
        clientConfirmedAt: now,
      },
    });

    // ── 通知双方协议已激活 ────────────────────────────────────────────────
    const eng = sig.engagement;
    const notifPayload = {
      type: "ENGAGEMENT_UPDATE" as const,
      title: "聘用协议已激活 ✅",
      body: "双方均已完成电子签名，聘用协议正式生效，可开始服务。",
      linkUrl: `/marketplace/engagements/${eng.id}`,
    };

    const notifications: Promise<unknown>[] = [];
    if (eng.attorney?.userId) {
      notifications.push(createUserNotification({ userId: eng.attorney.userId, ...notifPayload }).catch(console.warn));
    }
    if (eng.client?.userId) {
      notifications.push(createUserNotification({ userId: eng.client.userId, ...notifPayload }).catch(console.warn));
    }
    await Promise.all(notifications);

    return NextResponse.json({
      ok: true,
      handled: "submission.completed",
      engagementId: sig.engagementId,
      pdfUploaded: !!signedPdfUrl,
    });
  }

  // 其他事件（form.viewed 等）直接忽略
  return NextResponse.json({ ok: true, ignored: event_type });
}
