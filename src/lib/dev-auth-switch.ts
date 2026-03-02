import { Language, LegalCategory, UserRole } from "@prisma/client";
import { prisma } from "./prisma";

export const DEV_AUTH_COOKIE = "law119_dev_actor";

export type DevActorKey = "client" | "attorney" | "admin";

type DevActorSeed = {
  key: DevActorKey;
  userId: string;
  email: string;
  role: UserRole;
  label: string;
};

export const DEV_ACTORS: DevActorSeed[] = [
  {
    key: "client",
    userId: "11111111-1111-4111-8111-111111111111",
    email: "dev.client@law119.local",
    role: "CLIENT",
    label: "开发客户",
  },
  {
    key: "attorney",
    userId: "22222222-2222-4222-8222-222222222222",
    email: "dev.attorney@law119.local",
    role: "ATTORNEY",
    label: "开发律师",
  },
  {
    key: "admin",
    userId: "33333333-3333-4333-8333-333333333333",
    email: "dev.admin@law119.local",
    role: "ADMIN",
    label: "开发管理员",
  },
];

export function isDevAuthSwitchEnabled() {
  // Security: Only allow dev auth switch in strictly local development.
  // Guards (all must pass):
  // 1. Must NOT be production NODE_ENV
  // 2. Must NOT be running on Vercel at all (covers preview/staging/dev)
  // 3. Must NOT be Railway, Render, Fly.io, or other cloud environments
  // 4. Must have explicit opt-in via DEV_AUTH_ENABLED=true
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.VERCEL === "1") return false;
  if (process.env.VERCEL_ENV) return false; // "production" | "preview" | "development"
  if (process.env.RAILWAY_ENVIRONMENT) return false; // Railway.app
  if (process.env.RENDER) return false;              // Render.com
  if (process.env.FLY_APP_NAME) return false;        // Fly.io
  if (process.env.K_SERVICE) return false;           // Google Cloud Run
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return false; // AWS Lambda
  if (process.env.DYNO) return false;                // Heroku
  return process.env.DEV_AUTH_ENABLED === "true";
}

/**
 * 安全：校验当前请求是否来自允许的本地 IP（127.0.0.1 / ::1）
 * 在 isDevAuthSwitchEnabled() = true 时额外验证
 */
export function isLocalOriginRequest(request: Request): boolean {
  const LOCAL_IPS = new Set(["127.0.0.1", "::1", "localhost", "::ffff:127.0.0.1"]);
  const forwarded = request.headers.get("x-forwarded-for")?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  // No forwarding headers → direct local request
  if (!forwarded && !realIp) return true;
  // Next.js 15 dev server may set forwarding headers even for local requests.
  // Allow if ALL forwarded IPs resolve to localhost.
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    if (!ips.every((ip) => LOCAL_IPS.has(ip))) return false;
  }
  if (realIp && !LOCAL_IPS.has(realIp)) return false;
  return true;
}

export function getDevActorSeed(key: string | null | undefined) {
  if (!key) return null;
  return DEV_ACTORS.find((actor) => actor.key === key) ?? null;
}

export async function ensureDevActor(key: DevActorKey) {
  const actor = getDevActorSeed(key);
  if (!actor) throw new Error("INVALID_DEV_ACTOR");

  await prisma.user.upsert({
    where: { id: actor.userId },
    update: { email: actor.email, role: actor.role },
    create: { id: actor.userId, email: actor.email, role: actor.role },
  });

  if (actor.role === "CLIENT") {
    await prisma.clientProfile.upsert({
      where: { userId: actor.userId },
      update: {
        firstName: "Dev",
        lastName: "Client",
        phone: "(555) 010-1119",
        zipCode: "90012",
        preferredLanguage: Language.MANDARIN,
      },
      create: {
        userId: actor.userId,
        firstName: "Dev",
        lastName: "Client",
        phone: "(555) 010-1119",
        zipCode: "90012",
        preferredLanguage: Language.MANDARIN,
      },
    });
  }

  if (actor.role === "ATTORNEY") {
    const attorney = await prisma.attorneyProfile.upsert({
      where: { userId: actor.userId },
      update: {
        firstName: "Dev",
        lastName: "Attorney",
        phone: "(555) 010-2222",
        firmName: "Law119 Dev Firm",
        barLicenseNumber: "DEV-ATTY-119",
        barNumberVerified: true,
        barVerifiedAt: new Date(),
        barState: "CA",
        yearsExperience: 10,
        bio: "Local development attorney account",
        isVerified: true,
      },
      create: {
        userId: actor.userId,
        firstName: "Dev",
        lastName: "Attorney",
        phone: "(555) 010-2222",
        firmName: "Law119 Dev Firm",
        barLicenseNumber: "DEV-ATTY-119",
        barNumberVerified: true,
        barVerifiedAt: new Date(),
        barState: "CA",
        yearsExperience: 10,
        bio: "Local development attorney account",
        isVerified: true,
      },
      select: { id: true },
    });

    await prisma.attorneyServiceArea.createMany({
      data: [
        { attorneyId: attorney.id, stateCode: "CA" },
        { attorneyId: attorney.id, stateCode: "NY" },
      ],
      skipDuplicates: true,
    });
    await prisma.attorneySpecialty.createMany({
      data: [
        { attorneyId: attorney.id, category: LegalCategory.IMMIGRATION },
        { attorneyId: attorney.id, category: LegalCategory.FAMILY },
      ],
      skipDuplicates: true,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    include: {
      clientProfile: { select: { id: true } },
      attorneyProfile: { select: { id: true } },
    },
  });
  if (!user) throw new Error("DEV_ACTOR_CREATE_FAILED");
  return user;
}

