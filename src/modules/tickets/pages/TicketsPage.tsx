import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Tickets</h1>
          <p className="text-muted-foreground">
            Gerencie demandas internas e externas da sua organização
          </p>
        </div>
        <TicketsLayout />
      </div>
    </HubLayout>
  );
}
