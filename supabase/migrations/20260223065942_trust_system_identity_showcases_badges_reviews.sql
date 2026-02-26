-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'NEEDS_INFO', 'REJECTED');

-- CreateEnum
CREATE TYPE "IdentityDocumentType" AS ENUM ('PASSPORT', 'DRIVER_LICENSE', 'STATE_ID', 'OTHER');

-- CreateEnum
CREATE TYPE "AttorneyShowcaseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "AttorneyBadgeType" AS ENUM ('VERIFIED_IDENTITY', 'BAR_VERIFIED', 'TOP_RATED', 'FAST_RESPONDER', 'HIGH_CONVERSION', 'LOW_DISPUTE_RATE', 'MULTILINGUAL', 'PREMIUM_MEMBER');

-- CreateEnum
CREATE TYPE "AttorneyBadgeSource" AS ENUM ('SYSTEM', 'MANUAL');

-- AlterTable
ALTER TABLE "AttorneyClientReview" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedByUserId" UUID,
ADD COLUMN     "moderationLabels" JSONB,
ADD COLUMN     "moderationReason" TEXT;

-- AlterTable
ALTER TABLE "AttorneyProfile" ADD COLUMN     "barRegisteredName" TEXT,
ADD COLUMN     "barVerificationNote" TEXT,
ADD COLUMN     "barVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "identityDocumentFileName" TEXT,
ADD COLUMN     "identityDocumentPath" TEXT,
ADD COLUMN     "identityDocumentType" "IdentityDocumentType",
ADD COLUMN     "identityVerificationNote" TEXT,
ADD COLUMN     "identityVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "identityVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "registeredLegalName" TEXT,
ADD COLUMN     "specialtyExperienceYears" JSONB;

-- CreateTable
CREATE TABLE "AttorneyCaseShowcase" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "caseType" TEXT NOT NULL,
    "summaryMasked" TEXT NOT NULL,
    "serviceProvided" TEXT NOT NULL,
    "outcomeCategory" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "year" INTEGER,
    "evidenceOptional" TEXT,
    "status" "AttorneyShowcaseStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttorneyCaseShowcase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttorneyBadgeGrant" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "badgeType" "AttorneyBadgeType" NOT NULL,
    "source" "AttorneyBadgeSource" NOT NULL DEFAULT 'SYSTEM',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "grantedByUserId" UUID,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttorneyBadgeGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttorneyCaseShowcase_attorneyId_status_sortOrder_idx" ON "AttorneyCaseShowcase"("attorneyId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "AttorneyBadgeGrant_attorneyId_active_badgeType_idx" ON "AttorneyBadgeGrant"("attorneyId", "active", "badgeType");

-- CreateIndex
CREATE INDEX "AttorneyBadgeGrant_badgeType_active_createdAt_idx" ON "AttorneyBadgeGrant"("badgeType", "active", "createdAt");

-- AddForeignKey
ALTER TABLE "AttorneyClientReview" ADD CONSTRAINT "AttorneyClientReview_moderatedByUserId_fkey" FOREIGN KEY ("moderatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyCaseShowcase" ADD CONSTRAINT "AttorneyCaseShowcase_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyBadgeGrant" ADD CONSTRAINT "AttorneyBadgeGrant_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyBadgeGrant" ADD CONSTRAINT "AttorneyBadgeGrant_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
