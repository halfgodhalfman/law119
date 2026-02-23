import { requireAuthContext } from "./auth-context";

export async function requireAdminAuth() {
  const auth = await requireAuthContext().catch(() => null);
  if (!auth || auth.role !== "ADMIN") {
    throw new Error("ADMIN_ONLY");
  }
  return auth;
}

