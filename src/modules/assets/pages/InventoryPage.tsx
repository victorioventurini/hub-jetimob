import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import type { AssetInventoryStatus } from "../types";

export default function InventoryPage() {
  const navigate = useNavigate();
  const { items, categories, isLoading } = useInventory();
  const { locations } = useLocations();
  
  // Allow any authenticated user to add items for now (permissions will be enforced on backend)
  const canAddItem = true;
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | AssetInventoryStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [holderFilter, setHolderFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  // Get unique holders from items for the filter
  const holders = items
    .filter(item => item.current_user)
    .map(item => item.current_user!)
    .filter((holder, index, self) => 
      self.findIndex(h => h.id === holder.id) === index
    )
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const filteredItems = items.filter((item) => {
    // Text search
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.internal_code.toLowerCase().includes(search.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    // Category filter - supports both category and subcategory
    let matchesCategory = categoryFilter === "all";
    if (!matchesCategory && item.category_id) {
      if (item.category_id === categoryFilter) {
        matchesCategory = true;
      } else {
        const selectedCategory = categories.find(c => c.id === categoryFilter);
        if (selectedCategory && !selectedCategory.parent_id) {
          const itemCategory = categories.find(c => c.id === item.category_id);
          if (itemCategory?.parent_id === categoryFilter) {
            matchesCategory = true;
          }
        }
      }
    }

    // Holder filter
    const matchesHolder = holderFilter === "all" || item.current_user_id === holderFilter;

    // Location filter - supports both headquarters and rooms
    let matchesLocation = locationFilter === "all";
    if (!matchesLocation) {
      // Check home_location or current_location
      const itemLocationId = item.home_location_id || item.current_location_id;
      if (itemLocationId) {
        if (itemLocationId === locationFilter) {
          matchesLocation = true;
        } else {
          // Check if filter is a parent location (headquarters)
          const selectedLocation = locations.find(l => l.id === locationFilter);
          if (selectedLocation && !selectedLocation.parent_location_id) {
            // It's a headquarters, check if item's location is a room within it
            const itemLocation = locations.find(l => l.id === itemLocationId);
            if (itemLocation?.parent_location_id === locationFilter) {
              matchesLocation = true;
            }
          }
        }
      }
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesHolder && matchesLocation;
  });

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
            <div key={item.id} onClick={() => navigate(`/assets/inventory/${item.id}`)}>
              <InventoryListItem item={item} />
            </div>
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