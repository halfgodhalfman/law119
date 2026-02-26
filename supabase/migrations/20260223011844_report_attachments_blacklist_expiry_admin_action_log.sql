-- CreateEnum
CREATE TYPE "AdminActionEntityType" AS ENUM ('REPORT', 'BLACKLIST', 'CONVERSATION', 'CASE', 'BID', 'USER', 'ATTORNEY');

-- AlterTable
ALTER TABLE "UserBlacklist" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ConversationReportAttachment" (
    "id" TEXT NOT NULL,
    "reportId" TEXT,
    "conversationId" TEXT NOT NULL,
    "uploaderUserId" UUID NOT NULL,
    "fileName" TEXT,
    "storagePath" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationReportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" TEXT NOT NULL,
    "adminUserId" UUID NOT NULL,
    "entityType" "AdminActionEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationReportAttachment_conversationId_createdAt_idx" ON "ConversationReportAttachment"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationReportAttachment_uploaderUserId_createdAt_idx" ON "ConversationReportAttachment"("uploaderUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationReportAttachment_reportId_createdAt_idx" ON "ConversationReportAttachment"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_adminUserId_createdAt_idx" ON "AdminActionLog"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_entityType_entityId_createdAt_idx" ON "AdminActionLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_createdAt_idx" ON "AdminActionLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ConversationReportAttachment" ADD CONSTRAINT "ConversationReportAttachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ConversationReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReportAttachment" ADD CONSTRAINT "ConversationReportAttachment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReportAttachment" ADD CONSTRAINT "ConversationReportAttachment_uploaderUserId_fkey" FOREIGN KEY ("uploaderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
