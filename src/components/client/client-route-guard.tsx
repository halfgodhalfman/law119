import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth-context";

export async function ClientRouteGuard({ children }: { children: ReactNode }) {
  const auth = await requireAuthContext().catch(() => null);
  if (!auth) {
    redirect("/auth/sign-in?role=client&mode=signin");
  }
  if (auth.role === "ATTORNEY") {
    redirect("/attorney/dashboard");
  }
  if (auth.role === "ADMIN") {
    redirect("/marketplace/admin/dashboard");
  }
  return <>{children}</>;
}

