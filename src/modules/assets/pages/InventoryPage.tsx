import { useState, useMemo } from "react";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPageFilters } from "@/components/ui/list-page-filters";
import { ViewOptionsBar } from "@/components/ui/view-options-bar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useInventory, useLocations, useAssetPermissionsV2 } from "@/modules/assets/hooks";
import { InventoryTable } from "../components/inventory/InventoryTable";
import { InventoryFilters } from "../components/inventory/InventoryFilters";
import { InventoryFormDialog } from "../components/inventory/InventoryFormDialog";
import { useUrlState } from "@/shared/url";
import { isPast } from "date-fns";
import type { AssetInventoryStatus } from "../types";

export default function InventoryPage() {
  usePageTitle("Inventário", {
    customDescription: "Gerencie equipamentos, materiais e itens do inventário corporativo."
  });

  // URL State for filtering - NO debounce here, UrlSearchInput handles it
  const searchState = useUrlState<string>({ key: "q", defaultValue: "" });
  const search = searchState.value;
  const setSearch = searchState.set;
  const statusState = useUrlState<string>({ key: "status", defaultValue: "all" });
  const categoryState = useUrlState<string>({ key: "category", defaultValue: "all" });
  const holderState = useUrlState<string>({ key: "holder", defaultValue: "all" });
  const locationState = useUrlState<string>({ key: "location", defaultValue: "all" });
  const overdueState = useUrlState<string>({ key: "overdue", defaultValue: "" });
  
  const statusFilter = statusState.value as "all" | AssetInventoryStatus;
  const setStatusFilter = statusState.set;
  const categoryFilter = categoryState.value;
  const setCategoryFilter = categoryState.set;
  const holderFilter = holderState.value;
  const setHolderFilter = holderState.set;
  const locationFilter = locationState.value;
  const setLocationFilter = locationState.set;
  const overdueFilter = overdueState.value === "true";

  // Pass filters to hook - no pagination
  const { items, categories, isLoading } = useInventory({
    search: search || undefined,
    statusFilter: statusFilter !== "all" ? statusFilter : undefined,
    categoryFilter: categoryFilter !== "all" ? categoryFilter : undefined,
    holderFilter: holderFilter !== "all" ? holderFilter : undefined,
    locationFilter: locationFilter !== "all" ? locationFilter : undefined,
  });
  const { locations } = useLocations();
  
  // Use V2 permission system - respects impersonation
  const { canManageInventory } = useAssetPermissionsV2();
  const canAddItem = canManageInventory;
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get unique holders from items for the filter (client-side - small list)
  const holders = useMemo(() => 
    items
      .filter(item => item.current_user)
      .map(item => item.current_user!)
      .filter((holder, index, self) => 
        self.findIndex(h => h.id === holder.id) === index
      )
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [items]
  );

  // Client-side filter for hierarchical category/location (parent includes children) and overdue
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Overdue filter - only loaned items with expected_return_at in the past
      if (overdueFilter) {
        if (item.status !== "loaned" || !item.expected_return_at) return false;
        if (!isPast(new Date(item.expected_return_at))) return false;
      }

      // Category filter - supports both parent and child category matching
      if (categoryFilter !== "all") {
        if (!item.category_id) return false;
        
        const selectedCategory = categories.find(c => c.id === categoryFilter);
        if (!selectedCategory) return false;
        
        if (!selectedCategory.parent_id) {
          // Parent category selected - match if item is in parent OR any child
          const itemCategory = categories.find(c => c.id === item.category_id);
          if (item.category_id !== categoryFilter && itemCategory?.parent_id !== categoryFilter) {
            return false;
          }
        } else {
          // Subcategory selected - exact match required
          if (item.category_id !== categoryFilter) {
            return false;
          }
        }
      }

      // Location filter - supports parent location matching children
      if (locationFilter !== "all") {
        const itemLocationId = item.home_location_id || item.current_location_id;
        if (!itemLocationId) return false;
        
        const selectedLocation = locations.find(l => l.id === locationFilter);
        if (!selectedLocation) return false;
        
        if (!selectedLocation.parent_location_id) {
          // Headquarters selected - check if item's location is a room within it
          const itemLocation = locations.find(l => l.id === itemLocationId);
          if (itemLocationId !== locationFilter && itemLocation?.parent_location_id !== locationFilter) {
            return false;
          }
        } else {
          // Room/child location selected - exact match required
          if (itemLocationId !== locationFilter) {
            return false;
          }
        }
      }

      return true;
    });
  }, [items, categoryFilter, locationFilter, categories, locations, overdueFilter]);

  const hasActiveFilters = statusFilter !== "all" || categoryFilter !== "all" || holderFilter !== "all" || locationFilter !== "all" || overdueFilter;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
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
      {/* Linha 1: Busca + Filtros + Botão (tudo inline conforme padrão) */}
      <div className="flex flex-wrap items-center gap-3">
        <ListPageFilters
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome ou código..."
          searchClassName="w-full sm:w-auto sm:min-w-[220px]"
        >
          {/* Filtros inline com busca */}
          <InventoryFilters
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            holderFilter={holderFilter}
            onHolderChange={setHolderFilter}
            locationFilter={locationFilter}
            onLocationChange={setLocationFilter}
            categories={categories}
            holders={holders}
            locations={locations}
          />
        </ListPageFilters>
        
        {canAddItem && (
          <Button onClick={() => setDialogOpen(true)} className="shrink-0 ml-auto">
            <Plus className="h-4 w-4 mr-2" />
            Novo Item
          </Button>
        )}
      </div>

      {/* Linha 2: Contador de resultados */}
      <ViewOptionsBar
        resultCount={filteredItems.length}
        resultCountLabel="itens encontrados"
        resultCountLabelSingular="item encontrado"
      />

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum item encontrado"
          description={search || hasActiveFilters 
            ? "Tente ajustar os filtros" 
            : "Cadastre o primeiro item do inventário"}
          actionLabel={canAddItem && !search && !hasActiveFilters ? "Novo Item" : undefined}
          onAction={canAddItem && !search && !hasActiveFilters ? () => setDialogOpen(true) : undefined}
        />
      ) : (
        <InventoryTable items={filteredItems} />
      )}

      {/* Create dialog */}
      <InventoryFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </div>
  );
}
