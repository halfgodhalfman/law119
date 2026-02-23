-- CreateEnum
CREATE TYPE "PaymentReconciliationStatus" AS ENUM ('UNRECONCILED', 'MATCHED', 'MANUAL_REVIEW', 'MISMATCH', 'RECONCILED');

-- CreateEnum
CREATE TYPE "PaymentReviewStatus" AS ENUM ('NONE', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentHoldReasonCode" AS ENUM ('DISPUTE_BLOCK', 'FRAUD_REVIEW', 'COMPLIANCE_REVIEW', 'DOCUMENT_MISSING', 'MANUAL_HOLD', 'OTHER');

-- AlterTable
ALTER TABLE "PaymentMilestone" ADD COLUMN     "releaseReviewNote" TEXT,
ADD COLUMN     "releaseReviewRequestedAt" TIMESTAMP(3),
ADD COLUMN     "releaseReviewStatus" "PaymentReviewStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "releaseReviewedAt" TIMESTAMP(3),
ADD COLUMN     "releaseReviewedByUserId" UUID;

-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN     "holdReasonCode" "PaymentHoldReasonCode" DEFAULT 'OTHER',
ADD COLUMN     "reconciledAt" TIMESTAMP(3),
ADD COLUMN     "reconciledByUserId" UUID,
ADD COLUMN     "reconciliationNote" TEXT,
ADD COLUMN     "reconciliationStatus" "PaymentReconciliationStatus" NOT NULL DEFAULT 'UNRECONCILED',
ADD COLUMN     "refundRequestedAt" TIMESTAMP(3),
ADD COLUMN     "refundReviewNote" TEXT,
ADD COLUMN     "refundReviewStatus" "PaymentReviewStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "refundReviewedAt" TIMESTAMP(3),
ADD COLUMN     "refundReviewedByUserId" UUID;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_reconciledByUserId_fkey" FOREIGN KEY ("reconciledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_refundReviewedByUserId_fkey" FOREIGN KEY ("refundReviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMilestone" ADD CONSTRAINT "PaymentMilestone_releaseReviewedByUserId_fkey" FOREIGN KEY ("releaseReviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
