import { FileBarChart, Package, Key, Gift, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventory } from "../hooks/useInventory";
import { useKeys } from "../hooks/useKeys";
import { useGifts } from "../hooks/useGifts";
import { useAssetPermissions } from "../hooks/useAssetPermissions";
import { EmptyState } from "@/components/ui/empty-state";

export default function AssetsReportsPage() {
  const { items: inventoryItems, isLoading: loadingInventory } = useInventory();
  const { keyrings, isLoading: loadingKeys } = useKeys();
  const { items: giftItems, getItemTotals, isLoading: loadingGifts } = useGifts();
  const { canManageInventory, canManageKeys, canManageGifts, canView } = useAssetPermissions();

  const isLoading = loadingInventory || loadingKeys || loadingGifts;

  if (!canView) {
    return (
      <EmptyState
        icon={FileBarChart}
        title="Sem permissão"
        description="Você não tem permissão para visualizar relatórios de assets."
      />
    );
  }

  // Métricas de Inventário
  const inventoryStats = {
    total: inventoryItems.length,
    available: inventoryItems.filter((i) => i.status === "available").length,
    loaned: inventoryItems.filter((i) => i.status === "loaned").length,
    maintenance: inventoryItems.filter((i) => i.status === "maintenance").length,
  };

  // Métricas de Chaves
  const keysStats = {
    total: keyrings.length,
    available: keyrings.filter((k) => k.status === "available").length,
    loaned: keyrings.filter((k) => k.status === "loaned").length,
    lost: keyrings.filter((k) => k.status === "lost").length,
  };

  // Métricas de Brindes
  const giftStats = {
    totalItems: giftItems.length,
    totalStock: giftItems.reduce((acc, item) => acc + getItemTotals(item.id).availableQuantity, 0),
    lowStock: giftItems.filter((item) => {
      const { availableQuantity } = getItemTotals(item.id);
      return availableQuantity > 0 && availableQuantity < 10;
    }).length,
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Inventário */}
        {canManageInventory && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Inventário</CardTitle>
              </div>
              <CardDescription>Visão geral dos ativos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total de itens</span>
                  <span className="font-semibold">{inventoryStats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Disponíveis</span>
                  <span className="font-semibold text-green-600">{inventoryStats.available}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Emprestados</span>
                  <span className="font-semibold text-blue-600">{inventoryStats.loaned}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Em manutenção</span>
                  <span className="font-semibold text-amber-600">{inventoryStats.maintenance}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card Chaves */}
        {canManageKeys && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Key className="h-5 w-5 text-amber-600" />
                </div>
                <CardTitle className="text-lg">Chaves</CardTitle>
              </div>
              <CardDescription>Status dos chaveiros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total de chaveiros</span>
                  <span className="font-semibold">{keysStats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Disponíveis</span>
                  <span className="font-semibold text-green-600">{keysStats.available}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Emprestados</span>
                  <span className="font-semibold text-blue-600">{keysStats.loaned}</span>
                </div>
                {keysStats.lost > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-destructive flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Extraviados
                    </span>
                    <span className="font-semibold text-destructive">{keysStats.lost}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card Brindes */}
        {canManageGifts && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-pink-500/10">
                  <Gift className="h-5 w-5 text-pink-600" />
                </div>
                <CardTitle className="text-lg">Brindes</CardTitle>
              </div>
              <CardDescription>Controle de estoque</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tipos de brindes</span>
                  <span className="font-semibold">{giftStats.totalItems}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total em estoque</span>
                  <span className="font-semibold text-green-600">{giftStats.totalStock}</span>
                </div>
                {giftStats.lowStock > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Estoque baixo
                    </span>
                    <span className="font-semibold text-amber-600">{giftStats.lowStock}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
