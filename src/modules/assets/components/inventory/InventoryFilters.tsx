import { AssetStatusSelect, BuLocationSelect } from "@/components/selects";
import { BuUserSelect } from "@/components/selects";
import type { AssetInventoryStatus, AssetCategory } from "../../types";
import type { BuLocationOption } from "../../hooks/useLocations";
import { AssetCategorySelect } from "../selects/AssetCategorySelect";

interface HolderOption {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface InventoryFiltersProps {
  statusFilter: AssetInventoryStatus | "all";
  onStatusChange: (value: AssetInventoryStatus | "all") => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  holderFilter: string;
  onHolderChange: (value: string) => void;
  locationFilter: string;
  onLocationChange: (value: string) => void;
  categories: AssetCategory[];
  holders: HolderOption[];
  locations: BuLocationOption[];
}

/**
 * Inventory filters using canonical select components.
 * All filter state is managed by the parent (URL state in InventoryPage).
 */
export function InventoryFilters({
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  holderFilter,
  onHolderChange,
  locationFilter,
  onLocationChange,
  categories,
  locations,
}: InventoryFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Status - using canonical component */}
      <AssetStatusSelect
        value={statusFilter}
        onValueChange={onStatusChange}
        includeAll
        allLabel="Todos os status"
        triggerClassName="w-[160px] h-9"
      />

      {/* Categoria - hierarchical using AssetCategorySelect */}
      <AssetCategorySelect
        value={categoryFilter === "all" ? undefined : categoryFilter}
        onValueChange={(val) => onCategoryChange(val ?? "all")}
        categories={categories}
        placeholder="Categoria"
        includeNone
        noneLabel="Todas as categorias"
        triggerClassName="w-[200px] h-9"
      />

      {/* Localização - hierarchical using canonical component */}
      <BuLocationSelect
        value={locationFilter === "all" ? undefined : locationFilter}
        onValueChange={(val) => onLocationChange(val ?? "all")}
        locations={locations}
        placeholder="Localização"
        includeAll
        allLabel="Todas as localizações"
        triggerClassName="w-[200px] h-9"
      />

      {/* Jetimober (holder) - using canonical BuUserSelect */}
      <BuUserSelect
        value={holderFilter === "all" ? undefined : holderFilter}
        onValueChange={(val) => onHolderChange(val ?? "all")}
        placeholder="Todos os jetimobers"
        className="w-[200px]"
        showSearch
        allowNone
        noneLabel="Todos os jetimobers"
      />
    </div>
  );
}
