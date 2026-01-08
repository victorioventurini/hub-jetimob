import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { INVENTORY_STATUS_LABELS, type AssetInventoryStatus, type AssetCategory } from "../../types";

interface HolderOption {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface FlatCategoryItem {
  id: string;
  name: string;
  level: number;
}

function buildFlatCategoryList(categories: AssetCategory[]): FlatCategoryItem[] {
  const result: FlatCategoryItem[] = [];
  
  const childrenMap = new Map<string | null, AssetCategory[]>();
  categories.forEach((cat) => {
    const parentId = cat.parent_id || null;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(cat);
  });

  function addWithLevel(parentId: string | null, level: number) {
    const children = childrenMap.get(parentId) || [];
    children.sort((a, b) => a.name.localeCompare(b.name));
    
    for (const child of children) {
      result.push({
        id: child.id,
        name: child.name,
        level,
      });
      addWithLevel(child.id, level + 1);
    }
  }

  addWithLevel(null, 0);
  return result;
}

interface InventoryFiltersProps {
  statusFilter: AssetInventoryStatus | "all";
  onStatusChange: (value: AssetInventoryStatus | "all") => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  holderFilter: string;
  onHolderChange: (value: string) => void;
  categories: AssetCategory[];
  holders: HolderOption[];
}

export function InventoryFilters({
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  holderFilter,
  onHolderChange,
  categories,
  holders,
}: InventoryFiltersProps) {
  const flatCategories = buildFlatCategoryList(categories);

  return (
    <div className="flex flex-wrap gap-3">
      {/* Status */}
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {Object.entries(INVENTORY_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Categoria - hierarchical */}
      <Select value={categoryFilter} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          {flatCategories.map((cat) => (
            <SelectItem
              key={cat.id}
              value={cat.id}
              className={cn(
                cat.level === 0 && "font-medium",
                cat.level > 0 && "text-[13px] text-muted-foreground"
              )}
            >
              <span 
                className="flex items-center"
                style={{ paddingLeft: `${cat.level * 16}px` }}
              >
                {cat.level > 0 && (
                  <span className="mr-1.5 text-muted-foreground/50">└</span>
                )}
                {cat.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Jetimober (holder) */}
      <Select value={holderFilter} onValueChange={onHolderChange}>
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue placeholder="Jetimober" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os jetimobers</SelectItem>
          {holders.map((holder) => (
            <SelectItem key={holder.id} value={holder.id}>
              {holder.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
