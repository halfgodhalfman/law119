-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LegalCategory" ADD VALUE 'REAL_ESTATE';
ALTER TYPE "LegalCategory" ADD VALUE 'ESTATE_PLAN';
ALTER TYPE "LegalCategory" ADD VALUE 'TAX';

-- CreateTable
CREATE TABLE "LegalSubCategory" (
    "id" TEXT NOT NULL,
    "category" "LegalCategory" NOT NULL,
    "slug" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "group" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "hot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalSubCategory_slug_key" ON "LegalSubCategory"("slug");

-- CreateIndex
CREATE INDEX "LegalSubCategory_category_idx" ON "LegalSubCategory"("category");

-- CreateIndex
CREATE INDEX "LegalSubCategory_hot_idx" ON "LegalSubCategory"("hot");
