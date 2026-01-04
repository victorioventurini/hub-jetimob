import { TrendingUp, TrendingDown, Minus, AlertCircle, Plug, FileSpreadsheet, Database, Edit3, Webhook, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { KpiWithValues, CATEGORY_LABELS, CATEGORY_COLORS, FREQUENCY_LABELS, RAG_STATUS_CONFIG } from "../types";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useVic, useVicEnabled } from "@/modules/vic";

interface KpiCardProps {
  kpi: KpiWithValues;
  onClick?: () => void;
}

const SourceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'api':
      return <Plug className="h-3 w-3" />;
    case 'webhook':
      return <Webhook className="h-3 w-3" />;
    case 'spreadsheet':
      return <FileSpreadsheet className="h-3 w-3" />;
    case 'database':
      return <Database className="h-3 w-3" />;
    default:
      return <Edit3 className="h-3 w-3" />;
  }
};

export function KpiCard({ kpi, onClick }: KpiCardProps) {
  const { openPanel } = useVic();
  const { isEnabled: vicEnabled } = useVicEnabled();
  
  const TrendIcon = kpi.trend === "up" ? TrendingUp : kpi.trend === "down" ? TrendingDown : Minus;

  // Determine trend color based on direction
  const trendColor = kpi.direction === "up"
    ? kpi.trend === "up" ? "text-emerald-500" : kpi.trend === "down" ? "text-red-500" : "text-muted-foreground"
    : kpi.trend === "down" ? "text-emerald-500" : kpi.trend === "up" ? "text-red-500" : "text-muted-foreground";

  const ragConfig = RAG_STATUS_CONFIG[kpi.rag_status];
  const needsAttention = kpi.rag_status === 'off_track' || kpi.rag_status === 'at_risk';

  const formatValue = (value: number | null) => {
    if (value === null) return "—";
    
    switch (kpi.unit) {
      case '%':
        return `${value.toFixed(1)}%`;
      case 'R$':
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'horas':
        return `${value.toFixed(1)}h`;
      case 'dias':
        return `${value.toFixed(0)} dias`;
      case 'score':
        return value.toFixed(0);
      default:
        return value.toLocaleString("pt-BR");
    }
  };

  const lastUpdate = kpi.values[0]?.reference_date ? parseISO(kpi.values[0].reference_date) : null;
  const isStale = lastUpdate
    ? differenceInDays(new Date(), lastUpdate) >
      (kpi.frequency === "daily" ? 2 : kpi.frequency === "weekly" ? 10 : kpi.frequency === "monthly" ? 35 : 100)
    : true;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-accent/30 group",
        onClick && "hover:-translate-y-0.5",
        kpi.last_update_failed && "border-red-300 dark:border-red-800"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="secondary"
                className={cn("text-[10px] px-1.5 py-0 text-white shrink-0", CATEGORY_COLORS[kpi.category])}
              >
                {CATEGORY_LABELS[kpi.category]}
              </Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-muted-foreground">
                    <SourceIcon type={kpi.source_type} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Fonte: {kpi.source_type === 'manual' ? 'Manual' : kpi.source_type.toUpperCase()}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
              {kpi.name}
            </h3>
            {kpi.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {kpi.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", ragConfig.bgColor, ragConfig.color)}>
              {ragConfig.label}
            </Badge>
            {(isStale || kpi.last_update_failed) && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className={cn("h-3.5 w-3.5", kpi.last_update_failed ? "text-red-500" : "text-amber-500")} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{kpi.last_update_failed ? 'Falha na última atualização' : 'KPI sem dados recentes'}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Value and Trend */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {formatValue(kpi.current_value)}
            </span>
            {kpi.variation !== null && (
              <div className={cn("flex items-center gap-0.5 text-xs", trendColor)}>
                <TrendIcon className="h-3.5 w-3.5" />
                <span>{Math.abs(kpi.variation).toFixed(1)}%</span>
              </div>
            )}
          </div>
          {kpi.target_value !== null && (
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Meta</span>
              <p className="text-sm font-medium text-foreground">{formatValue(kpi.target_value)}</p>
            </div>
          )}
        </div>

        {/* Progress bar for target */}
        {kpi.target_value !== null && kpi.current_value !== null && (
          <div className="space-y-1">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  kpi.rag_status === 'on_track' ? 'bg-emerald-500' :
                  kpi.rag_status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ 
                  width: `${Math.min(100, (kpi.direction === 'up' 
                    ? (kpi.current_value / kpi.target_value) 
                    : (kpi.target_value / kpi.current_value)) * 100)}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Vic suggestion for off-track KPIs */}
        {vicEnabled && needsAttention && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs text-primary h-7 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    ragStatus: kpi.rag_status,
                  },
                },
              });
            }}
          >
            <Sparkles className="h-3 w-3" />
            Analisar com Vic
          </Button>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            {kpi.owner && (
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={kpi.owner.photo_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-accent text-accent-foreground">
                      {kpi.owner.display_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
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
