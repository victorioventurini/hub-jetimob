import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { usePageTitle } from "@/hooks/usePageTitle";
import { TicketsLayout } from "../components/TicketsLayout";

export default function TicketsPage() {
  usePageTitle("Tickets");
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to list if at base /tickets
  useEffect(() => {
    if (location.pathname === "/tickets") {
      // Stay on this page - it shows the list
    }
  }, [location.pathname, navigate]);

  return (
    <HubLayout>
      <div className="container py-6 max-w-7xl">
        <PageHeader
          title="Tickets"
          description="Gerencie demandas internas e externas da sua organização"
        />
        <TicketsLayout />
      </div>
    </HubLayout>
  );
}
