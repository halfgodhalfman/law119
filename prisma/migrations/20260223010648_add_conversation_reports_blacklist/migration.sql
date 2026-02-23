-- CreateEnum
CREATE TYPE "ConversationReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ConversationReportCategory" AS ENUM ('HARASSMENT', 'SPAM', 'FRAUD', 'THREAT', 'INAPPROPRIATE', 'PRIVACY', 'OTHER');

-- CreateTable
CREATE TABLE "ConversationReport" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "reporterUserId" UUID NOT NULL,
    "reporterRole" "ConversationRole" NOT NULL,
    "targetUserId" UUID,
    "targetRole" "ConversationRole",
    "category" "ConversationReportCategory" NOT NULL,
    "details" TEXT,
    "status" "ConversationReportStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "handledByUserId" UUID,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlacklist" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "blockerUserId" UUID NOT NULL,
    "blockedUserId" UUID NOT NULL,
    "reason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedByUserId" UUID,

    CONSTRAINT "UserBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationReport_conversationId_createdAt_idx" ON "ConversationReport"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationReport_status_createdAt_idx" ON "ConversationReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationReport_reporterUserId_createdAt_idx" ON "ConversationReport"("reporterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBlacklist_active_createdAt_idx" ON "UserBlacklist"("active", "createdAt");

-- CreateIndex
CREATE INDEX "UserBlacklist_blockedUserId_active_idx" ON "UserBlacklist"("blockedUserId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlacklist_blockerUserId_blockedUserId_key" ON "UserBlacklist"("blockerUserId", "blockedUserId");

-- AddForeignKey
ALTER TABLE "ConversationReport" ADD CONSTRAINT "ConversationReport_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReport" ADD CONSTRAINT "ConversationReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReport" ADD CONSTRAINT "ConversationReport_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReport" ADD CONSTRAINT "ConversationReport_handledByUserId_fkey" FOREIGN KEY ("handledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlacklist" ADD CONSTRAINT "UserBlacklist_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlacklist" ADD CONSTRAINT "UserBlacklist_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlacklist" ADD CONSTRAINT "UserBlacklist_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlacklist" ADD CONSTRAINT "UserBlacklist_deactivatedByUserId_fkey" FOREIGN KEY ("deactivatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
