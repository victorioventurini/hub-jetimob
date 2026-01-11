import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTicketCategories } from "@/modules/tickets/hooks/useTicketCategories";
import type { TicketCategoryScope } from "@/modules/tickets/types";

interface TicketCategory {
  id: string;
  name: string;
  scope: TicketCategoryScope;
  subcategories?: Array<{ id: string; name: string; status: string }>;
}

interface TicketCategorySelectProps {
  value: string | "all";
  onValueChange: (value: string) => void;
  /** Filter categories by scope */
  scope?: TicketCategoryScope;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  /** External categories data (skip fetching) */
  categories?: TicketCategory[];
}

/**
 * Centralized ticket category select component.
 * Fetches categories from the database and displays them.
 * 
 * @example
 * // Filter usage
 * <TicketCategorySelect value={filter} onValueChange={setFilter} includeAll />
 * 
 * // Form usage with scope filter
 * <TicketCategorySelect value={categoryId} onValueChange={setCategoryId} scope="internal" />
 */
export function TicketCategorySelect({
  value,
  onValueChange,
  scope,
  placeholder = "Categoria",
  includeAll = false,
  allLabel = "Todas as categorias",
  disabled = false,
  className,
  triggerClassName,
  categories: externalCategories,
}: TicketCategorySelectProps) {
  const { data: fetchedCategories = [], isLoading } = useTicketCategories(scope);
  
  const categories = externalCategories ?? fetchedCategories;

  return (
    <Select 
      value={value} 
      onValueChange={onValueChange} 
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={cn("w-[180px]", triggerClassName, className)}>
        <SelectValue placeholder={isLoading ? "Carregando..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all" className="font-medium">
            {allLabel}
          </SelectItem>
        )}
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
