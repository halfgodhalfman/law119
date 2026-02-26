-- CreateEnum
CREATE TYPE "FeeMode" AS ENUM ('CONSULTATION', 'AGENCY', 'STAGED', 'HOURLY', 'CUSTOM');

-- AlterTable
ALTER TABLE "Bid" ADD COLUMN     "estimatedDays" INTEGER,
ADD COLUMN     "feeMode" "FeeMode" NOT NULL DEFAULT 'CUSTOM',
ADD COLUMN     "includesConsultation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serviceScope" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "budgetMax" DECIMAL(10,2),
ADD COLUMN     "budgetMin" DECIMAL(10,2),
ADD COLUMN     "city" TEXT,
ADD COLUMN     "descriptionMasked" TEXT,
ADD COLUMN     "feeMode" "FeeMode" NOT NULL DEFAULT 'CUSTOM',
ADD COLUMN     "quoteDeadline" TIMESTAMP(3),
ADD COLUMN     "selectedBidId" TEXT,
ADD COLUMN     "subCategorySlug" TEXT;

-- CreateTable
CREATE TABLE "CaseStatusLog" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fromStatus" "CaseStatus",
    "toStatus" "CaseStatus" NOT NULL,
    "operatorId" UUID,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseStatusLog_caseId_createdAt_idx" ON "CaseStatusLog"("caseId", "createdAt");

-- AddForeignKey
ALTER TABLE "CaseStatusLog" ADD CONSTRAINT "CaseStatusLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
