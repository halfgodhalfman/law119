-- CreateTable
CREATE TABLE "OpsPrioritySetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "highValueBaseWeight" INTEGER NOT NULL DEFAULT 30,
    "highValueReasonWeight" INTEGER NOT NULL DEFAULT 5,
    "firstBidOverduePublishedWeight" INTEGER NOT NULL DEFAULT 35,
    "firstMessageOverdueWeight" INTEGER NOT NULL DEFAULT 25,
    "quotedNotSelectedWeight" INTEGER NOT NULL DEFAULT 15,
    "selectedNoConversationWeight" INTEGER NOT NULL DEFAULT 20,
    "urgentWeight" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpsPrioritySetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpsPrioritySetting_key_key" ON "OpsPrioritySetting"("key");
