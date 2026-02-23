


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."BidStatus" AS ENUM (
    'PENDING',
    'WITHDRAWN',
    'ACCEPTED',
    'REJECTED'
);


ALTER TYPE "public"."BidStatus" OWNER TO "postgres";


CREATE TYPE "public"."CaseStatus" AS ENUM (
    'OPEN',
    'MATCHING',
    'CLOSED',
    'CANCELLED'
);


ALTER TYPE "public"."CaseStatus" OWNER TO "postgres";


CREATE TYPE "public"."ChatSenderRole" AS ENUM (
    'CLIENT',
    'ATTORNEY',
    'SYSTEM'
);


ALTER TYPE "public"."ChatSenderRole" OWNER TO "postgres";


CREATE TYPE "public"."ConversationRole" AS ENUM (
    'CLIENT',
    'ATTORNEY'
);


ALTER TYPE "public"."ConversationRole" OWNER TO "postgres";


CREATE TYPE "public"."ConversationStatus" AS ENUM (
    'OPEN',
    'CLOSED'
);


ALTER TYPE "public"."ConversationStatus" OWNER TO "postgres";


CREATE TYPE "public"."Language" AS ENUM (
    'MANDARIN',
    'CANTONESE',
    'ENGLISH'
);


ALTER TYPE "public"."Language" OWNER TO "postgres";


CREATE TYPE "public"."LegalCategory" AS ENUM (
    'IMMIGRATION',
    'CIVIL',
    'CRIMINAL',
    'FAMILY',
    'LABOR',
    'BUSINESS',
    'OTHER',
    'REAL_ESTATE',
    'ESTATE_PLAN',
    'TAX'
);


ALTER TYPE "public"."LegalCategory" OWNER TO "postgres";


CREATE TYPE "public"."UrgencyLevel" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


ALTER TYPE "public"."UrgencyLevel" OWNER TO "postgres";


CREATE TYPE "public"."UserRole" AS ENUM (
    'CLIENT',
    'ATTORNEY',
    'ADMIN'
);


ALTER TYPE "public"."UserRole" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."AttorneyLanguage" (
    "id" "text" NOT NULL,
    "attorneyId" "text" NOT NULL,
    "language" "public"."Language" NOT NULL
);


ALTER TABLE "public"."AttorneyLanguage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AttorneyProfile" (
    "id" "text" NOT NULL,
    "userId" "uuid" NOT NULL,
    "firstName" "text",
    "lastName" "text",
    "phone" "text",
    "firmName" "text",
    "barLicenseNumber" "text",
    "barNumberVerified" boolean DEFAULT false NOT NULL,
    "barVerifiedAt" timestamp(3) without time zone,
    "barState" character(2),
    "lawSchool" "text",
    "yearsExperience" integer,
    "bio" "text",
    "isVerified" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."AttorneyProfile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AttorneyServiceArea" (
    "id" "text" NOT NULL,
    "attorneyId" "text" NOT NULL,
    "stateCode" character(2) NOT NULL,
    "zipCode" character varying(10)
);


ALTER TABLE "public"."AttorneyServiceArea" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AttorneySpecialty" (
    "id" "text" NOT NULL,
    "attorneyId" "text" NOT NULL,
    "category" "public"."LegalCategory" NOT NULL
);


ALTER TABLE "public"."AttorneySpecialty" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Bid" (
    "id" "text" NOT NULL,
    "caseId" "text" NOT NULL,
    "attorneyProfileId" "text" NOT NULL,
    "message" "text",
    "feeQuoteMin" numeric(10,2),
    "feeQuoteMax" numeric(10,2),
    "status" "public"."BidStatus" DEFAULT 'PENDING'::"public"."BidStatus" NOT NULL,
    "contactedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Bid" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Case" (
    "id" "text" NOT NULL,
    "clientProfileId" "text",
    "title" "text" NOT NULL,
    "category" "public"."LegalCategory" NOT NULL,
    "stateCode" character(2) NOT NULL,
    "zipCode" character varying(10) NOT NULL,
    "description" "text" NOT NULL,
    "urgency" "public"."UrgencyLevel" DEFAULT 'MEDIUM'::"public"."UrgencyLevel" NOT NULL,
    "preferredLanguage" "public"."Language" NOT NULL,
    "status" "public"."CaseStatus" DEFAULT 'OPEN'::"public"."CaseStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "contactEmail" "text",
    "contactPhone" "text"
);


ALTER TABLE "public"."Case" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."CaseImage" (
    "id" "text" NOT NULL,
    "caseId" "text" NOT NULL,
    "storagePath" "text" NOT NULL,
    "url" "text" NOT NULL,
    "mimeType" "text",
    "sizeBytes" integer,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."CaseImage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ChatMessage" (
    "id" "text" NOT NULL,
    "conversationId" "text" NOT NULL,
    "senderUserId" "uuid",
    "senderRole" "public"."ChatSenderRole" NOT NULL,
    "body" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."ChatMessage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ClientProfile" (
    "id" "text" NOT NULL,
    "userId" "uuid" NOT NULL,
    "firstName" "text",
    "lastName" "text",
    "phone" "text",
    "zipCode" character varying(10),
    "preferredLanguage" "public"."Language",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."ClientProfile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Conversation" (
    "id" "text" NOT NULL,
    "bidId" "text" NOT NULL,
    "caseId" "text" NOT NULL,
    "clientProfileId" "text",
    "attorneyProfileId" "text" NOT NULL,
    "status" "public"."ConversationStatus" DEFAULT 'OPEN'::"public"."ConversationStatus" NOT NULL,
    "consultationAcceptedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Conversation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."DisclaimerAcceptance" (
    "id" "text" NOT NULL,
    "conversationId" "text" NOT NULL,
    "userId" "uuid" NOT NULL,
    "role" "public"."ConversationRole" NOT NULL,
    "acceptedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."DisclaimerAcceptance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."LegalSubCategory" (
    "id" "text" NOT NULL,
    "category" "public"."LegalCategory" NOT NULL,
    "slug" "text" NOT NULL,
    "nameZh" "text" NOT NULL,
    "nameEn" "text" NOT NULL,
    "group" "text",
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "hot" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."LegalSubCategory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."User" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_prisma_migrations" (
    "id" character varying(36) NOT NULL,
    "checksum" character varying(64) NOT NULL,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) NOT NULL,
    "logs" "text",
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applied_steps_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."_prisma_migrations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."AttorneyLanguage"
    ADD CONSTRAINT "AttorneyLanguage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AttorneyProfile"
    ADD CONSTRAINT "AttorneyProfile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AttorneyServiceArea"
    ADD CONSTRAINT "AttorneyServiceArea_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AttorneySpecialty"
    ADD CONSTRAINT "AttorneySpecialty_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Bid"
    ADD CONSTRAINT "Bid_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."CaseImage"
    ADD CONSTRAINT "CaseImage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Case"
    ADD CONSTRAINT "Case_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ClientProfile"
    ADD CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Conversation"
    ADD CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."DisclaimerAcceptance"
    ADD CONSTRAINT "DisclaimerAcceptance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."LegalSubCategory"
    ADD CONSTRAINT "LegalSubCategory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_prisma_migrations"
    ADD CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "AttorneyLanguage_attorneyId_language_key" ON "public"."AttorneyLanguage" USING "btree" ("attorneyId", "language");



CREATE UNIQUE INDEX "AttorneyProfile_userId_key" ON "public"."AttorneyProfile" USING "btree" ("userId");



CREATE INDEX "AttorneyServiceArea_attorneyId_stateCode_idx" ON "public"."AttorneyServiceArea" USING "btree" ("attorneyId", "stateCode");



CREATE UNIQUE INDEX "AttorneyServiceArea_attorneyId_stateCode_zipCode_key" ON "public"."AttorneyServiceArea" USING "btree" ("attorneyId", "stateCode", "zipCode");



CREATE INDEX "AttorneyServiceArea_zipCode_idx" ON "public"."AttorneyServiceArea" USING "btree" ("zipCode");



CREATE UNIQUE INDEX "AttorneySpecialty_attorneyId_category_key" ON "public"."AttorneySpecialty" USING "btree" ("attorneyId", "category");



CREATE INDEX "AttorneySpecialty_category_idx" ON "public"."AttorneySpecialty" USING "btree" ("category");



CREATE INDEX "Bid_attorneyProfileId_status_idx" ON "public"."Bid" USING "btree" ("attorneyProfileId", "status");



CREATE UNIQUE INDEX "Bid_caseId_attorneyProfileId_key" ON "public"."Bid" USING "btree" ("caseId", "attorneyProfileId");



CREATE INDEX "Bid_caseId_status_idx" ON "public"."Bid" USING "btree" ("caseId", "status");



CREATE INDEX "CaseImage_caseId_idx" ON "public"."CaseImage" USING "btree" ("caseId");



CREATE INDEX "Case_category_zipCode_status_idx" ON "public"."Case" USING "btree" ("category", "zipCode", "status");



CREATE INDEX "Case_clientProfileId_createdAt_idx" ON "public"."Case" USING "btree" ("clientProfileId", "createdAt");



CREATE INDEX "Case_stateCode_category_status_idx" ON "public"."Case" USING "btree" ("stateCode", "category", "status");



CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "public"."ChatMessage" USING "btree" ("conversationId", "createdAt");



CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "public"."ClientProfile" USING "btree" ("userId");



CREATE INDEX "Conversation_attorneyProfileId_status_createdAt_idx" ON "public"."Conversation" USING "btree" ("attorneyProfileId", "status", "createdAt");



CREATE UNIQUE INDEX "Conversation_bidId_key" ON "public"."Conversation" USING "btree" ("bidId");



CREATE INDEX "Conversation_clientProfileId_status_createdAt_idx" ON "public"."Conversation" USING "btree" ("clientProfileId", "status", "createdAt");



CREATE INDEX "DisclaimerAcceptance_conversationId_role_idx" ON "public"."DisclaimerAcceptance" USING "btree" ("conversationId", "role");



CREATE UNIQUE INDEX "DisclaimerAcceptance_conversationId_userId_key" ON "public"."DisclaimerAcceptance" USING "btree" ("conversationId", "userId");



CREATE INDEX "LegalSubCategory_category_idx" ON "public"."LegalSubCategory" USING "btree" ("category");



CREATE INDEX "LegalSubCategory_hot_idx" ON "public"."LegalSubCategory" USING "btree" ("hot");



CREATE UNIQUE INDEX "LegalSubCategory_slug_key" ON "public"."LegalSubCategory" USING "btree" ("slug");



CREATE UNIQUE INDEX "User_email_key" ON "public"."User" USING "btree" ("email");



CREATE INDEX "User_role_idx" ON "public"."User" USING "btree" ("role");



ALTER TABLE ONLY "public"."AttorneyLanguage"
    ADD CONSTRAINT "AttorneyLanguage_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "public"."AttorneyProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."AttorneyProfile"
    ADD CONSTRAINT "AttorneyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."AttorneyServiceArea"
    ADD CONSTRAINT "AttorneyServiceArea_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "public"."AttorneyProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."AttorneySpecialty"
    ADD CONSTRAINT "AttorneySpecialty_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "public"."AttorneyProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Bid"
    ADD CONSTRAINT "Bid_attorneyProfileId_fkey" FOREIGN KEY ("attorneyProfileId") REFERENCES "public"."AttorneyProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Bid"
    ADD CONSTRAINT "Bid_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."Case"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."CaseImage"
    ADD CONSTRAINT "CaseImage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."Case"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Case"
    ADD CONSTRAINT "Case_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "public"."ClientProfile"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ChatMessage"
    ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ChatMessage"
    ADD CONSTRAINT "ChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ClientProfile"
    ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Conversation"
    ADD CONSTRAINT "Conversation_attorneyProfileId_fkey" FOREIGN KEY ("attorneyProfileId") REFERENCES "public"."AttorneyProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Conversation"
    ADD CONSTRAINT "Conversation_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "public"."Bid"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Conversation"
    ADD CONSTRAINT "Conversation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."Case"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Conversation"
    ADD CONSTRAINT "Conversation_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "public"."ClientProfile"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."DisclaimerAcceptance"
    ADD CONSTRAINT "DisclaimerAcceptance_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."DisclaimerAcceptance"
    ADD CONSTRAINT "DisclaimerAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE "public"."ChatMessage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Conversation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."DisclaimerAcceptance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chatmessage_insert_participants" ON "public"."ChatMessage" FOR INSERT TO "authenticated" WITH CHECK ((("senderUserId" = "auth"."uid"()) AND ((EXISTS ( SELECT 1
   FROM ("public"."Conversation" "c"
     JOIN "public"."ClientProfile" "cp" ON (("cp"."id" = "c"."clientProfileId")))
  WHERE (("c"."id" = "ChatMessage"."conversationId") AND ("cp"."userId" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."Conversation" "c"
     JOIN "public"."AttorneyProfile" "ap" ON (("ap"."id" = "c"."attorneyProfileId")))
  WHERE (("c"."id" = "ChatMessage"."conversationId") AND ("ap"."userId" = "auth"."uid"())))))));



CREATE POLICY "chatmessage_select_participants" ON "public"."ChatMessage" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."Conversation" "c"
     JOIN "public"."ClientProfile" "cp" ON (("cp"."id" = "c"."clientProfileId")))
  WHERE (("c"."id" = "ChatMessage"."conversationId") AND ("cp"."userId" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."Conversation" "c"
     JOIN "public"."AttorneyProfile" "ap" ON (("ap"."id" = "c"."attorneyProfileId")))
  WHERE (("c"."id" = "ChatMessage"."conversationId") AND ("ap"."userId" = "auth"."uid"()))))));



CREATE POLICY "conversation_select_participants" ON "public"."Conversation" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."ClientProfile" "cp"
  WHERE (("cp"."id" = "Conversation"."clientProfileId") AND ("cp"."userId" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."AttorneyProfile" "ap"
  WHERE (("ap"."id" = "Conversation"."attorneyProfileId") AND ("ap"."userId" = "auth"."uid"()))))));



CREATE POLICY "conversation_update_client_accept" ON "public"."Conversation" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ClientProfile" "cp"
  WHERE (("cp"."id" = "Conversation"."clientProfileId") AND ("cp"."userId" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ClientProfile" "cp"
  WHERE (("cp"."id" = "Conversation"."clientProfileId") AND ("cp"."userId" = "auth"."uid"())))));



CREATE POLICY "disclaimer_insert_self" ON "public"."DisclaimerAcceptance" FOR INSERT TO "authenticated" WITH CHECK (("userId" = "auth"."uid"()));



CREATE POLICY "disclaimer_select_participants" ON "public"."DisclaimerAcceptance" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."Conversation" "c"
     JOIN "public"."ClientProfile" "cp" ON (("cp"."id" = "c"."clientProfileId")))
  WHERE (("c"."id" = "DisclaimerAcceptance"."conversationId") AND ("cp"."userId" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."Conversation" "c"
     JOIN "public"."AttorneyProfile" "ap" ON (("ap"."id" = "c"."attorneyProfileId")))
  WHERE (("c"."id" = "DisclaimerAcceptance"."conversationId") AND ("ap"."userId" = "auth"."uid"()))))));



CREATE POLICY "disclaimer_update_self" ON "public"."DisclaimerAcceptance" FOR UPDATE TO "authenticated" USING (("userId" = "auth"."uid"())) WITH CHECK (("userId" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ChatMessage";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON TABLE "public"."AttorneyLanguage" TO "anon";
GRANT ALL ON TABLE "public"."AttorneyLanguage" TO "authenticated";
GRANT ALL ON TABLE "public"."AttorneyLanguage" TO "service_role";



GRANT ALL ON TABLE "public"."AttorneyProfile" TO "anon";
GRANT ALL ON TABLE "public"."AttorneyProfile" TO "authenticated";
GRANT ALL ON TABLE "public"."AttorneyProfile" TO "service_role";



GRANT ALL ON TABLE "public"."AttorneyServiceArea" TO "anon";
GRANT ALL ON TABLE "public"."AttorneyServiceArea" TO "authenticated";
GRANT ALL ON TABLE "public"."AttorneyServiceArea" TO "service_role";



GRANT ALL ON TABLE "public"."AttorneySpecialty" TO "anon";
GRANT ALL ON TABLE "public"."AttorneySpecialty" TO "authenticated";
GRANT ALL ON TABLE "public"."AttorneySpecialty" TO "service_role";



GRANT ALL ON TABLE "public"."Bid" TO "anon";
GRANT ALL ON TABLE "public"."Bid" TO "authenticated";
GRANT ALL ON TABLE "public"."Bid" TO "service_role";



GRANT ALL ON TABLE "public"."Case" TO "anon";
GRANT ALL ON TABLE "public"."Case" TO "authenticated";
GRANT ALL ON TABLE "public"."Case" TO "service_role";



GRANT ALL ON TABLE "public"."CaseImage" TO "anon";
GRANT ALL ON TABLE "public"."CaseImage" TO "authenticated";
GRANT ALL ON TABLE "public"."CaseImage" TO "service_role";



GRANT ALL ON TABLE "public"."ChatMessage" TO "anon";
GRANT ALL ON TABLE "public"."ChatMessage" TO "authenticated";
GRANT ALL ON TABLE "public"."ChatMessage" TO "service_role";



GRANT ALL ON TABLE "public"."ClientProfile" TO "anon";
GRANT ALL ON TABLE "public"."ClientProfile" TO "authenticated";
GRANT ALL ON TABLE "public"."ClientProfile" TO "service_role";



GRANT ALL ON TABLE "public"."Conversation" TO "anon";
GRANT ALL ON TABLE "public"."Conversation" TO "authenticated";
GRANT ALL ON TABLE "public"."Conversation" TO "service_role";



GRANT ALL ON TABLE "public"."DisclaimerAcceptance" TO "anon";
GRANT ALL ON TABLE "public"."DisclaimerAcceptance" TO "authenticated";
GRANT ALL ON TABLE "public"."DisclaimerAcceptance" TO "service_role";



GRANT ALL ON TABLE "public"."LegalSubCategory" TO "anon";
GRANT ALL ON TABLE "public"."LegalSubCategory" TO "authenticated";
GRANT ALL ON TABLE "public"."LegalSubCategory" TO "service_role";



GRANT ALL ON TABLE "public"."User" TO "anon";
GRANT ALL ON TABLE "public"."User" TO "authenticated";
GRANT ALL ON TABLE "public"."User" TO "service_role";



GRANT ALL ON TABLE "public"."_prisma_migrations" TO "anon";
GRANT ALL ON TABLE "public"."_prisma_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."_prisma_migrations" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































