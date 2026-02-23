import { ClientRouteGuard } from "@/components/client/client-route-guard";
import ClientCenterPage from "@/app/marketplace/client-center/page";

export default function ClientDashboardAliasPage() {
  return (
    <ClientRouteGuard>
      <ClientCenterPage />
    </ClientRouteGuard>
  );
}
