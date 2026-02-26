-- CreateEnum
CREATE TYPE "BlacklistScope" AS ENUM ('CONVERSATION', 'GLOBAL');

-- AlterTable
ALTER TABLE "ConversationReport" ADD COLUMN     "evidenceCount" INTEGER,
ADD COLUMN     "evidenceSnapshot" JSONB,
ADD COLUMN     "reportedMessageExcerpt" TEXT,
ADD COLUMN     "reportedMessageId" TEXT;

-- AlterTable
ALTER TABLE "UserBlacklist" ADD COLUMN     "scope" "BlacklistScope" NOT NULL DEFAULT 'CONVERSATION';

-- CreateIndex
CREATE INDEX "ConversationReport_reportedMessageId_idx" ON "ConversationReport"("reportedMessageId");
