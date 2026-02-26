export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";

type VerificationStatus = "PENDING" | "VERIFIED" | "NEEDS_INFO" | "REJECTED";
type AttorneyReviewStatus =
  | "PENDING_REVIEW"
  | "NEEDS_INFO"
  | "APPROVED"
  | "REJECTED"
  | "RE_REVIEW_REQUIRED";

function getStatusColor(status: VerificationStatus | AttorneyReviewStatus) {
  switch (status) {
    case "VERIFIED":
    case "APPROVED":
      return "emerald";
    case "PENDING":
    case "PENDING_REVIEW":
      return "amber";
    case "NEEDS_INFO":
    case "RE_REVIEW_REQUIRED":
      return "yellow";
    case "REJECTED":
      return "rose";
    default:
      return "slate";
  }
}

function getStatusLabel(status: VerificationStatus | AttorneyReviewStatus): string {
  const labels: Record<string, string> = {
    PENDING: "待验证",
    VERIFIED: "已验证 ✅",
    NEEDS_INFO: "需要补充信息",
    REJECTED: "验证未通过",
    PENDING_REVIEW: "待审核",
    APPROVED: "审核通过 ✅",
    RE_REVIEW_REQUIRED: "需要重新审核",
  };
  return labels[status] ?? status;
}

export default async function VerificationPage() {
  let auth;
  try {
    auth = await requireAuthContext();
  } catch {
    redirect("/auth/sign-in?role=attorney");
  }

  // Only attorneys can view this page
  if (auth.role !== "ATTORNEY") {
    redirect("/");
  }

  const attorney = await prisma.attorneyProfile.findUnique({
    where: { userId: auth.authUserId },
    include: {
      specialties: { select: { category: true } },
      serviceAreas: { select: { stateCode: true } },
      verificationLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      reviewLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!attorney) {
    redirect("/attorney/onboarding");
  }

  const barStatusColor = getStatusColor(attorney.barVerificationStatus);
  const identityStatusColor = getStatusColor(attorney.identityVerificationStatus);
  const reviewStatusColor = getStatusColor(attorney.reviewStatus);

  const completenessPercent = attorney.profileCompletenessScore ?? 0;
  const isFullyVerified =
    attorney.barVerificationStatus === "VERIFIED" &&
    attorney.identityVerificationStatus === "VERIFIED" &&
    attorney.reviewStatus === "APPROVED";

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-3xl px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/attorney/dashboard" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-flex items-center gap-1">
              ← 返回律师后台
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">执照认证与审核状态</h1>
            <p className="text-slate-600">
              查看您的律师执照核验、身份验证和平台审核进度
            </p>
          </div>

          {/* Overall Status Card */}
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">
                  {isFullyVerified ? "✅ 认证完成" : "🔄 认证进行中"}
                </h2>
                <p className="text-slate-600 text-sm">
                  {isFullyVerified
                    ? "您已完成全部认证步骤，可以在平台上接案。"
                    : "完成以下步骤以解锁全部平台功能。"}
                </p>
              </div>
              {!isFullyVerified && (
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-slate-900">
                    {[attorney.barVerificationStatus, attorney.identityVerificationStatus, attorney.reviewStatus].filter(
                      (s) => s === "VERIFIED" || s === "APPROVED"
                    ).length}
                    /3
                  </p>
                  <p className="text-xs text-slate-600">步骤完成</p>
                </div>
              )}
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-5">认证检查清单</h2>

            <div className="space-y-5">
              {/* 1. Bar License Verification */}
              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50 hover:bg-white transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold ${
                        attorney.barVerificationStatus === "VERIFIED"
                          ? "bg-emerald-500"
                          : "bg-slate-400"
                      }`}
                    >
                      {attorney.barVerificationStatus === "VERIFIED" ? "✓" : "1"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">律师执照验证 (Bar License)</h3>
                      <p className="text-xs text-slate-600 mt-1">确认您的律师执照号和执业州</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white ${
                        attorney.barVerificationStatus === "VERIFIED"
                          ? "bg-emerald-500"
                          : attorney.barVerificationStatus === "NEEDS_INFO"
                          ? "bg-yellow-500"
                          : attorney.barVerificationStatus === "REJECTED"
                          ? "bg-rose-500"
                          : "bg-slate-400"
                      }`}
                    >
                      {getStatusLabel(attorney.barVerificationStatus)}
                    </span>
                  </div>
                </div>

                {attorney.barLicenseNumber && (
                  <div className="ml-11 space-y-2 text-sm text-slate-600">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">执照号</p>
                      <p className="font-mono text-slate-800">{attorney.barLicenseNumber}</p>
                    </div>
                    {attorney.barState && (
                      <div>
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">执业州</p>
                        <p className="font-mono text-slate-800">{attorney.barState}</p>
                      </div>
                    )}
                    {attorney.barVerifiedAt && (
                      <div>
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">验证时间</p>
                        <p>{new Date(attorney.barVerifiedAt).toLocaleDateString("zh-CN")}</p>
                      </div>
                    )}
                  </div>
                )}

                {attorney.barVerificationStatus === "NEEDS_INFO" && attorney.barVerificationNote && (
                  <div className="ml-11 mt-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                    <p className="text-xs font-semibold text-yellow-900 uppercase tracking-wide">需要补充的信息</p>
                    <p className="text-sm text-yellow-900 mt-1">{attorney.barVerificationNote}</p>
                  </div>
                )}

                {attorney.barVerificationStatus === "REJECTED" && attorney.barVerificationNote && (
                  <div className="ml-11 mt-3 rounded-lg bg-rose-50 border border-rose-200 p-3">
                    <p className="text-xs font-semibold text-rose-900 uppercase tracking-wide">验证未通过原因</p>
                    <p className="text-sm text-rose-900 mt-1">{attorney.barVerificationNote}</p>
                  </div>
                )}

                {attorney.barVerificationStatus !== "VERIFIED" && (
                  <div className="ml-11 mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-600 mb-2">
                      {attorney.barVerificationStatus === "PENDING"
                        ? "您在注册时提供的执照信息已提交，我们的团队将在 1-2 个工作日内核实。"
                        : attorney.barVerificationStatus === "NEEDS_INFO"
                        ? "请根据上述提示补充或更正您的执照信息。"
                        : "如有异议，请立即联系客服。"}
                    </p>
                    {attorney.barVerificationStatus === "NEEDS_INFO" && (
                      <Link
                        href="/attorney/onboarding"
                        className="text-xs text-amber-600 hover:text-amber-700 font-semibold inline-flex items-center gap-1"
                      >
                        更新资料 →
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Identity Verification */}
              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50 hover:bg-white transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold ${
                        attorney.identityVerificationStatus === "VERIFIED"
                          ? "bg-emerald-500"
                          : "bg-slate-400"
                      }`}
                    >
                      {attorney.identityVerificationStatus === "VERIFIED" ? "✓" : "2"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">身份验证 (Identity)</h3>
                      <p className="text-xs text-slate-600 mt-1">
                        通过护照、驾驶证或州身份证验证您的身份
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white ${
                        attorney.identityVerificationStatus === "VERIFIED"
                          ? "bg-emerald-500"
                          : attorney.identityVerificationStatus === "NEEDS_INFO"
                          ? "bg-yellow-500"
                          : attorney.identityVerificationStatus === "REJECTED"
                          ? "bg-rose-500"
                          : "bg-slate-400"
                      }`}
                    >
                      {getStatusLabel(attorney.identityVerificationStatus)}
                    </span>
                  </div>
                </div>

                {attorney.identityDocumentType && (
                  <div className="ml-11 space-y-2 text-sm text-slate-600">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">证件类型</p>
                      <p className="text-slate-800">
                        {attorney.identityDocumentType === "PASSPORT"
                          ? "护照 (Passport)"
                          : attorney.identityDocumentType === "DRIVER_LICENSE"
                          ? "驾驶证 (Driver License)"
                          : attorney.identityDocumentType === "STATE_ID"
                          ? "州身份证 (State ID)"
                          : "其他"}
                      </p>
                    </div>
                    {attorney.identityVerifiedAt && (
                      <div>
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">验证时间</p>
                        <p>{new Date(attorney.identityVerifiedAt).toLocaleDateString("zh-CN")}</p>
                      </div>
                    )}
                  </div>
                )}

                {attorney.identityVerificationStatus === "NEEDS_INFO" && attorney.identityVerificationNote && (
                  <div className="ml-11 mt-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                    <p className="text-xs font-semibold text-yellow-900 uppercase tracking-wide">需要补充的信息</p>
                    <p className="text-sm text-yellow-900 mt-1">{attorney.identityVerificationNote}</p>
                  </div>
                )}

                {attorney.identityVerificationStatus === "PENDING" && (
                  <div className="ml-11 mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-600">
                      您在注册时提供的身份证件已上传，我们的团队将在 1-2 个工作日内审核。
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Profile Review */}
              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50 hover:bg-white transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold ${
                        attorney.reviewStatus === "APPROVED"
                          ? "bg-emerald-500"
                          : "bg-slate-400"
                      }`}
                    >
                      {attorney.reviewStatus === "APPROVED" ? "✓" : "3"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">平台审核 (Profile Review)</h3>
                      <p className="text-xs text-slate-600 mt-1">
                        审核您的律师资料完整性和平台政策合规性
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white ${
                        attorney.reviewStatus === "APPROVED"
                          ? "bg-emerald-500"
                          : attorney.reviewStatus === "NEEDS_INFO" ||
                            attorney.reviewStatus === "RE_REVIEW_REQUIRED"
                          ? "bg-yellow-500"
                          : attorney.reviewStatus === "REJECTED"
                          ? "bg-rose-500"
                          : "bg-slate-400"
                      }`}
                    >
                      {getStatusLabel(attorney.reviewStatus)}
                    </span>
                  </div>
                </div>

                {/* Completeness score */}
                <div className="ml-11 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">资料完整度</p>
                    <p className="text-sm font-bold text-slate-900">{completenessPercent}%</p>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                      style={{ width: `${completenessPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {completenessPercent === 100
                      ? "资料已完整"
                      : `还需补充 ${100 - completenessPercent}% 的信息`}
                  </p>
                </div>

                {attorney.reviewStatus === "NEEDS_INFO" && attorney.reviewDecisionReason && (
                  <div className="ml-11 mt-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                    <p className="text-xs font-semibold text-yellow-900 uppercase tracking-wide">审核建议</p>
                    <p className="text-sm text-yellow-900 mt-1">{attorney.reviewDecisionReason}</p>
                  </div>
                )}

                {attorney.reviewStatus === "PENDING_REVIEW" && (
                  <div className="ml-11 mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-600">
                      您的资料已提交，我们的审核团队将在 1-2 个工作日内完成审核。
                    </p>
                  </div>
                )}

                {attorney.reviewStatus === "APPROVED" && (
                  <div className="ml-11 mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-emerald-700 font-semibold">
                      🎉 您的资料已通过审核，可以开始在平台上接案！
                    </p>
                  </div>
                )}

                {(attorney.reviewStatus === "NEEDS_INFO" || completenessPercent < 100) && (
                  <div className="ml-11 mt-3 pt-3 border-t border-slate-200">
                    <Link
                      href="/attorney/onboarding"
                      className="text-xs text-amber-600 hover:text-amber-700 font-semibold inline-flex items-center gap-1"
                    >
                      完成资料 →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {(attorney.verificationLogs.length > 0 || attorney.reviewLogs.length > 0) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-5">最近活动</h2>

              <div className="space-y-3">
                {attorney.verificationLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" />
                    <div>
                      <p className="text-slate-900">
                        <span className="font-semibold capitalize">{log.action}</span> - 验证日志
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(log.createdAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </div>
                ))}
                {attorney.reviewLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" />
                    <div>
                      <p className="text-slate-900">
                        <span className="font-semibold">平台审核</span> -{" "}
                        <span className="text-slate-600">{log.action}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(log.createdAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Support CTA */}
          <div className="mt-8 rounded-2xl bg-blue-50 border border-blue-200 p-6 text-center">
            <p className="text-slate-600 mb-4">对认证进度有任何疑问？</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="mailto:support@law119.com"
                className="inline-flex bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                📧 联系客服
              </a>
              <Link
                href="/attorney/dashboard"
                className="inline-flex border border-blue-300 text-blue-700 hover:bg-blue-100 font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                返回律师后台
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
