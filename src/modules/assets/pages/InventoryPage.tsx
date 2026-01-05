import { useState } from "react";
import { Package, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useInventory } from "../hooks/useInventory";
import { useAssetPermissions } from "../hooks/useAssetPermissions";
import { InventoryItemDialog } from "../components/inventory/InventoryItemDialog";
import { InventoryCard } from "../components/inventory/InventoryCard";
import { InventoryFilters } from "../components/inventory/InventoryFilters";
import type { AssetInventoryStatus } from "../types";

export default function InventoryPage() {
  const { items, isLoading } = useInventory();
  const { canManageInventory } = useAssetPermissions();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AssetInventoryStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.internal_code.toLowerCase().includes(search.toLowerCase()) ||
      (item.serial_number?.toLowerCase().includes(search.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
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
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com busca e ações */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-accent" : ""}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          {canManageInventory && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Item
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <InventoryFilters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
        />
      )}

      {/* Lista de itens */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum item encontrado"
          description={
            search || statusFilter !== "all" || categoryFilter !== "all"
              ? "Tente ajustar os filtros de busca"
              : "Cadastre o primeiro item do inventário"
          }
          actionLabel={canManageInventory && !search ? "Novo Item" : undefined}
          onAction={canManageInventory && !search ? () => setDialogOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <InventoryCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Dialog de criação */}
      <InventoryItemDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
