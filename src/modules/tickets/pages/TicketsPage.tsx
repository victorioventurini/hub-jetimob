import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { usePageTitle } from "@/hooks/usePageTitle";
import { TicketsLayout } from "../components/TicketsLayout";
import { TicketsBreadcrumb } from "@/components/ui/global-breadcrumb";

export default function TicketsPage() {
  usePageTitle("Tickets", {
    customDescription: "Gerencie tickets internos e externos, acompanhe status, prazos e mensagens.",
  });

  return (
    <HubLayout>
      <div className="container py-6 max-w-7xl">
        <TicketsBreadcrumb />
        <PageHeader
          title="Tickets"
          description="Gerencie demandas internas e externas da sua organização"
        />
        <TicketsLayout />
      </div>
    </HubLayout>
  );
}
