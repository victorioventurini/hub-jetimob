import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useInventory } from "../hooks/useInventory";
import { useLocations } from "../hooks/useLocations";
import { InventoryListItem } from "../components/inventory/InventoryListItem";
import { InventoryFilters } from "../components/inventory/InventoryFilters";
import { InventoryFormDialog } from "../components/inventory/InventoryFormDialog";
import { UrlPagination, UrlSearchInput } from "@/shared/filters";
import { useUrlState, useUrlSearch, parsers } from "@/shared/url";
import type { AssetInventoryStatus } from "../types";

export default function InventoryPage() {
  // URL State for server-side filtering
  const { value: search, set: setSearch } = useUrlSearch("q");
  const statusState = useUrlState<string>({ key: "status", defaultValue: "all" });
  const categoryState = useUrlState<string>({ key: "category", defaultValue: "all" });
  const holderState = useUrlState<string>({ key: "holder", defaultValue: "all" });
  const locationState = useUrlState<string>({ key: "location", defaultValue: "all" });
  
  // Pagination URL state
  const pageState = useUrlState<number>({ key: "page", defaultValue: 1, parse: parsers.number });
  const pageSizeState = useUrlState<number>({ key: "pageSize", defaultValue: 25, parse: parsers.number });
  const page = pageState.value;
  const setPage = pageState.set;
  const pageSize = pageSizeState.value;
  const setPageSize = pageSizeState.set;
  
  const statusFilter = statusState.value as "all" | AssetInventoryStatus;
  const setStatusFilter = (v: "all" | AssetInventoryStatus) => {
    statusState.set(v);
    setPage(1); // Reset page on filter change
  };
  const categoryFilter = categoryState.value;
  const setCategoryFilter = (v: string) => {
    categoryState.set(v);
    setPage(1);
  };
  const holderFilter = holderState.value;
  const setHolderFilter = (v: string) => {
    holderState.set(v);
    setPage(1);
  };
  const locationFilter = locationState.value;
  const setLocationFilter = (v: string) => {
    locationState.set(v);
    setPage(1);
  };

  // Pass filters to hook for server-side filtering with pagination
  const { items, categories, total, totalPages, isLoading } = useInventory({
    search: search || undefined,
    statusFilter: statusFilter !== "all" ? statusFilter : undefined,
    categoryFilter: categoryFilter !== "all" ? categoryFilter : undefined,
    holderFilter: holderFilter !== "all" ? holderFilter : undefined,
    locationFilter: locationFilter !== "all" ? locationFilter : undefined,
    page,
    pageSize,
  });
  const { locations } = useLocations();
  
  // Allow any authenticated user to add items for now (permissions will be enforced on backend)
  const canAddItem = true;
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Handle search with page reset
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  
  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

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
        <UrlSearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Buscar por nome ou código..."
          className="flex-1"
          debounceMs={300}
        />
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

      {/* Pagination */}
      {total > 0 && (
        <UrlPagination
          page={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Create dialog */}
      <InventoryFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </div>
  );
}
