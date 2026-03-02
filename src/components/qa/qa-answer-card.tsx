import Link from "next/link";
import { QaVoteButton } from "./qa-vote-button";
import { CATEGORY_MAP } from "@/lib/legal-categories";

interface Attorney {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  firmName: string | null;
  specialties: Array<{ category: string }>;
}

interface QaAnswerCardProps {
  answer: {
    id: string;
    body: string;
    voteCount: number;
    isAccepted: boolean;
    createdAt: string | Date;
    authorUserId: string;
    attorney: Attorney | null;
  };
  questionAuthorUserId: string | null;
  questionId: string;
  viewerUserId?: string | null;
  onAccept?: (answerId: string) => void;
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

export function QaAnswerCard({
  answer,
  questionAuthorUserId,
  questionId,
  viewerUserId,
  onAccept,
}: QaAnswerCardProps) {
  const { attorney } = answer;
  const attyName = attorney
    ? `${attorney.firstName ?? ""} ${attorney.lastName ?? ""}`.trim() || "律师"
    : "用户";
  const initials = attyName.slice(0, 1).toUpperCase();

  const canAccept =
    viewerUserId && questionAuthorUserId === viewerUserId && !answer.isAccepted;

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        answer.isAccepted
          ? "bg-green-950/30 border-green-600/40"
          : "bg-slate-800 border-slate-700"
      }`}
    >
      {/* 最佳回答 badge */}
      {answer.isAccepted && (
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-900/40 border border-green-600/30 px-2.5 py-1 rounded-full">
            ✓ 最佳回答
          </span>
        </div>
      )}

      {/* 律师信息 */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0">
          {attorney?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attorney.avatarUrl}
              alt={attyName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center text-white font-semibold text-sm">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-white font-medium text-sm">{attyName}</span>
            {attorney?.isVerified && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-600/30">
                ✓ 已认证
              </span>
            )}
          </div>
          {attorney?.firmName && (
            <p className="text-slate-500 text-xs mt-0.5">{attorney.firmName}</p>
          )}
          {attorney && attorney.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {attorney.specialties.slice(0, 3).map((s) => {
                const cat = CATEGORY_MAP[s.category as keyof typeof CATEGORY_MAP];
                return cat ? (
                  <span
                    key={s.category}
                    className="text-xs text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded"
                  >
                    {cat.nameZh}
                  </span>
                ) : null;
              })}
            </div>
          )}
          <p className="text-slate-500 text-xs mt-1">{timeAgo(answer.createdAt)}</p>
        </div>
      </div>

      {/* 回答正文 */}
      <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-3">
        {answer.body}
      </div>

      {/* Layer 6: UPL 防护 — 单条回答免责声明（ABA 要求每条法律意见须有明确免责）*/}
      <p className="text-xs text-slate-500 italic pb-3 border-b border-slate-700/50">
        ⚠ 以上为律师基于公开信息的个人意见，仅供参考，不构成正式法律意见，阅读本回答不产生律师-客户关系。
        每个案件情况不同，请咨询持证律师获取针对您情况的专业建议。
        {" / "}
        <span className="not-italic text-slate-600">
          Attorney&apos;s personal opinion for general reference only. Not formal legal advice. Reading this answer does not create an attorney-client relationship.
        </span>
      </p>

      {/* 底部操作 */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-700">
        <QaVoteButton answerId={answer.id} initialCount={answer.voteCount} />

        {attorney && (
          <Link
            href={`/attorneys/${attorney.id}`}
            className="text-xs text-slate-400 hover:text-amber-400 transition-colors underline underline-offset-2"
          >
            查看律师档案
          </Link>
        )}

        {canAccept && onAccept && (
          <button
            onClick={() => onAccept(answer.id)}
            className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-green-900/40 text-green-400 border border-green-600/30 hover:bg-green-800/40 transition-colors"
          >
            标记为最佳回答
          </button>
        )}
      </div>
    </div>
  );
}
