-- CreateEnum
CREATE TYPE "FaqAudience" AS ENUM ('GENERAL', 'CLIENT', 'ATTORNEY');

-- CreateEnum
CREATE TYPE "LegalNoticeType" AS ENUM ('TERMS', 'PRIVACY', 'ATTORNEY_TERMS', 'CLIENT_TERMS', 'ADVERTISING_DISCLAIMER');

-- CreateEnum
CREATE TYPE "LegalNoticeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "LegalSubCategory" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "homepageFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "homepageFeaturedOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "FaqEntry" (
    "id" TEXT NOT NULL,
    "audience" "FaqAudience" NOT NULL DEFAULT 'GENERAL',
    "category" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalNoticeVersion" (
    "id" TEXT NOT NULL,
    "noticeType" "LegalNoticeType" NOT NULL,
    "title" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "summary" TEXT,
    "status" "LegalNoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "supersedesId" TEXT,
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalNoticeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaqEntry_audience_active_sortOrder_idx" ON "FaqEntry"("audience", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "FaqEntry_featured_active_idx" ON "FaqEntry"("featured", "active");

-- CreateIndex
CREATE INDEX "LegalNoticeVersion_noticeType_status_updatedAt_idx" ON "LegalNoticeVersion"("noticeType", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "LegalNoticeVersion_noticeType_effectiveAt_idx" ON "LegalNoticeVersion"("noticeType", "effectiveAt");

-- CreateIndex
CREATE INDEX "LegalSubCategory_enabled_category_sortOrder_idx" ON "LegalSubCategory"("enabled", "category", "sortOrder");

-- CreateIndex
CREATE INDEX "LegalSubCategory_homepageFeatured_homepageFeaturedOrder_idx" ON "LegalSubCategory"("homepageFeatured", "homepageFeaturedOrder");

-- AddForeignKey
ALTER TABLE "LegalNoticeVersion" ADD CONSTRAINT "LegalNoticeVersion_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "LegalNoticeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
