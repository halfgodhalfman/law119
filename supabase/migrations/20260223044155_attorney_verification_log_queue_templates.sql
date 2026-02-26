-- CreateTable
CREATE TABLE "AttorneyVerificationLog" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "adminUserId" UUID,
    "action" "AttorneyReviewAction" NOT NULL,
    "toStatus" "AttorneyReviewStatus",
    "templateKey" TEXT,
    "templateReply" TEXT,
    "reason" TEXT,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "fieldDiff" JSONB,
    "checklistSnapshot" JSONB,
    "completenessScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttorneyVerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttorneyVerificationLog_attorneyId_createdAt_idx" ON "AttorneyVerificationLog"("attorneyId", "createdAt");

-- CreateIndex
CREATE INDEX "AttorneyVerificationLog_adminUserId_createdAt_idx" ON "AttorneyVerificationLog"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AttorneyVerificationLog_action_createdAt_idx" ON "AttorneyVerificationLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "AttorneyVerificationLog" ADD CONSTRAINT "AttorneyVerificationLog_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyVerificationLog" ADD CONSTRAINT "AttorneyVerificationLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
