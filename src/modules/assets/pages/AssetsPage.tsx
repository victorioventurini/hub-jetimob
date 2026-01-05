import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AssetsLayout } from "../components/AssetsLayout";

export default function AssetsPage() {
  usePageTitle("Assets");
  const navigate = useNavigate();
  const location = useLocation();

  // Redireciona para inventário se estiver na rota base /assets
  useEffect(() => {
    if (location.pathname === "/assets") {
      navigate("/assets/inventory", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <HubLayout>
      <div className="container py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Assets</h1>
          <p className="text-muted-foreground">
            Gerencie inventário, chaves e brindes da sua organização
          </p>
        </div>
        <AssetsLayout />
      </div>
    </HubLayout>
  );
}
