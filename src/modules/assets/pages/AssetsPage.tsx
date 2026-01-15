import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AssetsLayout } from "../components/AssetsLayout";
import { AssetsBreadcrumb } from "@/components/ui/global-breadcrumb";
import { useBu } from "@/contexts/BuContext";
import { SavedLinksPopover } from "@/shared/saved-links";

export default function AssetsPage() {
  usePageTitle("Assets");
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
        <AssetsBreadcrumb />
        <PageHeader
          title="Assets"
          description={`Gerencie inventário, chaves e brindes da ${currentBu?.name || 'organização'}`}
          actions={<SavedLinksPopover moduleSlug="assets" />}
        />
        <AssetsLayout />
      </div>
    </HubLayout>
  );
}
