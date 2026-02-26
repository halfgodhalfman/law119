export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuthContext } from "../../../../lib/auth-context";

export async function GET() {
  const auth = await requireAuthContext().catch(() => null);
  if (!auth) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: {
      id: auth.authUserId,
      role: auth.role,
      clientProfileId: auth.clientProfileId,
      attorneyProfileId: auth.attorneyProfileId,
    },
  });
}

