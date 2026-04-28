/**
 * KpiScopeBadge - Sinaliza visualmente quando um KPI tem escopo Global (org).
 *
 * Renderiza apenas para `scope === 'org'`. KPIs de área/time já são
 * representados pelo AreaBadge ou pelo nome do time.
 */
import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { KpiScope } from "../types";

interface KpiScopeBadgeProps {
  scope: KpiScope;
  buName?: string | null;
  className?: string;
}

export function KpiScopeBadge({ scope, buName, className }: KpiScopeBadgeProps) {
  if (scope !== "org") return null;

  const tooltipText = buName
    ? `Indicador global da BU ${buName}`
    : "Indicador global da BU";

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-medium shrink-0 gap-1",
              "bg-info/5 text-info border-info/20 hover:bg-info/10",
              className
            )}
          >
            <Globe className="w-3 h-3" />
            Global
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
