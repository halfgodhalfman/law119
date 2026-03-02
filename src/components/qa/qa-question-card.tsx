import Link from "next/link";
import { CATEGORY_MAP } from "@/lib/legal-categories";

interface QaQuestionCardProps {
  question: {
    id: string;
    slug: string;
    title: string;
    category: string;
    stateCode: string | null;
    authorName: string;
    viewCount: number;
    answerCount: number;
    acceptedAnswerId: string | null;
    createdAt: string | Date;
  };
}

function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return d.toLocaleDateString("zh-CN");
}

export function QaQuestionCard({ question }: QaQuestionCardProps) {
  const cat = CATEGORY_MAP[question.category as keyof typeof CATEGORY_MAP];
  const hasAccepted = !!question.acceptedAnswerId;

  return (
    <Link
      href={`/qa/${question.id}`}
      className="block bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-amber-500/50 hover:bg-slate-750 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* 回答计数 */}
        <div
          className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-lg text-center ${
            hasAccepted
              ? "bg-green-900/40 border border-green-600/40"
              : question.answerCount > 0
              ? "bg-amber-900/40 border border-amber-600/40"
              : "bg-slate-700/50 border border-slate-600/40"
          }`}
        >
          <span
            className={`text-lg font-bold leading-none ${
              hasAccepted
                ? "text-green-400"
                : question.answerCount > 0
                ? "text-amber-400"
                : "text-slate-400"
            }`}
          >
            {question.answerCount}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">回答</span>
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium text-sm sm:text-base leading-snug group-hover:text-amber-400 transition-colors line-clamp-2">
            {question.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* 分类 tag */}
            {cat && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                <span>{cat.emoji}</span>
                <span>{cat.nameZh}</span>
              </span>
            )}
            {/* 州 */}
            {question.stateCode && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                {question.stateCode}
              </span>
            )}
            {/* 最佳回答 badge */}
            {hasAccepted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-600/30">
                ✓ 已解决
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span>{question.authorName}</span>
            <span>·</span>
            <span>{timeAgo(question.createdAt)}</span>
            <span>·</span>
            <span>{question.viewCount} 浏览</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
