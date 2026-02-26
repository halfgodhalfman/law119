export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth || auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const onlyPending = searchParams.get("onlyPending") === "1";

    const rows = await prisma.attorneyProfile.findMany({
      where: {
        ...(onlyPending
          ? {
              OR: [
                { identityVerificationStatus: { in: ["PENDING", "NEEDS_INFO"] } },
                { barVerificationStatus: { in: ["PENDING", "NEEDS_INFO"] } },
              ],
            }
          : {}),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { firmName: { contains: q, mode: "insensitive" } },
                { barLicenseNumber: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        firmName: true,
        barState: true,
        barLicenseNumber: true,
        barVerifiedAt: true,
        barVerificationStatus: true,
        barVerificationNote: true,
        barRegisteredName: true,
        identityVerificationStatus: true,
        identityVerifiedAt: true,
        identityVerificationNote: true,
        identityDocumentType: true,
        identityDocumentFileName: true,
        registeredLegalName: true,
        reviewStatus: true,
        profileCompletenessScore: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ ok: true, items: rows });
  } catch (e) {
    console.error("GET /api/marketplace/admin/attorney-trust failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

