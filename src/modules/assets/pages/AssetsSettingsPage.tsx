import { Settings, FolderTree, Key, Package } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAssetPermissions } from "../hooks/useAssetPermissions";
import { CategoriesTab } from "../components/settings/CategoriesTab";
import { ClaviculariesTab } from "../components/settings/ClaviculariesTab";
import { InventoryTab } from "../components/settings/InventoryTab";
import { useUrlTab } from "@/hooks/useUrlState";

export default function AssetsSettingsPage() {
  const { isAssetsAdmin, isLoading } = useAssetPermissions();
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
        <TabsList>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />
            Inventário
          </TabsTrigger>
          <TabsTrigger value="clavicularies" className="gap-2">
            <Key className="h-4 w-4" />
            Claviculários
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
