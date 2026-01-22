import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { TicketsLayout } from "../components/TicketsLayout";
import { TicketsBreadcrumb } from "@/components/ui/global-breadcrumb";
import { useBu } from "@/contexts/BuContext";
import { useExternalUser } from "@/modules/external/hooks/useExternalUser";
import { SavedLinksPopover } from "@/shared/saved-links";

export default function TicketsPage() {
  const { currentBu } = useBu();
  const { isExternal } = useExternalUser();
  
  usePageTitle("Tickets", {
    customDescription: "Gerencie tickets internos e externos, acompanhe status, prazos e mensagens.",
  });

  return (
    <HubLayout>
      <div className="space-y-6">
        <TicketsBreadcrumb />
        <PageHeader
          title="Tickets"
          description={`Gerencie demandas internas e externas da ${currentBu?.name || 'organização'}`}
          actions={
            <div className="flex items-center gap-2">
              <SavedLinksPopover moduleSlug="tickets" />
              {!isExternal && (
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
