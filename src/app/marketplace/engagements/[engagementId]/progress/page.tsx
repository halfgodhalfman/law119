export const dynamic = "force-dynamic";
// @ts-nocheck
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProgressPage({ params }: { params: Promise<{ engagementId: string }> }) {
  const { engagementId } = await params;
  let auth;
  try { auth = await requireAuthContext(); } catch { redirect("/auth/login"); }

  const eng = await prisma.engagementConfirmation.findUnique({
    where: { id: engagementId },
    include: {
      serviceStages: { orderBy: { sortOrder: "asc" } },
      case: { select: { title: true, category: true } },
      attorney: { select: { userId: true, firstName: true, lastName: true } },
      client: { select: { userId: true, firstName: true, lastName: true } },
    },
  });
  if (!eng) redirect("/marketplace");

  const isAttorney = auth.role === "ATTORNEY" && auth.attorneyProfileId === eng.attorneyProfileId;
  const isClient = auth.role === "CLIENT" && auth.clientProfileId === eng.clientProfileId;
  const isAdmin = auth.role === "ADMIN";
  if (!isAttorney && !isClient && !isAdmin) redirect("/marketplace");

  const stages = eng.serviceStages;
  const total = stages.length;
  const completed = stages.filter(s => s.status === "COMPLETED").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href={`/marketplace/engagements/${engagementId}`} className="text-sm text-blue-600 hover:underline">&larr; 返回委托详情</Link>
        <h1 className="mt-2 text-2xl font-bold">服务进度</h1>
        <p className="text-sm text-gray-500">{eng.case?.title} · {eng.case?.category}</p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-1 flex justify-between text-sm">
          <span>完成 {completed}/{total} 阶段</span>
          <span className="font-medium">{percent}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* Stage timeline */}
      {stages.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
          <p>尚未初始化服务阶段</p>
          {isAttorney && (
            <form action={`/api/marketplace/engagements/${engagementId}/stages`} method="POST">
              <input type="hidden" name="action" value="init_from_template" />
              <button type="submit" className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">从模板初始化阶段</button>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {stages.map((stage, i) => {
            const statusColors: Record<string, string> = { NOT_STARTED: "bg-gray-200 text-gray-600", IN_PROGRESS: "bg-blue-100 text-blue-700", COMPLETED: "bg-green-100 text-green-700", SKIPPED: "bg-yellow-100 text-yellow-700" };
            const statusLabels: Record<string, string> = { NOT_STARTED: "未开始", IN_PROGRESS: "进行中", COMPLETED: "已完成", SKIPPED: "已跳过" };
            const dotColors: Record<string, string> = { NOT_STARTED: "bg-gray-400", IN_PROGRESS: "bg-blue-500", COMPLETED: "bg-green-500", SKIPPED: "bg-yellow-500" };
            return (
              <div key={stage.id} className="relative flex gap-4">
                {/* Timeline line */}
                {i < stages.length - 1 && <div className="absolute left-[15px] top-8 h-full w-0.5 bg-gray-200" />}
                {/* Dot */}
                <div className={`mt-1 h-8 w-8 flex-shrink-0 rounded-full ${dotColors[stage.status]} flex items-center justify-center text-white text-xs font-bold`}>{i + 1}</div>
                {/* Content */}
                <div className="flex-1 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{stage.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[stage.status]}`}>{statusLabels[stage.status]}</span>
                  </div>
                  {stage.description && <p className="mt-1 text-sm text-gray-500">{stage.description}</p>}
                  {stage.note && <p className="mt-1 text-sm italic text-gray-600">备注: {stage.note}</p>}
                  <div className="mt-2 flex gap-2 text-xs text-gray-400">
                    {stage.startedAt && <span>开始: {new Date(stage.startedAt).toLocaleDateString("zh-CN")}</span>}
                    {stage.completedAt && <span>完成: {new Date(stage.completedAt).toLocaleDateString("zh-CN")}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion section */}
      {eng.status === "ACTIVE" && eng.completionStatus === "NONE" && isAttorney && (
        <div className="mt-8 rounded-lg border-2 border-dashed border-blue-300 p-6 text-center">
          <p className="mb-2 text-sm text-gray-600">所有阶段完成后，可以提交完成确认</p>
          <p className="text-xs text-gray-400 mb-4">提交后客户有 7 天时间确认，逾期自动完成</p>
        </div>
      )}
      {eng.completionStatus === "REQUESTED_BY_ATTORNEY" && (
        <div className="mt-8 rounded-lg border-2 border-yellow-300 bg-yellow-50 p-6 text-center">
          <p className="font-medium text-yellow-800">等待客户确认完成</p>
          {eng.completionAutoAt && <p className="text-sm text-yellow-600">自动完成时间: {new Date(eng.completionAutoAt).toLocaleString("zh-CN")}</p>}
        </div>
      )}
      {(eng.completionStatus === "CONFIRMED_BY_CLIENT" || eng.completionStatus === "AUTO_COMPLETED") && (
        <div className="mt-8 rounded-lg border-2 border-green-300 bg-green-50 p-6 text-center">
          <p className="font-medium text-green-800">服务已完成</p>
          {eng.completionConfirmedAt && <p className="text-sm text-green-600">完成时间: {new Date(eng.completionConfirmedAt).toLocaleString("zh-CN")}</p>}
        </div>
      )}
    </div>
  );
}
