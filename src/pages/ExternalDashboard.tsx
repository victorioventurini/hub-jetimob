/**
 * External Dashboard Page
 * Dedicated page for external users (partner contacts)
 */
import { HubLayout } from "@/components/layout/HubLayout";
import { ExternalDashboard } from "@/modules/external";
import { useExternalUser } from "@/modules/external";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExternalDashboardPage() {
  const { isExternal, externalInfo, isLoading } = useExternalUser();

  if (isLoading) {
    return (
      <HubLayout>
        <div className="space-y-8">
          <Skeleton className="h-16 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </HubLayout>
    );
  }

  // If not external user, redirect to home
  if (!isExternal || !externalInfo) {
    return <Navigate to="/" replace />;
  }

  return (
    <HubLayout>
      <ExternalDashboard externalInfo={externalInfo} />
    </HubLayout>
  );
}
