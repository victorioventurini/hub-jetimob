import { Link } from "react-router-dom";
import { Plus, Settings } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { TicketsLayout } from "../components/TicketsLayout";
import { useBu } from "@/contexts/BuContext";
import { useExternalUser } from "@/modules/external/hooks/useExternalUser";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";
import { SavedLinksPopover } from "@/shared/saved-links";
import { usePermissions } from "@/hooks/usePermissions";

export default function TicketsPage() {
  const { currentBu } = useBu();
  const { isExternal } = useExternalUser();
  const { isImpersonating, impersonatedUser } = useOptionalImpersonation();
  const { has, isWildcard } = usePermissions();
  
  // Check if impersonating an external user
  const isViewingAsExternal = isImpersonating && impersonatedUser?.employmentStatus === "external";
  const canCreateTicket = !isExternal && !isViewingAsExternal;
  const canAccessSettings = isWildcard || has("tickets.settings.view");
  
  usePageTitle("Tickets", {
    customDescription: "Gerencie tickets internos e externos, acompanhe status, prazos e mensagens.",
  });

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Tickets"
          description={`Gerencie demandas internas e externas da ${currentBu?.name || 'organização'}`}
          breadcrumbs={[{ label: "Tickets" }]}
          actions={
            <div className="flex items-center gap-2">
              <SavedLinksPopover moduleSlug="tickets" />
              {canAccessSettings && (
                <Button asChild variant="outline" size="icon">
                  <Link to="/tickets/settings">
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Configurações</span>
                  </Link>
                </Button>
              )}
              {canCreateTicket && (
                <Button asChild>
                  <Link to="/tickets/new">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Novo Ticket</span>
                    <span className="sm:hidden">Novo</span>
                  </Link>
                </Button>
              )}
            </div>
          }
        />
        <TicketsLayout />
      </div>
    </HubLayout>
  );
}
