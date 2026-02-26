-- CreateTable
CREATE TABLE "AttorneyNotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "emailInstantHighPriority" BOOLEAN NOT NULL DEFAULT true,
    "emailInstantNewMessages" BOOLEAN NOT NULL DEFAULT true,
    "emailInstantCaseMatches" BOOLEAN NOT NULL DEFAULT true,
    "emailDailyDigest" BOOLEAN NOT NULL DEFAULT true,
    "emailWeeklyDigest" BOOLEAN NOT NULL DEFAULT true,
    "inAppP0" BOOLEAN NOT NULL DEFAULT true,
    "inAppP1" BOOLEAN NOT NULL DEFAULT true,
    "inAppP2" BOOLEAN NOT NULL DEFAULT true,
    "inAppP3" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "preferredCaseCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredBudgetMin" DECIMAL(10,2),
    "preferredBudgetMax" DECIMAL(10,2),
    "preferredFeeModes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttorneyNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttorneyNotificationPreference_userId_key" ON "AttorneyNotificationPreference"("userId");

-- AddForeignKey
ALTER TABLE "AttorneyNotificationPreference" ADD CONSTRAINT "AttorneyNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
