-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('UNPAID', 'PENDING_PAYMENT', 'PAID_HELD', 'PARTIALLY_RELEASED', 'RELEASED', 'REFUND_PENDING', 'REFUNDED', 'CHARGEBACK_REVIEW', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentEventType" AS ENUM ('PAYMENT_INTENT_CREATED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'HOLD_PLACED', 'MILESTONE_RELEASE_REQUESTED', 'MILESTONE_RELEASED', 'REFUND_REQUESTED', 'REFUND_APPROVED', 'REFUND_COMPLETED', 'ADMIN_HOLD', 'ADMIN_RELEASE', 'DISPUTE_BLOCK');

-- CreateEnum
CREATE TYPE "PaymentMilestoneStatus" AS ENUM ('PENDING', 'READY_FOR_RELEASE', 'RELEASED', 'DISPUTED', 'CANCELED');

-- CreateTable
CREATE TABLE "ContentRuleConfig" (
    "id" TEXT NOT NULL,
    "scope" "ContentRuleScope" NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "action" "ContentRuleAction" NOT NULL DEFAULT 'WARN',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "pattern" TEXT NOT NULL,
    "patternType" TEXT NOT NULL DEFAULT 'regex',
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentRuleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT,
    "caseId" TEXT,
    "bidId" TEXT,
    "conversationId" TEXT,
    "clientProfileId" TEXT,
    "attorneyProfileId" TEXT,
    "payerUserId" UUID,
    "payeeUserId" UUID,
    "feeMode" "FeeMode" NOT NULL DEFAULT 'CUSTOM',
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'UNPAID',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amountTotal" DECIMAL(12,2) NOT NULL,
    "amountHeld" DECIMAL(12,2) NOT NULL,
    "amountReleased" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountRefunded" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "scopeSnapshot" JSONB,
    "holdBlockedByDispute" BOOLEAN NOT NULL DEFAULT false,
    "holdBlockedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMilestone" (
    "id" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "deliverable" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "targetDate" TIMESTAMP(3),
    "status" "PaymentMilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "releaseRequestedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "actorUserId" UUID,
    "type" "PaymentEventType" NOT NULL,
    "amount" DECIMAL(12,2),
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentRuleConfig_scope_enabled_sortOrder_idx" ON "ContentRuleConfig"("scope", "enabled", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRuleConfig_scope_ruleCode_key" ON "ContentRuleConfig"("scope", "ruleCode");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_createdAt_idx" ON "PaymentOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentOrder_engagementId_createdAt_idx" ON "PaymentOrder"("engagementId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentOrder_conversationId_createdAt_idx" ON "PaymentOrder"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentMilestone_paymentOrderId_sortOrder_idx" ON "PaymentMilestone"("paymentOrderId", "sortOrder");

-- CreateIndex
CREATE INDEX "PaymentMilestone_status_createdAt_idx" ON "PaymentMilestone"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentOrderId_createdAt_idx" ON "PaymentEvent"("paymentOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_type_createdAt_idx" ON "PaymentEvent"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "EngagementConfirmation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_attorneyProfileId_fkey" FOREIGN KEY ("attorneyProfileId") REFERENCES "AttorneyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_payerUserId_fkey" FOREIGN KEY ("payerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_payeeUserId_fkey" FOREIGN KEY ("payeeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMilestone" ADD CONSTRAINT "PaymentMilestone_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "PaymentMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
