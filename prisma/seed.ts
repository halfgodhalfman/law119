import { PrismaClient } from "@prisma/client";
import { ALL_SUB_CATEGORIES } from "../src/lib/legal-categories";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding LegalSubCategory...");

  // Clear existing
  await prisma.legalSubCategory.deleteMany();

  // Insert all
  await prisma.legalSubCategory.createMany({
    data: ALL_SUB_CATEGORIES.map((s) => ({
      category: s.category as Parameters<typeof prisma.legalSubCategory.create>[0]["data"]["category"],
      slug: s.slug,
      nameZh: s.nameZh,
      nameEn: s.nameEn,
      group: s.group,
      hot: s.hot ?? false,
      sortOrder: s.sortOrder,
    })),
    skipDuplicates: true,
  });

  const count = await prisma.legalSubCategory.count();
  console.log(`✅ Seeded ${count} sub-categories.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
