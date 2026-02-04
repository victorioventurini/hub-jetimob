import { useState, useMemo } from "react";
import { Gift, Plus, AlertTriangle, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ListPageFilters } from "@/components/ui/list-page-filters";
import { useGifts, useAssetPermissionsV2 } from "@/modules/assets/hooks";
import { GiftsTable } from "../components/gifts/GiftsTable";
import { GiftItemDialog } from "../components/gifts/GiftItemDialog";
import { GiftMovementDialog } from "../components/gifts/GiftMovementDialog";
import { useUrlState } from "@/shared/url";

export default function GiftsPage() {
  // URL State for filtering
  const searchState = useUrlState<string>({ key: "q", defaultValue: "" });
  const lowStockState = useUrlState<string>({ key: "lowStock", defaultValue: "" });
  const search = searchState.value;
  const setSearch = searchState.set;
  const lowStockFilter = lowStockState.value === "true";
  
  const { items, batches, getItemTotals, isLoading: isLoadingGifts } = useGifts({
    search: search || undefined,
  });
  const { canManageGifts, isLoading: isLoadingPermissions } = useAssetPermissionsV2();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);

  const isLoading = isLoadingGifts || isLoadingPermissions;

  // Itens com estoque baixo (menos de 10)
  const lowStockItems = items.filter((item) => {
    const { availableQuantity } = getItemTotals(item.id);
    return availableQuantity > 0 && availableQuantity < 10;
  });

  // Filter items if lowStock filter is active
  const filteredItems = useMemo(() => {
    if (!lowStockFilter) return items;
    return items.filter(item => lowStockItems.some(low => low.id === item.id));
  }, [items, lowStockItems, lowStockFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alerta de estoque baixo */}
      {lowStockItems.length > 0 && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {lowStockItems.length} item(ns) com estoque baixo:{" "}
            {lowStockItems.map((item) => item.name).join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {/* Header com busca e ações */}
      <div className="flex flex-col sm:flex-row gap-4">
        <ListPageFilters
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome ou categoria..."
          className="flex-1"
        />
        {canManageGifts && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => setMovementDialogOpen(true)}>
              <ArrowUp className="h-4 w-4 mr-2" />
              Registrar Saída
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Brinde
            </Button>
          </div>
        )}
      </div>

      {/* Tabela de brindes */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Nenhum brinde encontrado"
          description={search || lowStockFilter
            ? "Tente ajustar os filtros" 
            : "Cadastre o primeiro item de brinde"}
          actionLabel={canManageGifts && !search && !lowStockFilter ? "Novo Brinde" : undefined}
          onAction={canManageGifts && !search && !lowStockFilter ? () => setDialogOpen(true) : undefined}
        />
      ) : (
        <GiftsTable 
          items={filteredItems} 
          batches={batches} 
          getItemTotals={getItemTotals}
        />
      )}

      {/* Dialogs */}
      <GiftItemDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <GiftMovementDialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen} />
    </div>
  );
}
