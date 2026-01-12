import { useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AssetsLayout } from "../components/AssetsLayout";
import { AssetsBreadcrumb } from "@/components/ui/global-breadcrumb";
import { useBu } from "@/contexts/BuContext";

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
        />
        <AssetsLayout />
      </div>
    </HubLayout>
  );
}
