-- CreateEnum
CREATE TYPE "ConversationTagType" AS ENUM ('HIGH_INTENT', 'HIGH_RISK', 'MISSING_MATERIALS', 'NEEDS_FOLLOWUP', 'DISPUTE_RISK');

-- CreateEnum
CREATE TYPE "FollowUpReminderStatus" AS ENUM ('OPEN', 'DONE', 'DISMISSED');

-- CreateEnum
CREATE TYPE "DisputeTicketStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'WAITING_PARTY', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisputeTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ContentRuleScope" AS ENUM ('CASE_POST', 'BID_SUBMISSION', 'CHAT_MESSAGE');

-- CreateEnum
CREATE TYPE "ContentRuleAction" AS ENUM ('ALLOW', 'WARN', 'REVIEW', 'BLOCK');

-- CreateTable
CREATE TABLE "ConversationTag" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "attorneyProfileId" TEXT NOT NULL,
    "tag" "ConversationTagType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttorneyFollowUpReminder" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "attorneyProfileId" TEXT NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpReminderStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AttorneyFollowUpReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationChecklistItem" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "attorneyProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeTicket" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "bidId" TEXT,
    "conversationId" TEXT,
    "clientProfileId" TEXT,
    "attorneyProfileId" TEXT,
    "createdByUserId" UUID NOT NULL,
    "status" "DisputeTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "DisputeTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedAdminUserId" UUID,
    "slaDueAt" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisputeTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeTicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderUserId" UUID NOT NULL,
    "senderRole" "UserRole" NOT NULL,
    "body" TEXT NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "isInternalNote" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeTicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRuleEvent" (
    "id" TEXT NOT NULL,
    "scope" "ContentRuleScope" NOT NULL,
    "action" "ContentRuleAction" NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "matchedText" TEXT,
    "note" TEXT,
    "actorUserId" UUID,
    "caseId" TEXT,
    "bidId" TEXT,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentRuleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationTag_attorneyProfileId_tag_updatedAt_idx" ON "ConversationTag"("attorneyProfileId", "tag", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationTag_conversationId_attorneyProfileId_tag_key" ON "ConversationTag"("conversationId", "attorneyProfileId", "tag");

-- CreateIndex
CREATE INDEX "AttorneyFollowUpReminder_attorneyProfileId_status_dueAt_idx" ON "AttorneyFollowUpReminder"("attorneyProfileId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "AttorneyFollowUpReminder_conversationId_status_dueAt_idx" ON "AttorneyFollowUpReminder"("conversationId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ConversationChecklistItem_attorneyProfileId_completed_updat_idx" ON "ConversationChecklistItem"("attorneyProfileId", "completed", "updatedAt");

-- CreateIndex
CREATE INDEX "ConversationChecklistItem_conversationId_completed_updatedA_idx" ON "ConversationChecklistItem"("conversationId", "completed", "updatedAt");

-- CreateIndex
CREATE INDEX "DisputeTicket_status_priority_createdAt_idx" ON "DisputeTicket"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "DisputeTicket_conversationId_createdAt_idx" ON "DisputeTicket"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "DisputeTicket_assignedAdminUserId_status_slaDueAt_idx" ON "DisputeTicket"("assignedAdminUserId", "status", "slaDueAt");

-- CreateIndex
CREATE INDEX "DisputeTicketMessage_ticketId_createdAt_idx" ON "DisputeTicketMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentRuleEvent_scope_action_createdAt_idx" ON "ContentRuleEvent"("scope", "action", "createdAt");

-- CreateIndex
CREATE INDEX "ContentRuleEvent_ruleCode_createdAt_idx" ON "ContentRuleEvent"("ruleCode", "createdAt");

-- CreateIndex
CREATE INDEX "ContentRuleEvent_caseId_createdAt_idx" ON "ContentRuleEvent"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentRuleEvent_conversationId_createdAt_idx" ON "ContentRuleEvent"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ConversationTag" ADD CONSTRAINT "ConversationTag_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTag" ADD CONSTRAINT "ConversationTag_attorneyProfileId_fkey" FOREIGN KEY ("attorneyProfileId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyFollowUpReminder" ADD CONSTRAINT "AttorneyFollowUpReminder_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyFollowUpReminder" ADD CONSTRAINT "AttorneyFollowUpReminder_attorneyProfileId_fkey" FOREIGN KEY ("attorneyProfileId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyFollowUpReminder" ADD CONSTRAINT "AttorneyFollowUpReminder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationChecklistItem" ADD CONSTRAINT "ConversationChecklistItem_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationChecklistItem" ADD CONSTRAINT "ConversationChecklistItem_attorneyProfileId_fkey" FOREIGN KEY ("attorneyProfileId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTicket" ADD CONSTRAINT "DisputeTicket_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTicket" ADD CONSTRAINT "DisputeTicket_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTicket" ADD CONSTRAINT "DisputeTicket_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTicket" ADD CONSTRAINT "DisputeTicket_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTicket" ADD CONSTRAINT "DisputeTicket_attorneyProfileId_fkey" FOREIGN KEY ("attorneyProfileId") REFERENCES "AttorneyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTicket" ADD CONSTRAINT "DisputeTicket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTicket" ADD CONSTRAINT "DisputeTicket_assignedAdminUserId_fkey" FOREIGN KEY ("assignedAdminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTicketMessage" ADD CONSTRAINT "DisputeTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "DisputeTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTicketMessage" ADD CONSTRAINT "DisputeTicketMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRuleEvent" ADD CONSTRAINT "ContentRuleEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRuleEvent" ADD CONSTRAINT "ContentRuleEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRuleEvent" ADD CONSTRAINT "ContentRuleEvent_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRuleEvent" ADD CONSTRAINT "ContentRuleEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
