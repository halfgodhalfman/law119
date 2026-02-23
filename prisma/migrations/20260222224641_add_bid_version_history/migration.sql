-- CreateTable
CREATE TABLE "BidVersion" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "message" TEXT,
    "feeQuoteMin" DECIMAL(10,2),
    "feeQuoteMax" DECIMAL(10,2),
    "feeMode" "FeeMode" NOT NULL DEFAULT 'CUSTOM',
    "serviceScope" TEXT,
    "estimatedDays" INTEGER,
    "includesConsultation" BOOLEAN NOT NULL DEFAULT false,
    "status" "BidStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BidVersion_bidId_createdAt_idx" ON "BidVersion"("bidId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BidVersion_bidId_version_key" ON "BidVersion"("bidId", "version");

-- AddForeignKey
ALTER TABLE "BidVersion" ADD CONSTRAINT "BidVersion_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
