-- CreateEnum
CREATE TYPE "SupportInboxSourceType" AS ENUM ('REPORT', 'DISPUTE', 'SUPPORT_TICKET');

-- CreateEnum
CREATE TYPE "SupportInboxQueueLevel" AS ENUM ('CUSTOMER_SERVICE', 'RISK', 'ADMIN');

-- CreateTable
CREATE TABLE "SupportInboxRouting" (
    "id" TEXT NOT NULL,
    "sourceType" "SupportInboxSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "queueLevel" "SupportInboxQueueLevel" NOT NULL DEFAULT 'CUSTOMER_SERVICE',
    "assignedAdminUserId" UUID,
    "priorityOverride" TEXT,
    "slaDueAtOverride" TIMESTAMP(3),
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportInboxRouting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplyTemplate" (
    "id" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByAdminUserId" UUID,
    "updatedByAdminUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportInboxRouting_queueLevel_updatedAt_idx" ON "SupportInboxRouting"("queueLevel", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportInboxRouting_assignedAdminUserId_updatedAt_idx" ON "SupportInboxRouting"("assignedAdminUserId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportInboxRouting_sourceType_sourceId_key" ON "SupportInboxRouting"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "ReplyTemplate_scene_active_sortOrder_idx" ON "ReplyTemplate"("scene", "active", "sortOrder");

-- AddForeignKey
ALTER TABLE "SupportInboxRouting" ADD CONSTRAINT "SupportInboxRouting_assignedAdminUserId_fkey" FOREIGN KEY ("assignedAdminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyTemplate" ADD CONSTRAINT "ReplyTemplate_createdByAdminUserId_fkey" FOREIGN KEY ("createdByAdminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyTemplate" ADD CONSTRAINT "ReplyTemplate_updatedByAdminUserId_fkey" FOREIGN KEY ("updatedByAdminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
