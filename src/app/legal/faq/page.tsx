import type { Metadata } from "next";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "常见问题 FAQ | Law119 美国华人找律师",
  description:
    "Law119 平台常见问题解答 — 包括发案流程、律师报价、费用模式、隐私保护、CCPA权利等全面说明。",
  openGraph: {
    title: "常见问题 FAQ | Law119",
    description: "Law119 平台使用指南与常见问题全解。",
    type: "website",
  },
};

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  audience: string;
};

// Static fallback FAQs shown when DB is empty
const FALLBACK_FAQS: Omit<FaqItem, "id">[] = [
  {
    question: "Law119 是律师事务所吗？",
    answer:
      "不，Law119 是一个律师与客户对接平台（Legal Marketplace），我们帮助用户找到合适的律师，但不代理任何法律案件，也不提供具体法律意见。",
    category: "关于平台",
    audience: "GENERAL",
  },
  {
    question: "发布案件是否收费？",
    answer:
      "发布案件对客户完全免费。律师支付平台服务费以获得接触潜在客户的机会。具体收费标准请参见律师服务协议。",
    category: "费用说明",
    audience: "CLIENT",
  },
  {
    question: "我的个人信息安全吗？",
    answer:
      "是的。我们对所有数据进行加密存储与传输，严格遵守 CCPA（加州消费者隐私法）规定。您可随时申请查看、删除或导出您的个人数据，请发送邮件至 privacy@law119.com。",
    category: "隐私与安全",
    audience: "GENERAL",
  },
  {
    question: "律师是否经过资质审核？",
    answer:
      "平台对律师提交的执照信息进行核实（Bar Verification），并持续监控合规表现。但平台展示信息不构成对律师服务结果的保证，请您在选择律师前自行做尽职调查。",
    category: "律师资质",
    audience: "CLIENT",
  },
  {
    question: "如果对律师服务不满意怎么办？",
    answer:
      "您可以通过平台的争议中心（Dispute Center）提交投诉，我们将在 3 个工作日内响应。严重违规律师将被暂停或移除出平台。",
    category: "争议处理",
    audience: "CLIENT",
  },
  {
    question: "律师可以在哪些州执业？",
    answer:
      "每位律师在注册时需申报执照所在州（Bar State），并仅能在其持证州及跨州许可范围内接案。跨州执业的合规性由律师本人负责，平台核查信息仅供参考。",
    category: "律师资质",
    audience: "ATTORNEY",
  },
];

export default async function FaqPage() {
  // Fetch FAQs from DB, fallback to static list if empty
  const dbFaqs = await prisma.faqEntry
    .findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        audience: true,
      },
    })
    .catch(() => [] as FaqItem[]);

  const faqs: FaqItem[] =
    dbFaqs.length > 0
      ? dbFaqs
      : FALLBACK_FAQS.map((f, i) => ({ ...f, id: `fallback-${i}` }));

  // Group by category for display
  const categories = Array.from(new Set(faqs.map((f) => f.category ?? "其他")));

  // Build FAQPage JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <NavBar />

      {/* FAQPage JSON-LD for rich Google search results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-slate-50 pb-16">
        <div className="mx-auto max-w-3xl px-4 py-10">
          {/* Page header */}
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              帮助中心 / Help Center
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              常见问题 / Frequently Asked Questions
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              关于 Law119 平台的使用流程、律师资质、费用结构、隐私保护等问题的权威解答。
            </p>
          </div>

          {/* FAQ sections by category */}
          <div className="space-y-8">
            {categories.map((category) => {
              const categoryFaqs = faqs.filter(
                (f) => (f.category ?? "其他") === category,
              );
              return (
                <section key={category}>
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    {category}
                  </h2>
                  <div className="space-y-3">
                    {categoryFaqs.map((faq) => (
                      <details
                        key={faq.id}
                        className="group rounded-2xl border border-slate-200 bg-white shadow-sm open:shadow-md"
                      >
                        <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 group-open:rounded-b-none group-open:border-b group-open:border-slate-100">
                          <span>{faq.question}</span>
                          {/* Chevron that rotates when open */}
                          <svg
                            className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </summary>
                        <div className="px-5 py-4">
                          <p className="text-sm leading-7 text-slate-700">{faq.answer}</p>
                          {faq.audience !== "GENERAL" && (
                            <p className="mt-2 text-xs text-slate-400">
                              适用对象：
                              {faq.audience === "CLIENT" ? "客户" : "律师"}
                            </p>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Contact / further help */}
          <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="text-sm font-semibold text-amber-900">
              还有其他问题？/ Still have questions?
            </h3>
            <p className="mt-2 text-sm text-amber-800">
              请访问{" "}
              <Link
                href="/marketplace/support-center"
                className="font-medium underline hover:text-amber-600"
              >
                支持中心
              </Link>{" "}
              提交工单，或发送邮件至{" "}
              <a
                href="mailto:support@law119.com"
                className="font-medium underline hover:text-amber-600"
              >
                support@law119.com
              </a>
              。
            </p>
            <p className="mt-1 text-xs text-amber-700">
              We typically respond within 1–2 business days.
            </p>
          </div>

          {/* Cross-links to other legal pages */}
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-500">
            <Link href="/legal/privacy" className="hover:text-slate-800 hover:underline">
              隐私政策
            </Link>
            <span>·</span>
            <Link href="/legal/terms" className="hover:text-slate-800 hover:underline">
              服务条款
            </Link>
            <span>·</span>
            <Link href="/legal/attorney-terms" className="hover:text-slate-800 hover:underline">
              律师协议
            </Link>
            <span>·</span>
            <Link href="/marketplace/support-center" className="hover:text-slate-800 hover:underline">
              支持中心
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
