-- CreateEnum
CREATE TYPE "ScoreSnapshotPeriod" AS ENUM ('DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "AttorneyScoreSnapshot" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "period" "ScoreSnapshotPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "bidsCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedBidsCount" INTEGER NOT NULL DEFAULT 0,
    "conversationsCount" INTEGER NOT NULL DEFAULT 0,
    "closedConversationsCount" INTEGER NOT NULL DEFAULT 0,
    "reportsCount" INTEGER NOT NULL DEFAULT 0,
    "disputesCount" INTEGER NOT NULL DEFAULT 0,
    "resolvedDisputesCount" INTEGER NOT NULL DEFAULT 0,
    "refundLinkedCount" INTEGER NOT NULL DEFAULT 0,
    "paymentOrdersCount" INTEGER NOT NULL DEFAULT 0,
    "ruleHitCount" INTEGER NOT NULL DEFAULT 0,
    "ruleBlockCount" INTEGER NOT NULL DEFAULT 0,
    "activeBlacklistCount" INTEGER NOT NULL DEFAULT 0,
    "avgFirstBidMinutes" INTEGER,
    "avgFirstMessageMinutes" INTEGER,
    "bidConversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "disputeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "complaintRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundLinkedRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "complianceRiskScore" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttorneyScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttorneyScoreSnapshot_period_periodStart_idx" ON "AttorneyScoreSnapshot"("period", "periodStart");

-- CreateIndex
CREATE INDEX "AttorneyScoreSnapshot_complianceRiskScore_periodStart_idx" ON "AttorneyScoreSnapshot"("complianceRiskScore", "periodStart");

-- CreateIndex
CREATE INDEX "AttorneyScoreSnapshot_qualityScore_periodStart_idx" ON "AttorneyScoreSnapshot"("qualityScore", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "AttorneyScoreSnapshot_attorneyId_period_periodStart_key" ON "AttorneyScoreSnapshot"("attorneyId", "period", "periodStart");

-- AddForeignKey
ALTER TABLE "AttorneyScoreSnapshot" ADD CONSTRAINT "AttorneyScoreSnapshot_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
