import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import { requireAuthContext } from "../../../lib/auth-context";
import { NavBar } from "../../../components/ui/nav-bar";
import { AttorneyTabs } from "../../../components/attorney/attorney-tabs";
import { CheckCircleIcon, ExclamationTriangleIcon, LockClosedIcon, DocumentTextIcon } from "../../../components/ui/icons";

function fmtDate(dt: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(dt);
}

export default async function AttorneyWorkflowPage() {
  const auth = await requireAuthContext().catch(() => null);
  if (!auth || auth.role !== "ATTORNEY" || !auth.attorneyProfileId) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <LockClosedIcon className="mx-auto h-8 w-8 text-rose-600" />
            <p className="mt-3 text-sm text-slate-700">请以律师身份登录后访问工作流中心。</p>
          </div>
        </main>
      </>
    );
  }

  const [reminders, checklist, tags, conversations] = await Promise.all([
    prisma.attorneyFollowUpReminder.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId, status: "OPEN" },
      include: {
        conversation: { select: { id: true, case: { select: { id: true, title: true, category: true } } } },
      },
      orderBy: [{ dueAt: "asc" }],
      take: 30,
    }),
    prisma.conversationChecklistItem.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId, completed: false },
      include: {
        conversation: { select: { id: true, case: { select: { id: true, title: true, category: true } } } },
      },
      orderBy: [{ required: "desc" }, { updatedAt: "desc" }],
      take: 40,
    }),
    prisma.conversationTag.groupBy({
      by: ["tag"],
      where: { attorneyProfileId: auth.attorneyProfileId },
      _count: { _all: true },
    }),
    prisma.conversation.findMany({
      where: { attorneyProfileId: auth.attorneyProfileId, status: "OPEN" },
      include: {
        case: { select: { id: true, title: true, category: true } },
        followUpReminders: { where: { status: "OPEN" }, select: { id: true } },
        checklistItems: { where: { completed: false }, select: { id: true, required: true } },
        tags: { select: { tag: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 15,
    }),
  ]);

  const overdueReminders = reminders.filter((r) => r.dueAt.getTime() < Date.now());
  const requiredChecklistCount = checklist.filter((c) => c.required).length;
  const tagMap = new Map(tags.map((t) => [t.tag, t._count._all]));

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <AttorneyTabs />
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Workflow Center</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">工作流（待办 / 提醒 / 补件）</h1>
              <p className="mt-2 text-sm text-slate-500">集中处理律师跟进任务、补件清单与会话标签，形成稳定接案流程。</p>
            </div>
            <div className="flex gap-2">
              <Link href="/attorney/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">返回总览</Link>
              <Link href="/marketplace/my-bids" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">我的报价</Link>
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">开放提醒</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{reminders.length}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
              <p className="text-xs text-rose-700">逾期提醒</p>
              <p className="mt-1 text-2xl font-bold text-rose-900">{overdueReminders.length}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
              <p className="text-xs text-indigo-700">待补件（必需）</p>
              <p className="mt-1 text-2xl font-bold text-indigo-900">{requiredChecklistCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">高风险标签会话</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{tagMap.get("HIGH_RISK") ?? 0}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
                跟进提醒
              </h2>
              <div className="space-y-3">
                {reminders.map((r) => (
                  <div key={r.id} className={`rounded-xl border p-3 ${r.dueAt.getTime() < Date.now() ? "border-rose-200 bg-rose-50" : "border-slate-200"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                      {r.dueAt.getTime() < Date.now() && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] text-rose-700">已逾期</span>}
                      <span className="ml-auto text-xs text-slate-500">截止 {fmtDate(r.dueAt)}</span>
                    </div>
                    {r.note && <p className="mt-1 text-xs text-slate-600">{r.note}</p>}
                    <div className="mt-2 flex gap-2 text-xs">
                      <Link href={`/chat/${r.conversation.id}`} className="underline">打开会话</Link>
                      <Link href={`/marketplace/conversations/${r.conversation.id}/workflow`} className="underline">工作流详情</Link>
                    </div>
                  </div>
                ))}
                {reminders.length === 0 && <p className="text-sm text-slate-500">暂无开放提醒。</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <DocumentTextIcon className="h-4 w-4 text-indigo-600" />
                补件清单
              </h2>
              <div className="space-y-3">
                {checklist.map((c) => (
                  <div key={c.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{c.title}</p>
                      {c.required && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">必需</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.conversation.case.title || c.conversation.case.category} · 会话 {c.conversation.id}
                    </p>
                    {c.note && <p className="mt-1 text-xs text-slate-600">{c.note}</p>}
                    <div className="mt-2 flex gap-2 text-xs">
                      <Link href={`/chat/${c.conversation.id}`} className="underline">打开会话</Link>
                      <Link href={`/marketplace/conversations/${c.conversation.id}/workflow`} className="underline">处理补件</Link>
                    </div>
                  </div>
                ))}
                {checklist.length === 0 && <p className="text-sm text-slate-500">暂无未完成补件清单。</p>}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
              会话工作流概览
            </h2>
            <div className="grid gap-3">
              {conversations.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{c.case.title || `${c.case.category} case`}</p>
                    {c.tags.map((t) => (
                      <span key={t.tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{t.tag}</span>
                    ))}
                    <span className="ml-auto text-xs text-slate-500">
                      提醒 {c.followUpReminders.length} · 补件 {c.checklistItems.length}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Link href={`/marketplace/conversations/${c.id}/workflow`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50">
                      打开工作流
                    </Link>
                    <Link href={`/chat/${c.id}`} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                      打开聊天
                    </Link>
                  </div>
                </div>
              ))}
              {conversations.length === 0 && <p className="text-sm text-slate-500">暂无进行中的会话工作流。</p>}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
