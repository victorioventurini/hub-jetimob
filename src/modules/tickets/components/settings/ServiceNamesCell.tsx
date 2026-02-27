/**
 * ServiceNamesCell
 * 
 * Displays partner service categories/subcategories with truncation and tooltip.
 * Follows the EntityNamesCell pattern.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface ServiceItem {
  category_id: string;
  category_name: string;
  subcategory_id: string | null;
  subcategory_name: string | null;
  is_generalist: boolean;
}

interface ServiceNamesCellProps {
  services: ServiceItem[];
  onConfigureServices: () => void;
}

export function ServiceNamesCell({ services, onConfigureServices }: ServiceNamesCellProps) {
  if (services.length === 0) {
    return (
      <Badge
        variant="outline"
        className="cursor-pointer text-warning border-warning/30"
        onClick={onConfigureServices}
      >
        Configurar
      </Badge>
    );
  }

  // Group by category
  const categoryMap = new Map<string, { name: string; isGeneralist: boolean; subcategories: string[] }>();
  for (const s of services) {
    const existing = categoryMap.get(s.category_id);
    if (existing) {
      if (s.subcategory_name && !existing.subcategories.includes(s.subcategory_name)) {
        existing.subcategories.push(s.subcategory_name);
      }
      if (s.is_generalist) existing.isGeneralist = true;
    } else {
      categoryMap.set(s.category_id, {
        name: s.category_name,
        isGeneralist: s.is_generalist,
        subcategories: s.subcategory_name ? [s.subcategory_name] : [],
      });
    }
  }

  const categories = Array.from(categoryMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR")
  );

  const maxVisible = 2;
  const visibleItems = categories.slice(0, maxVisible);
  const hiddenCount = categories.length - maxVisible;

  const tooltipContent = (
    <div className="space-y-2 max-w-xs">
      {categories.map((cat) => (
        <div key={cat.name}>
          <span className="font-medium text-xs text-muted-foreground">
            {cat.name}{cat.isGeneralist ? " (Generalista)" : ""}:
          </span>
          {cat.subcategories.length > 0 ? (
            <ul className="list-disc list-inside text-sm">
              {cat.subcategories.sort((a, b) => a.localeCompare(b, "pt-BR")).map((sub) => (
                <li key={sub}>{sub}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground ml-4">Todas as subcategorias</p>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div
          className="flex flex-wrap gap-1 max-w-[220px] cursor-pointer"
          onClick={onConfigureServices}
        >
          {visibleItems.map((cat) => (
            <Badge key={cat.name} variant="secondary" className="text-xs truncate max-w-[100px]">
              {cat.name}
            </Badge>
          ))}
          {hiddenCount > 0 && (
            <Badge variant="outline" className="text-xs">
              +{hiddenCount}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" align="start">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
