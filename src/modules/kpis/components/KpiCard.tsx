import { TrendingUp, TrendingDown, Minus, AlertCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { KpiWithValues, CATEGORY_LABELS, CATEGORY_COLORS, FREQUENCY_LABELS } from "../types";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useVic, useVicEnabled } from "@/modules/vic";

interface KpiCardProps {
  kpi: KpiWithValues;
  onClick?: () => void;
}

export function KpiCard({ kpi, onClick }: KpiCardProps) {
  const { openPanel } = useVic();
  const { isEnabled: vicEnabled } = useVicEnabled();
  
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

  // Determine if KPI needs attention (off-track or significant variation)
  const needsAttention = kpi.variation !== null && Math.abs(kpi.variation) > 15;

  const formatValue = (value: number | null) => {
    if (value === null) return "—";
    
    if (kpi.unit === "%") {
      return `${value.toFixed(1)}%`;
    }
    if (kpi.unit === "R$") {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    if (kpi.unit === "dias") {
      return `${value.toFixed(0)} dias`;
    }
    return value.toLocaleString("pt-BR");
  };

  const lastUpdate = kpi.values[0]?.reference_date
    ? parseISO(kpi.values[0].reference_date)
    : null;

  const isStale = lastUpdate
    ? differenceInDays(new Date(), lastUpdate) >
      (kpi.frequency === "daily" ? 2 : kpi.frequency === "weekly" ? 10 : kpi.frequency === "monthly" ? 35 : 100)
    : true;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-accent/30",
        onClick && "hover:-translate-y-0.5"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium leading-tight">
              {kpi.name}
            </CardTitle>
            <Badge
              variant="secondary"
              className={cn("text-xs text-white", CATEGORY_COLORS[kpi.category])}
            >
              {CATEGORY_LABELS[kpi.category]}
            </Badge>
          </div>
          {isStale && kpi.current_value === null && (
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>KPI sem dados registrados</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">
            {formatValue(kpi.current_value)}
          </span>
          {kpi.variation !== null && (
            <div className={cn("flex items-center gap-0.5 text-sm", trendColor)}>
              <TrendIcon className="h-4 w-4" />
              <span>{Math.abs(kpi.variation).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {kpi.target_value !== null && (
          <div className="text-xs text-muted-foreground">
            Meta: {formatValue(kpi.target_value)}
          </div>
        )}

        {/* Vic suggestion for off-track KPIs */}
        {vicEnabled && needsAttention && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs text-primary h-7"
            onClick={(e) => {
              e.stopPropagation();
              openPanel({
                agentSlug: "analista-kpis",
                actionContext: "kpi-analyze-variation",
                context: {
                  type: "KPI",
                  title: kpi.name,
                  description: kpi.description || undefined,
                  currentValue: kpi.current_value || undefined,
                  targetValue: kpi.target_value || undefined,
                  unit: kpi.unit,
                  additionalData: {
                    variation: kpi.variation,
                    trend: kpi.trend,
                    direction: kpi.direction,
                    category: kpi.category,
                  },
                },
              });
            }}
          >
            <Sparkles className="h-3 w-3" />
            Vic detectou variação. Analisar?
          </Button>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            {kpi.owner && (
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={kpi.owner.photo_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {kpi.owner.display_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{kpi.owner.display_name}</p>
                </TooltipContent>
              </Tooltip>
            )}
            <span className="text-xs text-muted-foreground">
              {FREQUENCY_LABELS[kpi.frequency]}
            </span>
          </div>

          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              {format(lastUpdate, "dd MMM", { locale: ptBR })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
