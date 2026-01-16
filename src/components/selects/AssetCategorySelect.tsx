import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInventory } from "@/modules/assets/hooks";
import { cn } from "@/lib/utils";

interface SubcategoryItem {
  id: string;
  name: string;
  parentName: string;
}

interface AssetCategorySelectProps {
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  includeAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  triggerClassName?: string;
  disabled?: boolean;
  /** Show only subcategories (default) or also parent categories */
  showParentCategories?: boolean;
}

export function AssetCategorySelect({
  value,
  onValueChange,
  includeAll = false,
  allLabel = "Todas categorias",
  placeholder = "Selecione...",
  triggerClassName,
  disabled = false,
  showParentCategories = false,
}: AssetCategorySelectProps) {
  const { categories } = useInventory();

  // Build subcategory list with parent names
  const subcategories = useMemo(() => {
    const parentMap = new Map<string, string>();
    categories.forEach((cat) => {
      if (!cat.parent_id) {
        parentMap.set(cat.id, cat.name);
      }
    });

    return categories
      .filter((cat) => cat.parent_id !== null)
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        parentName: parentMap.get(cat.parent_id!) || "Sem categoria",
      }))
      .sort((a, b) => {
        const parentCompare = a.parentName.localeCompare(b.parentName);
        if (parentCompare !== 0) return parentCompare;
        return a.name.localeCompare(b.name);
      });
  }, [categories]);

  // Group by parent for display
  const groupedSubcategories = useMemo(() => {
    const groups: Record<string, SubcategoryItem[]> = {};
    subcategories.forEach((sub) => {
      if (!groups[sub.parentName]) {
        groups[sub.parentName] = [];
      }
      groups[sub.parentName].push(sub);
    });
    return groups;
  }, [subcategories]);

  // Parent categories (for optional display)
  const parentCategories = useMemo(() => {
    return categories
      .filter((cat) => !cat.parent_id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const handleChange = (val: string) => {
    if (val === "__all__") {
      onValueChange(undefined);
    } else {
      onValueChange(val);
    }
  };

  return (
    <Select
      value={value || (includeAll ? "__all__" : undefined)}
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-[200px]", triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="__all__">{allLabel}</SelectItem>
        )}
        
        {showParentCategories && parentCategories.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Categorias
            </div>
            {parentCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id} className="pl-4">
                {cat.name}
              </SelectItem>
            ))}
          </>
        )}

        {Object.entries(groupedSubcategories).map(([parentName, subs]) => (
          <div key={parentName}>
            <div className="px-2 py-1.5 text-xs font-semibold text-primary">
              {parentName}
            </div>
            {subs.map((sub) => (
              <SelectItem key={sub.id} value={sub.id} className="pl-6">
                {sub.name}
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
