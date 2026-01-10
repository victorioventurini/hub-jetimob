import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Package, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useInventory } from "../hooks/useInventory";
import { useLocations } from "../hooks/useLocations";
import { InventoryListItem } from "../components/inventory/InventoryListItem";
import { InventoryFilters } from "../components/inventory/InventoryFilters";
import { InventoryFormDialog } from "../components/inventory/InventoryFormDialog";
import { useUrlState, useUrlSearch } from "@/shared/url";
import type { AssetInventoryStatus } from "../types";

export default function InventoryPage() {
  // URL State for server-side filtering
  const { value: search, set: setSearch } = useUrlSearch("q");
  const statusState = useUrlState<string>({ key: "status", defaultValue: "all" });
  const categoryState = useUrlState<string>({ key: "category", defaultValue: "all" });
  const holderState = useUrlState<string>({ key: "holder", defaultValue: "all" });
  const locationState = useUrlState<string>({ key: "location", defaultValue: "all" });
  
  const statusFilter = statusState.value as "all" | AssetInventoryStatus;
  const setStatusFilter = (v: "all" | AssetInventoryStatus) => statusState.set(v);
  const categoryFilter = categoryState.value;
  const setCategoryFilter = categoryState.set;
  const holderFilter = holderState.value;
  const setHolderFilter = holderState.set;
  const locationFilter = locationState.value;
  const setLocationFilter = locationState.set;

  // Pass filters to hook for server-side filtering
  const { items, categories, isLoading } = useInventory({
    search: search || undefined,
    statusFilter: statusFilter !== "all" ? statusFilter : undefined,
    categoryFilter: categoryFilter !== "all" ? categoryFilter : undefined,
    holderFilter: holderFilter !== "all" ? holderFilter : undefined,
    locationFilter: locationFilter !== "all" ? locationFilter : undefined,
  });
  const { locations } = useLocations();
  
  // Allow any authenticated user to add items for now (permissions will be enforced on backend)
  const canAddItem = true;
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

  // Client-side filter for hierarchical category/location (parent includes children)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter - supports parent category matching children
      if (categoryFilter !== "all" && item.category_id) {
        const selectedCategory = categories.find(c => c.id === categoryFilter);
        if (selectedCategory && !selectedCategory.parent_id) {
          // Parent category selected - check if item's category is a child
          const itemCategory = categories.find(c => c.id === item.category_id);
          if (itemCategory?.parent_id !== categoryFilter && item.category_id !== categoryFilter) {
            return false;
          }
        }
      }

      // Location filter - supports parent location matching children
      if (locationFilter !== "all") {
        const itemLocationId = item.home_location_id || item.current_location_id;
        if (itemLocationId) {
          const selectedLocation = locations.find(l => l.id === locationFilter);
          if (selectedLocation && !selectedLocation.parent_location_id) {
            // Headquarters selected - check if item's location is a room within it
            const itemLocation = locations.find(l => l.id === itemLocationId);
            if (itemLocation?.parent_location_id !== locationFilter && itemLocationId !== locationFilter) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [items, categoryFilter, locationFilter, categories, locations]);

  const hasActiveFilters = statusFilter !== "all" || categoryFilter !== "all" || holderFilter !== "all" || locationFilter !== "all";

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
      {/* Header with search and actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {canAddItem && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Item
          </Button>
        )}
      </div>

      {/* Filters - always visible */}
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
        <div className="space-y-1">
          {filteredItems.map((item) => (
            <Link key={item.id} to={`/assets/inventory/${item.id}`} className="block">
              <InventoryListItem item={item} />
            </Link>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <InventoryFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </div>
  );
}
