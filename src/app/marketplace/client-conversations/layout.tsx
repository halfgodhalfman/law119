import { ReactNode } from "react";
import { ClientRouteGuard } from "@/components/client/client-route-guard";

export default function ClientConversationsLayout({ children }: { children: ReactNode }) {
  return <ClientRouteGuard>{children}</ClientRouteGuard>;
}

