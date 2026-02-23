-- CreateEnum
CREATE TYPE "AttorneyClientReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

-- CreateTable
CREATE TABLE "AttorneyClientReview" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "clientProfileId" TEXT NOT NULL,
    "engagementId" TEXT,
    "caseId" TEXT,
    "status" "AttorneyClientReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "ratingOverall" INTEGER NOT NULL,
    "ratingResponsiveness" INTEGER,
    "ratingProfessionalism" INTEGER,
    "ratingCommunication" INTEGER,
    "wouldRecommend" BOOLEAN,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttorneyClientReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttorneyClientReview_attorneyId_status_createdAt_idx" ON "AttorneyClientReview"("attorneyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AttorneyClientReview_clientProfileId_createdAt_idx" ON "AttorneyClientReview"("clientProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "AttorneyClientReview_engagementId_idx" ON "AttorneyClientReview"("engagementId");

-- AddForeignKey
ALTER TABLE "AttorneyClientReview" ADD CONSTRAINT "AttorneyClientReview_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyClientReview" ADD CONSTRAINT "AttorneyClientReview_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyClientReview" ADD CONSTRAINT "AttorneyClientReview_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "EngagementConfirmation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyClientReview" ADD CONSTRAINT "AttorneyClientReview_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
