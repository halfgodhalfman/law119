-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'ATTORNEY', 'ADMIN');

-- CreateEnum
CREATE TYPE "LegalCategory" AS ENUM ('IMMIGRATION', 'CIVIL', 'CRIMINAL', 'FAMILY', 'LABOR', 'BUSINESS', 'OTHER');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('MANDARIN', 'CANTONESE', 'ENGLISH');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'MATCHING', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'WITHDRAWN', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('CLIENT', 'ATTORNEY');

-- CreateEnum
CREATE TYPE "ChatSenderRole" AS ENUM ('CLIENT', 'ATTORNEY', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "zipCode" VARCHAR(10),
    "preferredLanguage" "Language",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttorneyProfile" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "firmName" TEXT,
    "barLicenseNumber" TEXT,
    "barNumberVerified" BOOLEAN NOT NULL DEFAULT false,
    "barVerifiedAt" TIMESTAMP(3),
    "barState" CHAR(2),
    "lawSchool" TEXT,
    "yearsExperience" INTEGER,
    "bio" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttorneyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttorneyServiceArea" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "stateCode" CHAR(2) NOT NULL,
    "zipCode" VARCHAR(10),

    CONSTRAINT "AttorneyServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttorneySpecialty" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "category" "LegalCategory" NOT NULL,

    CONSTRAINT "AttorneySpecialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttorneyLanguage" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "language" "Language" NOT NULL,

    CONSTRAINT "AttorneyLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "clientProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "LegalCategory" NOT NULL,
    "stateCode" CHAR(2) NOT NULL,
    "zipCode" VARCHAR(10) NOT NULL,
    "description" TEXT NOT NULL,
    "urgency" "UrgencyLevel" NOT NULL DEFAULT 'MEDIUM',
    "preferredLanguage" "Language" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "attorneyProfileId" TEXT NOT NULL,
    "message" TEXT,
    "feeQuoteMin" DECIMAL(10,2),
    "feeQuoteMax" DECIMAL(10,2),
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "contactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "clientProfileId" TEXT NOT NULL,
    "attorneyProfileId" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "consultationAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderUserId" UUID,
    "senderRole" "ChatSenderRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisclaimerAcceptance" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ConversationRole" NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisclaimerAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AttorneyProfile_userId_key" ON "AttorneyProfile"("userId");

-- CreateIndex
CREATE INDEX "AttorneyServiceArea_attorneyId_stateCode_idx" ON "AttorneyServiceArea"("attorneyId", "stateCode");

-- CreateIndex
CREATE INDEX "AttorneyServiceArea_zipCode_idx" ON "AttorneyServiceArea"("zipCode");

-- CreateIndex
CREATE UNIQUE INDEX "AttorneyServiceArea_attorneyId_stateCode_zipCode_key" ON "AttorneyServiceArea"("attorneyId", "stateCode", "zipCode");

-- CreateIndex
CREATE INDEX "AttorneySpecialty_category_idx" ON "AttorneySpecialty"("category");

-- CreateIndex
CREATE UNIQUE INDEX "AttorneySpecialty_attorneyId_category_key" ON "AttorneySpecialty"("attorneyId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "AttorneyLanguage_attorneyId_language_key" ON "AttorneyLanguage"("attorneyId", "language");

-- CreateIndex
CREATE INDEX "Case_stateCode_category_status_idx" ON "Case"("stateCode", "category", "status");

-- CreateIndex
CREATE INDEX "Case_category_zipCode_status_idx" ON "Case"("category", "zipCode", "status");

-- CreateIndex
CREATE INDEX "Case_clientProfileId_createdAt_idx" ON "Case"("clientProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "Bid_attorneyProfileId_status_idx" ON "Bid"("attorneyProfileId", "status");

-- CreateIndex
CREATE INDEX "Bid_caseId_status_idx" ON "Bid"("caseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_caseId_attorneyProfileId_key" ON "Bid"("caseId", "attorneyProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_bidId_key" ON "Conversation"("bidId");

-- CreateIndex
CREATE INDEX "Conversation_attorneyProfileId_status_createdAt_idx" ON "Conversation"("attorneyProfileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_clientProfileId_status_createdAt_idx" ON "Conversation"("clientProfileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "DisclaimerAcceptance_conversationId_role_idx" ON "DisclaimerAcceptance"("conversationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "DisclaimerAcceptance_conversationId_userId_key" ON "DisclaimerAcceptance"("conversationId", "userId");

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyProfile" ADD CONSTRAINT "AttorneyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyServiceArea" ADD CONSTRAINT "AttorneyServiceArea_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneySpecialty" ADD CONSTRAINT "AttorneySpecialty_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttorneyLanguage" ADD CONSTRAINT "AttorneyLanguage_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_attorneyProfileId_fkey" FOREIGN KEY ("attorneyProfileId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_attorneyProfileId_fkey" FOREIGN KEY ("attorneyProfileId") REFERENCES "AttorneyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisclaimerAcceptance" ADD CONSTRAINT "DisclaimerAcceptance_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisclaimerAcceptance" ADD CONSTRAINT "DisclaimerAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
