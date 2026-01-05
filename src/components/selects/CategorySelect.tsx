import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CategoryOption {
  value: string;
  label: string;
}

interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: CategoryOption[];
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

/**
 * Centralized category select component.
 * Generic select for any category-based selection (KPI categories, etc).
 */
export function CategorySelect({
  value,
  onValueChange,
  options,
  placeholder = "Categoria",
  includeAll = true,
  allLabel = "Todas categorias",
  disabled = false,
  className,
  triggerClassName,
}: CategorySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-[180px]", triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all" className="font-medium">
            {allLabel}
          </SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type { CategoryOption };
