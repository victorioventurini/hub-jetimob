import { useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AssetsLayout } from "../components/AssetsLayout";
import { useBu } from "@/contexts/BuContext";
import { SavedLinksPopover } from "@/shared/saved-links";
import { Lightbulb } from "lucide-react";

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
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/assets/recommendations">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Recomendações
                </Link>
              </Button>
              <SavedLinksPopover moduleSlug="assets" />
            </div>
          }
        />
        <AssetsLayout />
      </div>
    </HubLayout>
  );
}
