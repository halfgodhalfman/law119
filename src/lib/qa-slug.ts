import { prisma } from "./prisma";

/**
 * 生成 SEO 友好的 slug
 * 格式：{category}-{title-slug}-{stateCode?}-{shortId}
 * 示例：immigration-can-i-apply-green-card-on-opt-ca-x7k2m
 */
export async function generateQaSlug(
  title: string,
  category: string,
  stateCode?: string
): Promise<string> {
  const titleSlug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const catSlug = category.toLowerCase().replace(/_/g, "-");
  const stateStr = stateCode ? `-${stateCode.toLowerCase()}` : "";
  const shortId = Math.random().toString(36).slice(2, 7);

  const slug = `${catSlug}-${titleSlug}${stateStr}-${shortId}`;

  const existing = await prisma.qaQuestion.findUnique({ where: { slug } });
  if (existing) {
    return `${slug}-${Math.random().toString(36).slice(2, 4)}`;
  }
  return slug;
}
