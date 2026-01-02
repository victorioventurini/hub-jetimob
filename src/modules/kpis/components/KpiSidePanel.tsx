import { TrendingUp, TrendingDown, Minus, BarChart3, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useKpiData } from "../hooks/useKpiData";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "../types";
import { cn } from "@/lib/utils";

interface KpiSidePanelProps {
  className?: string;
}

export function KpiSidePanel({ className }: KpiSidePanelProps) {
  const { kpis, isLoading } = useKpiData();

  // Get top KPIs from different categories
  const displayKpis = kpis.slice(0, 6);

  const formatValue = (value: number | null, unit: string) => {
    if (value === null) return "—";
    if (unit === "%") return `${value.toFixed(1)}%`;
    if (unit === "R$") {
      if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
      return `R$ ${value.toFixed(0)}`;
    }
    return value.toLocaleString("pt-BR");
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            KPIs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (displayKpis.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            KPIs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum KPI cadastrado
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          KPIs - Contexto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayKpis.map((kpi) => {
          const TrendIcon =
            kpi.trend === "up" ? TrendingUp : kpi.trend === "down" ? TrendingDown : Minus;

          const trendColor =
            kpi.direction === "up"
              ? kpi.trend === "up"
                ? "text-emerald-500"
                : kpi.trend === "down"
                ? "text-red-500"
                : "text-muted-foreground"
              : kpi.trend === "down"
              ? "text-emerald-500"
              : kpi.trend === "up"
              ? "text-red-500"
              : "text-muted-foreground";

          return (
            <div
              key={kpi.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{kpi.name}</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0 text-white",
                          CATEGORY_COLORS[kpi.category]
                        )}
                      >
                        {CATEGORY_LABELS[kpi.category].slice(0, 3)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{CATEGORY_LABELS[kpi.category]}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">
                  {formatValue(kpi.current_value, kpi.unit)}
                </span>
                {kpi.variation !== null && (
                  <div className={cn("flex items-center", trendColor)}>
                    <TrendIcon className="h-3 w-3" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
