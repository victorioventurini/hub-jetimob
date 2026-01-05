import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Plus, Search, Filter, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useInventory } from "../hooks/useInventory";
import { useAssetPermissions } from "../hooks/useAssetPermissions";
import { InventoryCard } from "../components/inventory/InventoryCard";
import { InventoryFilters } from "../components/inventory/InventoryFilters";
import { InventoryFormDialog } from "../components/inventory/InventoryFormDialog";
import type { AssetInventoryStatus } from "../types";

export default function InventoryPage() {
  const navigate = useNavigate();
  const { items, isLoading } = useInventory();
  const { isInventoryAdmin, canManageInventory } = useAssetPermissions();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | AssetInventoryStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredItems = items.filter((item) => {
    // Text search
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.internal_code.toLowerCase().includes(search.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    // Category filter
    const matchesCategory = categoryFilter === "all" || item.category_id === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-accent" : ""}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          {isInventoryAdmin && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Item
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <InventoryFilters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
        />
      )}

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum item encontrado"
          description={search || statusFilter !== "all" ? "Tente ajustar os filtros" : "Cadastre o primeiro item do inventário"}
          actionLabel={isInventoryAdmin && !search && statusFilter === "all" ? "Novo Item" : undefined}
          onAction={isInventoryAdmin && !search && statusFilter === "all" ? () => setDialogOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} onClick={() => navigate(`/assets/inventory/${item.id}`)}>
              <InventoryCard item={item} />
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <InventoryFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}