import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";
import { createSupabaseServerClient } from "./supabase-server";
import { cookies } from "next/headers";
import { DEV_AUTH_COOKIE, getDevActorSeed, isDevAuthSwitchEnabled } from "./dev-auth-switch";

export type AuthContext = {
  authUserId: string;
  role: UserRole;
  clientProfileId: string | null;
  attorneyProfileId: string | null;
};

export async function requireAuthContext(): Promise<AuthContext> {
  if (isDevAuthSwitchEnabled()) {
    const cookieStore = await cookies();
    const devActorKey = cookieStore.get(DEV_AUTH_COOKIE)?.value ?? null;
    const devActor = getDevActorSeed(devActorKey);
    if (devActor) {
      const devUser = await prisma.user.findUnique({
        where: { id: devActor.userId },
        include: {
          clientProfile: { select: { id: true } },
          attorneyProfile: { select: { id: true } },
        },
      });
      if (devUser) {
        return {
          authUserId: devUser.id,
          role: devUser.role,
          clientProfileId: devUser.clientProfile?.id ?? null,
          attorneyProfileId: devUser.attorneyProfile?.id ?? null,
        };
      }
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    include: {
      clientProfile: { select: { id: true } },
      attorneyProfile: { select: { id: true } },
    },
  });

  if (!user) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  return {
    authUserId: user.id,
    role: user.role,
    clientProfileId: user.clientProfile?.id ?? null,
    attorneyProfileId: user.attorneyProfile?.id ?? null,
  };
}
