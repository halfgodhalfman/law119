export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import { QaAnswerCard } from "@/components/qa/qa-answer-card";
import { QaAnswerForm } from "@/components/qa/qa-answer-form";
import { QaAttorneyCta } from "@/components/qa/qa-attorney-cta";
import { CATEGORY_MAP } from "@/lib/legal-categories";
import { requireAuthContext } from "@/lib/auth-context";

interface Props {
  params: Promise<{ questionId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { questionId } = await params;
  const q = await prisma.qaQuestion.findFirst({
    where: { id: questionId, status: "PUBLISHED" },
    select: { title: true, body: true, category: true, stateCode: true },
  });
  if (!q) return { title: "问题未找到" };
  const cat = CATEGORY_MAP[q.category as keyof typeof CATEGORY_MAP];
  const stateStr = q.stateCode ? `${q.stateCode} ` : "";
  const catName = cat?.nameZh ?? "";
  return {
    title: `${q.title} | ${stateStr}${catName}法律问答`,
    description: q.body.slice(0, 160),
    alternates: { canonical: `https://www.law119.com/qa/${questionId}` },
    openGraph: {
      title: q.title,
      description: q.body.slice(0, 160),
      type: "article",
    },
  };
}

export default async function QaQuestionDetailPage({ params }: Props) {
  const { questionId } = await params;

  const question = await prisma.qaQuestion.findFirst({
    where: { id: questionId, status: "PUBLISHED" },
    select: {
      id: true, slug: true, title: true, body: true, category: true,
      stateCode: true, preferredLanguage: true, authorName: true,
      viewCount: true, answerCount: true, acceptedAnswerId: true,
      authorUserId: true, createdAt: true,
      answers: {
        where: { status: "PUBLISHED" },
        orderBy: [{ isAccepted: "desc" }, { voteCount: "desc" }, { createdAt: "asc" }],
        select: {
          id: true, body: true, voteCount: true, isAccepted: true,
          createdAt: true, authorUserId: true,
          attorney: {
            select: {
              id: true, firstName: true, lastName: true, avatarUrl: true,
              isVerified: true, firmName: true,
              specialties: { select: { category: true } },
              serviceAreas: { select: { stateCode: true }, take: 5 },
            },
          },
        },
      },
    },
  });

  if (!question) notFound();

  // 异步增加浏览量
  void prisma.qaQuestion
    .update({ where: { id: question.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => null);

  // 获取当前用户
  const auth = await requireAuthContext().catch(() => null);
  const viewerUserId = auth?.authUserId ?? null;

  // 匹配专长律师（同领域 + 同州优先）用于 CTA
  const matchedAttorneys = await prisma.attorneyProfile.findMany({
    where: {
      reviewStatus: "APPROVED",
      isVerified: true,
      specialties: { some: { category: question.category as never } },
      ...(question.stateCode
        ? { serviceAreas: { some: { stateCode: question.stateCode } } }
        : {}),
    },
    take: 3,
    orderBy: { profileCompletenessScore: "desc" },
    select: {
      id: true, firstName: true, lastName: true, avatarUrl: true,
      firmName: true, isVerified: true, yearsExperience: true,
      specialties: { select: { category: true }, take: 3 },
    },
  });

  const cat = CATEGORY_MAP[question.category as keyof typeof CATEGORY_MAP];

  // JSON-LD 结构化数据
  const acceptedAnswer = question.answers.find((a) => a.isAccepted);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: question.title,
      text: question.body,
      dateCreated: question.createdAt.toISOString(),
      answerCount: question.answers.length,
      ...(acceptedAnswer
        ? {
            acceptedAnswer: {
              "@type": "Answer",
              text: acceptedAnswer.body,
              upvoteCount: acceptedAnswer.voteCount,
              dateCreated: acceptedAnswer.createdAt.toISOString(),
            },
          }
        : {}),
      suggestedAnswer: question.answers
        .filter((a) => !a.isAccepted)
        .map((a) => ({
          "@type": "Answer",
          text: a.body,
          upvoteCount: a.voteCount,
        })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NavBar />
      <main className="min-h-screen bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* 面包屑 */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
            <Link href="/qa" className="hover:text-amber-400 transition-colors">
              法律问答
            </Link>
            <span>/</span>
            {cat && (
              <>
                <Link
                  href={`/qa/category/${question.category.toLowerCase()}`}
                  className="hover:text-amber-400 transition-colors"
                >
                  {cat.emoji} {cat.nameZh}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-slate-400 truncate max-w-xs">{question.title}</span>
          </nav>

          {/* 问题主体 */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {cat && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                  {cat.emoji} {cat.nameZh}
                </span>
              )}
              {question.stateCode && (
                <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-400">
                  {question.stateCode}
                </span>
              )}
              {question.acceptedAnswerId && (
                <span className="text-xs px-2 py-1 rounded-full bg-green-900/50 text-green-400 border border-green-600/30">
                  ✓ 已解决
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-white mb-4">{question.title}</h1>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {question.body}
            </p>

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-700 text-xs text-slate-500">
              <span>提问者：{question.authorName}</span>
              <span>·</span>
              <span>{new Date(question.createdAt).toLocaleDateString("zh-CN")}</span>
              <span>·</span>
              <span>{question.viewCount} 次浏览</span>
            </div>
          </div>

          {/* 回答列表 */}
          <div className="mb-8">
            <h2 className="text-white font-semibold mb-4">
              {question.answers.length > 0
                ? `${question.answers.length} 条专业回答`
                : "暂无回答"}
            </h2>

            {question.answers.length > 0 ? (
              <div className="space-y-4">
                {question.answers.map((answer) => (
                  <QaAnswerCard
                    key={answer.id}
                    answer={answer}
                    questionAuthorUserId={question.authorUserId}
                    questionId={question.id}
                    viewerUserId={viewerUserId}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm mb-2">
                  暂无律师回答此问题
                </p>
                <p className="text-slate-500 text-xs">
                  如果您是认证律师，可以登录后免费回答此问题，展示您的专业能力
                </p>
              </div>
            )}
          </div>

          {/* CTA：引导付费咨询 + 匹配律师 */}
          <div className="mb-8">
            <QaAttorneyCta
              category={question.category}
              stateCode={question.stateCode}
              matchedAttorneys={matchedAttorneys}
            />
          </div>

          {/* 律师回答表单 */}
          <div>
            <h2 className="text-white font-semibold mb-4">律师回答</h2>
            <QaAnswerForm questionId={question.id} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
