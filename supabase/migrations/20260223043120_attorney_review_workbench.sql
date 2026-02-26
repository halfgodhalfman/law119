-- CreateEnum
CREATE TYPE "AttorneyReviewStatus" AS ENUM ('PENDING_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'RE_REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "AttorneyReviewAction" AS ENUM ('APPROVE', 'REQUEST_INFO', 'REJECT', 'MARK_RE_REVIEW', 'VERIFY', 'UNVERIFY', 'BAR_VERIFY', 'BAR_UNVERIFY');

-- AlterTable
ALTER TABLE "AttorneyProfile" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "lastReviewedByUserId" UUID,
ADD COLUMN     "profileCompletenessScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reviewChecklistSnapshot" JSONB,
ADD COLUMN     "reviewDecisionReason" TEXT,
ADD COLUMN     "reviewDecisionTemplate" TEXT,
ADD COLUMN     "reviewRequestedAt" TIMESTAMP(3),
ADD COLUMN     "reviewStatus" "AttorneyReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW';

-- CreateTable
CREATE TABLE "AttorneyReviewLog" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "adminUserId" UUID,
    "action" "AttorneyReviewAction" NOT NULL,
    "toStatus" "AttorneyReviewStatus",
    "templateKey" TEXT,
    "reason" TEXT,
    "checklistSnapshot" JSONB,
    "completenessScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttorneyReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttorneyReviewLog_attorneyId_createdAt_idx" ON "AttorneyReviewLog"("attorneyId", "createdAt");

-- CreateIndex
CREATE INDEX "AttorneyReviewLog_adminUserId_createdAt_idx" ON "AttorneyReviewLog"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AttorneyReviewLog_action_createdAt_idx" ON "AttorneyReviewLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "AttorneyProfile" ADD CONSTRAINT "AttorneyProfile_lastReviewedByUserId_fkey" FOREIGN KEY ("lastReviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyReviewLog" ADD CONSTRAINT "AttorneyReviewLog_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyReviewLog" ADD CONSTRAINT "AttorneyReviewLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
