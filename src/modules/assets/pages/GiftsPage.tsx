import { useState } from "react";
import { Gift, Plus, AlertTriangle, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGifts, useAssetPermissionsV2 } from "@/modules/assets/hooks";
import { GiftItemCard } from "../components/gifts/GiftItemCard";
import { GiftItemDialog } from "../components/gifts/GiftItemDialog";
import { GiftMovementDialog } from "../components/gifts/GiftMovementDialog";
import { UrlSearchInput } from "@/shared/filters";
import { useUrlState } from "@/shared/url";

export default function GiftsPage() {
  // URL State for filtering
  const searchState = useUrlState<string>({ key: "q", defaultValue: "" });
  const search = searchState.value;
  const setSearch = searchState.set;
  
  const { items, batches, getItemTotals, isLoading: isLoadingGifts } = useGifts({
    search: search || undefined,
  });
  const { canManageGifts, isGiftsAdmin, isLoading: isLoadingPermissions } = useAssetPermissionsV2();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);

  const isLoading = isLoadingGifts || isLoadingPermissions;

  // Itens com estoque baixo (menos de 10)
  const lowStockItems = items.filter((item) => {
    const { availableQuantity } = getItemTotals(item.id);
    return availableQuantity > 0 && availableQuantity < 10;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
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
        <UrlSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome ou categoria..."
          className="flex-1"
          debounceMs={300}
        />
        {canManageGifts && (
          <>
            <Button variant="outline" onClick={() => setMovementDialogOpen(true)}>
              <ArrowUp className="h-4 w-4 mr-2" />
              Registrar Saída
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Brinde
            </Button>
          </>
        )}
      </div>

      {/* Grid de brindes */}
      {items.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Nenhum brinde cadastrado"
          description={search 
            ? "Tente ajustar a busca" 
            : "Cadastre o primeiro item de brinde"}
          actionLabel={canManageGifts && !search ? "Novo Brinde" : undefined}
          onAction={canManageGifts && !search ? () => setDialogOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <GiftItemCard
              key={item.id}
              item={item}
              totals={getItemTotals(item.id)}
              batches={batches.filter((b) => b.gift_item_id === item.id)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <GiftItemDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <GiftMovementDialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen} />
    </div>
  );
}
