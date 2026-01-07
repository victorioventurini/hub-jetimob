import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

interface UrlFilterBarProps {
  activeFilters: ActiveFilter[];
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Barra de filtros ativos com tags removíveis
 * - Exibe filtros ativos como badges
 * - Permite remover individual ou todos
 */
export function UrlFilterBar({
  activeFilters,
  onRemoveFilter,
  onClearAll,
  className,
  children,
}: UrlFilterBarProps) {
  if (activeFilters.length === 0 && !children) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 flex-wrap",
        className
      )}
    >
      {/* Slot for filter controls */}
      {children}

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <>
          <div className="h-4 w-px bg-border mx-1" />
          
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="text-muted-foreground text-xs">
                {filter.label}:
              </span>
              <span className="font-medium">{filter.value}</span>
              <button
                onClick={() => onRemoveFilter(filter.key)}
                className="ml-1 p-0.5 rounded-sm hover:bg-muted-foreground/20"
                aria-label={`Remover filtro ${filter.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 px-2 text-xs gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Limpar filtros
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * Helper para converter valores de state em ActiveFilter[]
 */
export function buildActiveFilters(
  state: Record<string, any>,
  defaults: Record<string, any>,
  labelMap: Record<string, string>,
  formatters?: Record<string, (value: any) => string>
): ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  for (const [key, value] of Object.entries(state)) {
    const defaultValue = defaults[key];
    
    // Skip if same as default
    if (JSON.stringify(value) === JSON.stringify(defaultValue)) {
      continue;
    }
    
    // Skip empty values
    if (value === "" || value === null || value === undefined) {
      continue;
    }
    
    // Skip arrays with no items
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    const label = labelMap[key] || key;
    const formatter = formatters?.[key];
    const displayValue = formatter
      ? formatter(value)
      : Array.isArray(value)
        ? value.join(", ")
        : String(value);

    filters.push({ key, label, value: displayValue });
  }

  return filters;
}
