export const dynamic = "force-dynamic";
// @ts-nocheck
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ReviewsPage({ params, searchParams }: { params: Promise<{ attorneyId: string }>; searchParams: Promise<{ page?: string }> }) {
  const { attorneyId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 10;

  const attorney = await prisma.attorneyProfile.findUnique({
    where: { id: attorneyId },
    select: { firstName: true, lastName: true, firmName: true },
  });
  if (!attorney) return <div className="p-8 text-center">律师不存在</div>;

  const [reviews, totalCount] = await Promise.all([
    prisma.attorneyClientReview.findMany({
      where: { attorneyId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        case: { select: { category: true } },
        client: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.attorneyClientReview.count({ where: { attorneyId, status: "PUBLISHED" } }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Aggregate stats
  const stats = await prisma.attorneyClientReview.aggregate({
    where: { attorneyId, status: "PUBLISHED" },
    _avg: { ratingOverall: true, ratingResponsiveness: true, ratingProfessionalism: true, ratingCommunication: true },
    _count: true,
  });

  const stars = (rating: number | null) => rating ? "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating)) : "—";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/attorneys/${attorneyId}`} className="text-sm text-blue-600 hover:underline">&larr; 返回律师主页</Link>
      <h1 className="mt-4 text-2xl font-bold">{attorney.lastName}{attorney.firstName} 的客户评价</h1>
      {attorney.firmName && <p className="text-sm text-gray-500">{attorney.firmName}</p>}

      {/* Stats summary */}
      <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats._avg.ratingOverall?.toFixed(1) || "—"}</div>
          <div className="text-xs text-gray-500">综合评分</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-medium">{stats._avg.ratingResponsiveness?.toFixed(1) || "—"}</div>
          <div className="text-xs text-gray-500">响应速度</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-medium">{stats._avg.ratingProfessionalism?.toFixed(1) || "—"}</div>
          <div className="text-xs text-gray-500">专业性</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-medium">{stats._avg.ratingCommunication?.toFixed(1) || "—"}</div>
          <div className="text-xs text-gray-500">沟通能力</div>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-gray-400">共 {totalCount} 条评价</p>

      {/* Reviews list */}
      <div className="mt-6 space-y-4">
        {reviews.length === 0 && <p className="text-center text-sm text-gray-400 py-8">暂无评价</p>}
        {reviews.map(r => (
          <div key={r.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{r.client?.lastName}{r.client?.firstName?.charAt(0)}**</span>
                {r.case?.category && <span className="ml-2 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{r.case.category}</span>}
              </div>
              <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("zh-CN")}</span>
            </div>
            <div className="mt-2 text-yellow-500">{stars(r.ratingOverall)} <span className="text-sm text-gray-600">{r.ratingOverall}/5</span></div>
            {r.comment && <p className="mt-2 text-sm text-gray-700">{r.comment}</p>}
            {r.wouldRecommend !== null && (
              <p className="mt-1 text-xs text-gray-500">{r.wouldRecommend ? "✓ 愿意推荐" : "✗ 不推荐"}</p>
            )}
            <div className="mt-2 flex gap-4 text-xs text-gray-400">
              {r.ratingResponsiveness && <span>响应: {r.ratingResponsiveness}/5</span>}
              {r.ratingProfessionalism && <span>专业: {r.ratingProfessionalism}/5</span>}
              {r.ratingCommunication && <span>沟通: {r.ratingCommunication}/5</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {page > 1 && <Link href={`/attorneys/${attorneyId}/reviews?page=${page - 1}`} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">上一页</Link>}
          <span className="px-3 py-1 text-sm text-gray-500">{page} / {totalPages}</span>
          {page < totalPages && <Link href={`/attorneys/${attorneyId}/reviews?page=${page + 1}`} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">下一页</Link>}
        </div>
      )}
    </div>
  );
}
