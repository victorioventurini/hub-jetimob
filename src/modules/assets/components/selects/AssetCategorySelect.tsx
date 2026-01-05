import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "../../hooks/useCategories";
import { cn } from "@/lib/utils";
import type { AssetCategory } from "../../types";

interface FlatCategoryItem {
  id: string;
  name: string;
  level: number;
}

/**
 * Build a flat list with hierarchy levels for display
 */
function buildFlatCategoryList(categories: AssetCategory[]): FlatCategoryItem[] {
  const result: FlatCategoryItem[] = [];
  
  // Build a map of parent -> children
  const childrenMap = new Map<string | null, AssetCategory[]>();
  categories.forEach((cat) => {
    const parentId = cat.parent_id || null;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(cat);
  });

  // Recursively add items with their level
  function addWithLevel(parentId: string | null, level: number) {
    const children = childrenMap.get(parentId) || [];
    // Sort children alphabetically
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

interface AssetCategorySelectProps {
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  includeNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  /** Override categories list if you already have the data */
  categories?: AssetCategory[];
}

/**
 * Centralized asset category select component with hierarchical display.
 * Parent categories are shown with normal font, child categories are indented and smaller.
 */
export function AssetCategorySelect({
  value,
  onValueChange,
  placeholder = "Selecione uma categoria",
  includeNone = true,
  noneLabel = "Sem categoria",
  disabled = false,
  className,
  triggerClassName,
  categories: externalCategories,
}: AssetCategorySelectProps) {
  const { categories: hookCategories, isLoading } = useCategories();
  const categories = externalCategories ?? hookCategories;
  const flatCategories = buildFlatCategoryList(categories);

  const handleValueChange = (newValue: string) => {
    if (newValue === "none") {
      onValueChange(undefined);
    } else {
      onValueChange(newValue);
    }
  };

  const displayValue = value ?? (includeNone ? "none" : "");

  return (
    <Select
      value={displayValue}
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={cn("w-full", triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeNone && (
          <SelectItem value="none" className="text-muted-foreground">
            {noneLabel}
          </SelectItem>
        )}
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
  );
}
