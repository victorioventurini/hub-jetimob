import { Settings, FolderTree, Key, Package } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAssetPermissionsV2 } from "@/modules/assets/hooks";
import { CategoriesTab } from "../components/settings/CategoriesTab";
import { ClaviculariesTab } from "../components/settings/ClaviculariesTab";
import { InventoryTab } from "../components/settings/InventoryTab";
import { useUrlTab } from "@/shared/url";

export default function AssetsSettingsPage() {
  usePageTitle("Configurações de Ativos", {
    customDescription: "Configure categorias, inventário e claviculários de ativos."
  });
  const { isAssetsAdmin, isLoading } = useAssetPermissionsV2();
  const [activeTab, setActiveTab] = useUrlTab("categories");

  if (!isAssetsAdmin) {
    return (
      <EmptyState
        icon={Settings}
        title="Acesso restrito"
        description="Apenas administradores do módulo podem acessar as configurações."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="categories" className="gap-2 flex-1 sm:flex-initial">
            <FolderTree className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias</span>
            <span className="sm:hidden text-xs">Categ.</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2 flex-1 sm:flex-initial">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Inventário</span>
            <span className="sm:hidden text-xs">Invent.</span>
          </TabsTrigger>
          <TabsTrigger value="clavicularies" className="gap-2 flex-1 sm:flex-initial">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">Claviculários</span>
            <span className="sm:hidden text-xs">Claves</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <InventoryTab />
        </TabsContent>

        <TabsContent value="clavicularies" className="mt-6">
          <ClaviculariesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
