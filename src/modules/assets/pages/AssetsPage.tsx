import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AssetsLayout } from "../components/AssetsLayout";
import { useBu } from "@/contexts/BuContext";
import { SavedLinksPopover } from "@/shared/saved-links";

export default function AssetsPage() {
  usePageTitle("Ativos", {
    customDescription: "Gerencie inventário, chaveiros e brindes corporativos no Hub."
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { currentBu } = useBu();

  // Redireciona para inventário se estiver na rota base /assets
  useEffect(() => {
    if (location.pathname === "/assets") {
      navigate("/assets/inventory", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Ativos"
          description={`Gerencie inventário, chaveiros e brindes da ${currentBu?.name || 'organização'}`}
          breadcrumbs={[{ label: "Ativos" }]}
          actions={<SavedLinksPopover moduleSlug="assets" />}
        />
        <AssetsLayout />
      </div>
    </HubLayout>
  );
}
