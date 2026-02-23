-- CreateEnum
CREATE TYPE "CaseAttachmentVisibility" AS ENUM ('CLIENT_ONLY', 'SELECTED_ATTORNEY', 'ADMINS_ONLY');

-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('DRAFT', 'PENDING_CLIENT', 'PENDING_ATTORNEY', 'ACTIVE', 'DECLINED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ServiceBoundaryType" AS ENUM ('CONSULTATION', 'DOCUMENT_PREP', 'COURT_APPEARANCE', 'FULL_REPRESENTATION', 'CUSTOM');

-- AlterTable
ALTER TABLE "CaseImage" ADD COLUMN     "isSensitive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sensitiveHint" TEXT,
ADD COLUMN     "visibility" "CaseAttachmentVisibility" NOT NULL DEFAULT 'SELECTED_ATTORNEY';

-- CreateTable
CREATE TABLE "CaseImageAccessLog" (
    "id" TEXT NOT NULL,
    "caseImageId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "viewerUserId" UUID NOT NULL,
    "viewerRole" "UserRole" NOT NULL,
    "attorneyProfileId" TEXT,
    "clientProfileId" TEXT,
    "accessType" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseImageAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementConfirmation" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "conversationId" TEXT,
    "clientProfileId" TEXT,
    "attorneyProfileId" TEXT NOT NULL,
    "status" "EngagementStatus" NOT NULL DEFAULT 'DRAFT',
    "serviceBoundary" "ServiceBoundaryType" NOT NULL DEFAULT 'CUSTOM',
    "serviceScopeSummary" TEXT NOT NULL,
    "stagePlan" TEXT,
    "feeMode" "FeeMode" NOT NULL DEFAULT 'CUSTOM',
    "feeAmountMin" DECIMAL(10,2),
    "feeAmountMax" DECIMAL(10,2),
    "includesConsultation" BOOLEAN NOT NULL DEFAULT false,
    "includesCourtAppearance" BOOLEAN NOT NULL DEFAULT false,
    "includesTranslation" BOOLEAN NOT NULL DEFAULT false,
    "includesDocumentFiling" BOOLEAN NOT NULL DEFAULT false,
    "nonLegalAdviceAck" BOOLEAN NOT NULL DEFAULT false,
    "noAttorneyClientRelationshipAck" BOOLEAN NOT NULL DEFAULT false,
    "attorneyConflictChecked" BOOLEAN NOT NULL DEFAULT false,
    "attorneyConflictCheckNote" TEXT,
    "attorneyConflictCheckedAt" TIMESTAMP(3),
    "attorneyConfirmedAt" TIMESTAMP(3),
    "clientConfirmedAt" TIMESTAMP(3),
    "confirmedByAttorneyUserId" UUID,
    "confirmedByClientUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseImageAccessLog_caseImageId_createdAt_idx" ON "CaseImageAccessLog"("caseImageId", "createdAt");

-- CreateIndex
CREATE INDEX "CaseImageAccessLog_caseId_createdAt_idx" ON "CaseImageAccessLog"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "CaseImageAccessLog_viewerUserId_createdAt_idx" ON "CaseImageAccessLog"("viewerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "EngagementConfirmation_caseId_status_idx" ON "EngagementConfirmation"("caseId", "status");

-- CreateIndex
CREATE INDEX "EngagementConfirmation_attorneyProfileId_status_idx" ON "EngagementConfirmation"("attorneyProfileId", "status");

-- CreateIndex
CREATE INDEX "EngagementConfirmation_clientProfileId_status_idx" ON "EngagementConfirmation"("clientProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EngagementConfirmation_bidId_key" ON "EngagementConfirmation"("bidId");

-- AddForeignKey
ALTER TABLE "CaseImageAccessLog" ADD CONSTRAINT "CaseImageAccessLog_caseImageId_fkey" FOREIGN KEY ("caseImageId") REFERENCES "CaseImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseImageAccessLog" ADD CONSTRAINT "CaseImageAccessLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseImageAccessLog" ADD CONSTRAINT "CaseImageAccessLog_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseImageAccessLog" ADD CONSTRAINT "CaseImageAccessLog_attorneyProfileId_fkey" FOREIGN KEY ("attorneyProfileId") REFERENCES "AttorneyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseImageAccessLog" ADD CONSTRAINT "CaseImageAccessLog_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementConfirmation" ADD CONSTRAINT "EngagementConfirmation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementConfirmation" ADD CONSTRAINT "EngagementConfirmation_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementConfirmation" ADD CONSTRAINT "EngagementConfirmation_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementConfirmation" ADD CONSTRAINT "EngagementConfirmation_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementConfirmation" ADD CONSTRAINT "EngagementConfirmation_attorneyProfileId_fkey" FOREIGN KEY ("attorneyProfileId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementConfirmation" ADD CONSTRAINT "EngagementConfirmation_confirmedByAttorneyUserId_fkey" FOREIGN KEY ("confirmedByAttorneyUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementConfirmation" ADD CONSTRAINT "EngagementConfirmation_confirmedByClientUserId_fkey" FOREIGN KEY ("confirmedByClientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
