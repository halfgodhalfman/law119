"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { ClientTabs } from "@/components/client/client-tabs";

type ReportItem = {
  id: string;
  conversationId: string;
  category: string;
  status: string;
  details: string | null;
  reportedMessageExcerpt: string | null;
  adminNote: string | null;
  handledAt: string | null;
  createdAt: string;
  conversation?: { caseId: string; case?: { title?: string | null } | null } | null;
  attachments?: Array<{ id: string; fileName: string | null; url: string }>;
};

type DisputeItem = {
  id: string;
  status: string;
  priority: string;
  category: string;
  title: string;
  conversationId: string | null;
  caseId: string | null;
  slaDueAt: string | null;
  firstResponseAt: string | null;
  updatedAt: string;
  createdAt: string;
};

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
};

const FALLBACK_FAQS: FaqItem[] = [
  { id: "f1", question: "如何投诉律师或会话中的不当行为？", answer: '进入对应聊天页面，点击「举报」或「举报此消息」，平台会保留证据快照并进入审核流程。', category: null },
  { id: "f2", question: "什么时候应该发起争议工单？", answer: "涉及服务范围争议、收费/退款争议、沟通长期停滞、里程碑释放争议时，建议发起争议工单由平台介入。", category: null },
  { id: "f3", question: "平台可以直接提供法律意见吗？", answer: "平台提供撮合与运营支持，不构成法律意见。具体法律建议应由持证律师在正式委托关系下提供。", category: null },
];

export default function ClientSupportCenterPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>(FALLBACK_FAQS);
  const [reportStatus, setReportStatus] = useState("");
  const [disputeStatus, setDisputeStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const reportParams = new URLSearchParams();
      if (reportStatus) reportParams.set("status", reportStatus);
      const disputeParams = new URLSearchParams();
      if (disputeStatus) disputeParams.set("status", disputeStatus);

      const [r1, r2, r3, r4] = await Promise.all([
        fetch(`/api/marketplace/reports?${reportParams.toString()}`, { cache: "no-store" }),
        fetch(`/api/marketplace/disputes?${disputeParams.toString()}`, { cache: "no-store" }),
        fetch("/api/marketplace/support-tickets", { cache: "no-store" }),
        fetch("/api/faqs?audience=CLIENT", { cache: "no-store" }),
      ]);
      const [j1, j2, j3, j4] = await Promise.all([
        r1.json().catch(() => ({})),
        r2.json().catch(() => ({})),
        r3.json().catch(() => ({})),
        r4.json().catch(() => ({ faqs: [] })),
      ]);
      if (!r1.ok || !r2.ok || !r3.ok) {
        setError(j1.error || j2.error || j3.error || "加载支持中心失败");
        setLoading(false);
        return;
      }
      setReports(j1.items ?? []);
      setDisputes(j2.items ?? []);
      setSupportTickets(j3.items ?? []);
      if (Array.isArray(j4.faqs) && j4.faqs.length > 0) {
        setFaqs(j4.faqs as FaqItem[]);
      }
      setError(null);
      setLoading(false);
    };
    void load();
  }, [reportStatus, disputeStatus]);

  const reportPending = reports.filter((r) => ["PENDING", "REVIEWING"].includes(r.status)).length;
  const disputeInProgress = disputes.filter((d) => ["OPEN", "UNDER_REVIEW", "WAITING_PARTY"].includes(d.status)).length;
  const disputeNeedReply = disputes.filter((d) => d.status === "WAITING_PARTY").length;
  const supportOpen = supportTickets.filter((t) => !["RESOLVED", "CLOSED"].includes(t.status)).length;

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <ClientTabs />
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Client Support Center</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">客户支持中心</h1>
              <p className="mt-2 text-sm text-slate-500">统一查看举报记录、争议工单、常见问题，并快速联系平台处理。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/marketplace/client-center" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">返回客户后台</Link>
              <Link href="/marketplace/disputes" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">新建争议工单</Link>
            </div>
          </div>

          <section className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">举报处理中</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{reportPending}</p>
              <p className="text-xs text-slate-500">会话中可继续举报消息或对方行为</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">争议处理中</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{disputeInProgress}</p>
              <p className="text-xs text-slate-500">涉及服务范围、沟通、支付/退款等问题</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">待我补充</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{disputeNeedReply}</p>
              <p className="text-xs text-slate-500">平台正在等待你补充材料或说明</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">客服消息单处理中</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{supportOpen}</p>
              <p className="text-xs text-slate-500">非争议问题可通过站内工单联系平台</p>
            </div>
          </section>

          {loading && <p className="text-sm text-slate-500">加载中...</p>}
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">举报记录</h2>
                <div className="flex items-center gap-2">
                  <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">全部状态</option>
                    {["PENDING","REVIEWING","RESOLVED","REJECTED"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                {reports.slice(0, 20).map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{r.status}</span>
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">{r.category}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">举报时间：{new Date(r.createdAt).toLocaleString()}</p>
                    {r.conversation?.case?.title && <p className="mt-1 text-sm font-medium text-slate-900">{r.conversation.case.title}</p>}
                    {r.reportedMessageExcerpt && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                        被举报消息摘要：{r.reportedMessageExcerpt}
                      </div>
                    )}
                    {r.details && <p className="mt-2 line-clamp-2 text-xs text-slate-600">{r.details}</p>}
                    {r.adminNote && (
                      <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
                        平台处理说明：{r.adminNote}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {r.conversationId && <Link href={`/chat/${r.conversationId}`} className="underline">打开会话</Link>}
                      {r.conversation?.caseId && <Link href={`/marketplace/cases/${r.conversation.caseId}`} className="underline">案件详情</Link>}
                    </div>
                  </div>
                ))}
                {!reports.length && <p className="text-sm text-slate-500">暂无举报记录。</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">争议工单</h2>
                <div className="flex items-center gap-2">
                  <select value={disputeStatus} onChange={(e) => setDisputeStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">全部状态</option>
                    {["OPEN","UNDER_REVIEW","WAITING_PARTY","RESOLVED","CLOSED"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Link href="/marketplace/disputes" className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">工单列表</Link>
                </div>
              </div>
              <div className="space-y-3">
                {disputes.slice(0, 20).map((t) => (
                  <div key={t.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{t.status}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">{t.priority}</span>
                      {t.status === "WAITING_PARTY" && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">待我补充</span>}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{t.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{t.category} · 更新时间 {new Date(t.updatedAt).toLocaleString()}</p>
                    {t.slaDueAt && <p className="mt-1 text-xs text-slate-500">SLA 截止：{new Date(t.slaDueAt).toLocaleString()}</p>}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Link href={`/marketplace/disputes/${t.id}`} className="underline">查看工单详情</Link>
                      {t.conversationId && <Link href={`/chat/${t.conversationId}`} className="underline">相关会话</Link>}
                    </div>
                  </div>
                ))}
                {!disputes.length && <p className="text-sm text-slate-500">暂无争议工单。</p>}
              </div>
            </section>
          </div>

          <section className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">客服消息单（最近更新）</h2>
                <Link href="/marketplace/support-tickets" className="text-sm underline">查看全部客服消息单</Link>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {supportTickets.slice(0, 4).map((t: any) => (
                  <div key={t.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{t.status}</span>
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700">{t.category}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{t.subject}</p>
                    <p className="mt-1 text-xs text-slate-500">更新时间：{new Date(t.updatedAt).toLocaleString()}</p>
                    {t.slaDueAt && <p className="mt-1 text-xs text-amber-700">SLA 截止：{new Date(t.slaDueAt).toLocaleString()}</p>}
                    <div className="mt-2 text-xs">
                      <Link href={`/marketplace/support-tickets/${t.id}`} className="underline">打开客服消息单</Link>
                    </div>
                  </div>
                ))}
                {!supportTickets.length && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 md:col-span-2">
                    暂无客服消息单，你可以在这里向平台提交账号、账单、流程咨询等非争议问题。
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">常见问题（FAQ）</h2>
              <div className="mt-3 space-y-3 text-sm">
                {faqs.slice(0, 6).map((faq) => (
                  <div key={faq.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="font-medium text-slate-900">{faq.question}</p>
                    <p className="mt-1 text-slate-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">联系平台（客服 / 管理员入口）</h2>
              <div className="mt-3 space-y-3 text-sm">
                <Link href="/marketplace/support-tickets" className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                  <p className="font-medium text-slate-900">站内联系客服消息单（非争议场景）</p>
                  <p className="mt-1 text-slate-600">账号、账单、流程咨询、平台反馈等问题，建议使用客服消息单持续跟进。</p>
                </Link>
                <Link href="/marketplace/disputes" className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                  <p className="font-medium text-slate-900">提交争议工单（推荐）</p>
                  <p className="mt-1 text-slate-600">适用于需要平台人工介入、跟进和留痕处理的问题。</p>
                </Link>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">会话内举报</p>
                  <p className="mt-1 text-slate-600">如果问题发生在聊天过程中（骚扰/诈骗/威胁/隐私泄露），请在聊天页直接使用举报功能并上传证据。</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-900">
                  <p className="font-medium">平台处理提示</p>
                  <p className="mt-1 text-sm">举报与争议工单的处理进度会显示在本页面；如状态为"待我补充"，请尽快补充材料以避免延误。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/marketplace/client-conversations" className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-white">我的会话</Link>
                  <Link href="/marketplace/client-center" className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-white">客户后台</Link>
                  <Link href="/marketplace/support-tickets" className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-white">客服消息单</Link>
                  <Link href="/marketplace/notifications" className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-white">平台通知中心</Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
