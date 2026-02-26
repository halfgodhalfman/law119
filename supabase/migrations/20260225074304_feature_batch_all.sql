-- CreateEnum
CREATE TYPE "EngagementCompletionStatus" AS ENUM ('NONE', 'REQUESTED_BY_ATTORNEY', 'CONFIRMED_BY_CLIENT', 'AUTO_COMPLETED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ServiceStageStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('SERVICE_NOT_STARTED', 'SERVICE_INCOMPLETE', 'QUALITY_ISSUE', 'COMMUNICATION_ISSUE', 'OVERCHARGED', 'OTHER');

-- CreateEnum
CREATE TYPE "MediationPhase" AS ENUM ('DEFENSE_SUBMISSION', 'EVIDENCE_REVIEW', 'PROPOSAL', 'RESOLVED', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ENGAGEMENT_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_REMINDER';

-- DropForeignKey
DO $$ BEGIN ALTER TABLE "Contract" DROP CONSTRAINT "Contract_attorneyProfileId_fkey"; EXCEPTION WHEN undefined_table OR undefined_object THEN NULL; END $$;

-- DropForeignKey
DO $$ BEGIN ALTER TABLE "Contract" DROP CONSTRAINT "Contract_caseId_fkey"; EXCEPTION WHEN undefined_table OR undefined_object THEN NULL; END $$;

-- DropForeignKey
DO $$ BEGIN ALTER TABLE "Contract" DROP CONSTRAINT "Contract_clientProfileId_fkey"; EXCEPTION WHEN undefined_table OR undefined_object THEN NULL; END $$;

-- DropForeignKey
DO $$ BEGIN ALTER TABLE "Contract" DROP CONSTRAINT "Contract_engagementId_fkey"; EXCEPTION WHEN undefined_table OR undefined_object THEN NULL; END $$;

-- DropForeignKey
DO $$ BEGIN ALTER TABLE "Contract" DROP CONSTRAINT "Contract_paymentOrderId_fkey"; EXCEPTION WHEN undefined_table OR undefined_object THEN NULL; END $$;

-- DropForeignKey
DO $$ BEGIN ALTER TABLE "ContractAuditLog" DROP CONSTRAINT "ContractAuditLog_contractId_fkey"; EXCEPTION WHEN undefined_table OR undefined_object THEN NULL; END $$;

-- AlterTable
ALTER TABLE "DisputeTicket" ADD COLUMN     "defenseDeadlineAt" TIMESTAMP(3),
ADD COLUMN     "mediationPhase" "MediationPhase",
ADD COLUMN     "mediationResolvedAt" TIMESTAMP(3),
ADD COLUMN     "mediationStartedAt" TIMESTAMP(3),
ADD COLUMN     "proposalAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "proposalSummary" TEXT;

-- AlterTable
ALTER TABLE "EngagementConfirmation" ADD COLUMN     "completionAutoAt" TIMESTAMP(3),
ADD COLUMN     "completionConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "completionConfirmedByUserId" UUID,
ADD COLUMN     "completionNote" TEXT,
ADD COLUMN     "completionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "completionRequestedByUserId" UUID,
ADD COLUMN     "completionStatus" "EngagementCompletionStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN     "refundDescription" TEXT,
ADD COLUMN     "refundEvidencePaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "refundReason" "RefundReason";

-- DropTable
DROP TABLE IF EXISTS "Contract";

-- DropTable
DROP TABLE IF EXISTS "ContractAuditLog";

-- DropEnum
DROP TYPE IF EXISTS "ContractStatus";

-- CreateTable
CREATE TABLE "ChatAttachment" (
    "id" TEXT NOT NULL,
    "chatMessageId" TEXT,
    "conversationId" TEXT NOT NULL,
    "uploaderUserId" UUID NOT NULL,
    "fileName" TEXT,
    "storagePath" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceStage" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ServiceStageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedByUserId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL,
    "attorneyProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "serviceBoundary" "ServiceBoundaryType" NOT NULL DEFAULT 'CUSTOM',
    "serviceScopeSummary" TEXT NOT NULL,
    "stagePlanJson" TEXT,
    "feeMode" "FeeMode" NOT NULL DEFAULT 'CUSTOM',
    "feeAmountMin" DECIMAL(10,2),
    "feeAmountMax" DECIMAL(10,2),
    "includesConsultation" BOOLEAN NOT NULL DEFAULT false,
    "includesCourtAppearance" BOOLEAN NOT NULL DEFAULT false,
    "includesTranslation" BOOLEAN NOT NULL DEFAULT false,
    "includesDocumentFiling" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneDeliverable" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "uploaderUserId" UUID NOT NULL,
    "fileName" TEXT,
    "storagePath" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatAttachment_chatMessageId_idx" ON "ChatAttachment"("chatMessageId");

-- CreateIndex
CREATE INDEX "ChatAttachment_conversationId_createdAt_idx" ON "ChatAttachment"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceStage_engagementId_sortOrder_idx" ON "ServiceStage"("engagementId", "sortOrder");

-- CreateIndex
CREATE INDEX "ServiceStage_engagementId_status_idx" ON "ServiceStage"("engagementId", "status");

-- CreateIndex
CREATE INDEX "ContractTemplate_attorneyProfileId_createdAt_idx" ON "ContractTemplate"("attorneyProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "MilestoneDeliverable_milestoneId_createdAt_idx" ON "MilestoneDeliverable"("milestoneId", "createdAt");

-- CreateIndex
CREATE INDEX "EngagementConfirmation_completionStatus_completionAutoAt_idx" ON "EngagementConfirmation"("completionStatus", "completionAutoAt");

-- AddForeignKey
ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceStage" ADD CONSTRAINT "ServiceStage_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "EngagementConfirmation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractTemplate" ADD CONSTRAINT "ContractTemplate_attorneyProfileId_fkey" FOREIGN KEY ("attorneyProfileId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneDeliverable" ADD CONSTRAINT "MilestoneDeliverable_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "PaymentMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

