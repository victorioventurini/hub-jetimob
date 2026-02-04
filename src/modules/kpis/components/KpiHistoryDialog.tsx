/**
 * KpiHistoryDialog - Modal de Histórico de Indicadores
 * 
 * Modal completo para visualização de evolução de KPIs e Métricas.
 * Segue o padrão do KrHistoryDialog para consistência visual.
 * 
 * @see TCR v2.86.0
 */

import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  ChartLine,
  ExternalLink,
  Table as TableIcon,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKpiWithHistory, type KpiWithHistoryData } from "../hooks/useKpiWithHistory";
import { useKpiLinkedKrs } from "../hooks/useKpiLinkedKrs";
import { KpiEvolutionChart } from "./KpiEvolutionChart";
import { KpiValuesTable } from "./KpiValuesTable";
import { LinkedKrsSection } from "./LinkedKrsSection";
import { 
  RAG_STATUS_CONFIG, 
  INDICATOR_TYPE_LABELS, 
  DIRECTION_LABELS,
  FREQUENCY_LABELS,
  type KpiDirection,
  type KpiRagStatus,
  type KpiIndicatorType,
  type KpiFrequency,
} from "../types";

export interface KpiHistoryDialogData {
  id: string;
  name: string;
  unit: string;
  direction: KpiDirection;
  target_value: number | null;
  current_value: number | null;
  indicator_type: KpiIndicatorType;
  rag_status: KpiRagStatus;
  frequency?: KpiFrequency;
  area?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  owner?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
}

export interface KpiHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi: KpiHistoryDialogData | null;
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) return "—";
  if (unit === '%') {
    return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }
  if (unit === 'R$' || unit === 'BRL') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}`;
}

export function KpiHistoryDialog({ open, onOpenChange, kpi }: KpiHistoryDialogProps) {
  const { data: historyData, isLoading } = useKpiWithHistory(kpi?.id);
  const { primaryKrs, guardrailKrs, isLoading: isLoadingKrs } = useKpiLinkedKrs(kpi?.id ?? null);

  if (!kpi) return null;

  const progress = kpi.target_value && kpi.current_value !== null
    ? Math.min(100, Math.max(0, (kpi.current_value / kpi.target_value) * 100))
    : 0;

  const ownerInitials = kpi.owner?.display_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const TrendIcon = historyData?.trend === 'up' ? TrendingUp : historyData?.trend === 'down' ? TrendingDown : Minus;
  
  const getTrendColor = () => {
    if (kpi.direction === 'up') {
      return historyData?.trend === 'up' ? 'text-success' : historyData?.trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
    }
    return historyData?.trend === 'down' ? 'text-success' : historyData?.trend === 'up' ? 'text-destructive' : 'text-muted-foreground';
  };
  
  const trendColor = getTrendColor();
  const ragConfig = RAG_STATUS_CONFIG[kpi.rag_status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-3">
          {/* Header with title and badges */}
          <div className="flex items-start gap-3">
            <div 
              className={cn("w-2 h-2 rounded-full mt-2 shrink-0", ragConfig.bgColor)} 
            />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold leading-tight pr-8">
                {kpi.name}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {INDICATOR_TYPE_LABELS[kpi.indicator_type]}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", ragConfig.color)}
                >
                  {ragConfig.label}
                </Badge>
                {kpi.area && (
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ 
                      borderColor: kpi.area.color || undefined,
                      color: kpi.area.color || undefined,
                    }}
                  >
                    {kpi.area.name}
                  </Badge>
                )}
                {kpi.team && (
                  <span className="text-xs text-muted-foreground">• {kpi.team.name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Current value and trend */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Valor atual</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">
                  {formatValue(kpi.current_value, kpi.unit)}
                </span>
                {historyData && (
                  <>
                    <TrendIcon className={cn("w-5 h-5", trendColor)} />
                    {historyData.variation !== null && (
                      <span className={cn("text-sm font-medium", trendColor)}>
                        {historyData.variation > 0 ? '+' : ''}{historyData.variation.toFixed(1)}%
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            {kpi.target_value !== null && (
              <div className="text-right space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="w-3 h-3" />
                  Meta
                </div>
                <span className="text-lg font-semibold">
                  {formatValue(kpi.target_value, kpi.unit)}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {kpi.target_value !== null && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span className={progress >= 100 ? 'text-success font-medium' : ''}>
                  {Math.round(progress)}% da meta
                  {progress >= 100 && ' 🚀'}
                </span>
              </div>
              <Progress value={Math.min(100, progress)} className="h-2" />
            </div>
          )}

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {kpi.owner && (
              <div className="flex items-center gap-1.5">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={kpi.owner.photo_url || undefined} />
                  <AvatarFallback className="text-[9px]">{ownerInitials}</AvatarFallback>
                </Avatar>
                <span>{kpi.owner.display_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {kpi.direction === 'up' ? (
                <ArrowUp className="w-3 h-3 text-success" />
              ) : (
                <ArrowDown className="w-3 h-3 text-destructive" />
              )}
              <span>{DIRECTION_LABELS[kpi.direction]}</span>
            </div>
            {kpi.frequency && (
              <div className="flex items-center gap-1">
                <span>Frequência: {FREQUENCY_LABELS[kpi.frequency]}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            <Tabs defaultValue="chart" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chart" className="gap-2">
                  <ChartLine className="h-4 w-4" />
                  <span className="hidden sm:inline">Evolução</span>
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-2">
                  <TableIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Histórico Completo</span>
                  {historyData?.totalValues ? (
                    <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                      {historyData.totalValues}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chart" className="mt-4">
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : historyData?.values?.length ? (
                  <KpiEvolutionChart
                    values={historyData.values}
                    targetValue={kpi.target_value}
                    unit={kpi.unit}
                    direction={kpi.direction}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <ChartLine className="h-12 w-12 opacity-30 mb-3" />
                    <p className="text-sm">Nenhum valor registrado ainda.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="table" className="mt-4">
                <KpiValuesTable
                  values={historyData?.values || []}
                  unit={kpi.unit}
                  direction={kpi.direction}
                  isLoading={isLoading}
                />
              </TabsContent>
            </Tabs>

            {/* KRs Vinculadas */}
            <Separator />
            <LinkedKrsSection
              primaryKrs={primaryKrs}
              guardrailKrs={guardrailKrs}
              isLoading={isLoadingKrs}
            />

            {/* Link to evolution page */}
            {historyData?.values?.length ? (
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link to={`/kpis/evolution?q=${encodeURIComponent(kpi.name)}`}>
                    Ver página de evolução
                    <ExternalLink className="w-3.5 h-3.5 ml-2" />
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
