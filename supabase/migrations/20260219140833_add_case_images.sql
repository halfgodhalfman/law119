-- CreateTable
CREATE TABLE "CaseImage" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseImage_caseId_idx" ON "CaseImage"("caseId");

-- AddForeignKey
ALTER TABLE "CaseImage" ADD CONSTRAINT "CaseImage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
