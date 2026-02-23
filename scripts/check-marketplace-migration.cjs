#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

const REQUIRED = {
  Case: [
    "subCategorySlug",
    "city",
    "descriptionMasked",
    "feeMode",
    "budgetMin",
    "budgetMax",
    "quoteDeadline",
    "selectedBidId",
  ],
  Bid: [
    "feeMode",
    "serviceScope",
    "estimatedDays",
    "includesConsultation",
    "version",
  ],
  BidVersion: [
    "id",
    "bidId",
    "version",
    "message",
    "feeQuoteMin",
    "feeQuoteMax",
    "feeMode",
    "serviceScope",
    "estimatedDays",
    "includesConsultation",
    "status",
    "createdAt",
  ],
  CaseStatusLog: ["id", "caseId", "fromStatus", "toStatus", "operatorId", "reason", "createdAt"],
};

async function getColumns(tableName) {
  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
    `,
    tableName,
  );
  return new Set(rows.map((r) => r.column_name));
}

async function main() {
  let failed = false;
  for (const [table, columns] of Object.entries(REQUIRED)) {
    const existing = await getColumns(table);
    const missing = columns.filter((c) => !existing.has(c));
    if (missing.length > 0) {
      failed = true;
      console.error(`✗ ${table}: missing columns -> ${missing.join(", ")}`);
    } else {
      console.log(`✓ ${table}: all required columns present`);
    }
  }

  await prisma.$disconnect();
  if (failed) process.exit(1);
}

main().catch(async (err) => {
  console.error("Migration check failed:", err?.message || err);
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
