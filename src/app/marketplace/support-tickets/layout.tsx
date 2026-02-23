import { ReactNode } from "react";
import { ClientRouteGuard } from "@/components/client/client-route-guard";

export default function SupportTicketsLayout({ children }: { children: ReactNode }) {
  return <ClientRouteGuard>{children}</ClientRouteGuard>;
}

