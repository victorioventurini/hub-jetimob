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
import { AreaBadge } from "@/components/ui/area-badge";
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
import { useKpiMutations } from "../hooks/useKpiMutations";
import { useCanEditKpi } from "../hooks/useCanEditKpi";
import { KpiEvolutionChart } from "./KpiEvolutionChart";
import { KpiValuesTable } from "./KpiValuesTable";
import { LinkedKrsSection } from "./LinkedKrsSection";
import { 
  RAG_STATUS_CONFIG, 
  INDICATOR_TYPE_LABELS, 
  DIRECTION_LABELS,
  FREQUENCY_VALUE_LABELS,
  type KpiDirection,
  type KpiRagStatus,
  type KpiIndicatorType,
  type KpiFrequencyValue,
  type KpiValue,
} from "../types";
import { useUrlState } from "@/shared/url/useUrlState";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMemo } from "react";

export interface KpiHistoryDialogData {
  id: string;
  name: string;
  unit: string;
  direction: KpiDirection;
  target_value: number | null;
  current_value: number | null;
  indicator_type: KpiIndicatorType;
  rag_status: KpiRagStatus;
  /** @deprecated v3.0.0 — preserve apenas para compat de callers; use update_frequency. */
  frequency?: KpiFrequencyValue;
  consolidation_frequency?: import('../types').KpiFrequencyValue | null;
  update_frequency?: import('../types').KpiFrequencyValue | null;
  bu_id?: string;
  owner_user_id?: string | null;
  team_id?: string | null;
  area_id?: string | null;
  responsible_team_id?: string | null;
  scope?: string;
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
  const { updateKpiValue, deleteKpiValue } = useKpiMutations();
  const { canUpdateValues } = useCanEditKpi(kpi ? {
    id: kpi.id,
    bu_id: kpi.bu_id || '',
    owner_user_id: kpi.owner_user_id,
    team_id: kpi.team_id,
    area_id: kpi.area_id,
    responsible_team_id: kpi.responsible_team_id,
    scope: kpi.scope,
  } : null);

  // v3.0.0 — toggle "apenas consolidados" via URL state
  const { value: onlyConsolidated, set: setOnlyConsolidated } = useUrlState<boolean>({
    key: 'evolution_only_consolidated',
    defaultValue: false,
    parse: (v) => v === '1' || v === 'true',
    serialize: (v) => (v ? '1' : null),
  });

  const filteredValues = useMemo<KpiValue[]>(() => {
    const all = historyData?.values ?? [];
    return onlyConsolidated ? all.filter((v) => v.input_type !== 'partial') : all;
  }, [historyData?.values, onlyConsolidated]);

  const partialCount = useMemo(
    () => (historyData?.values ?? []).filter((v) => v.input_type === 'partial').length,
    [historyData?.values],
  );

  if (!kpi) return null;

  const handleUpdateValue = async (id: string, data: { value: number; reference_date: string; notes?: string }) => {
    await updateKpiValue.mutateAsync({ id, kpi_id: kpi.id, ...data });
  };

  const handleDeleteValue = async (id: string) => {
    await deleteKpiValue.mutateAsync({ id, kpi_id: kpi.id });
  };

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
                {(() => {
                  const eff = (kpi as any).effective_area ?? kpi.area;
                  const effTeam = (kpi as any).effective_team ?? kpi.team;
                  return (
                    <>
                      {eff && <AreaBadge area={eff} />}
                      {effTeam && (
                        <span className="text-xs text-muted-foreground">• {effTeam.name}</span>
                      )}
                    </>
                  );
                })()}
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
            {kpi.update_frequency && (
              <div className="flex items-center gap-1">
                <span>Frequência: {FREQUENCY_VALUE_LABELS[kpi.update_frequency]}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            <Tabs defaultValue="chart" className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <TabsList className="grid w-full sm:w-auto grid-cols-2">
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

                {/* v3.0.0 — Toggle "apenas consolidados" (URL state) */}
                {partialCount > 0 && (
                  <div className="flex items-center gap-2 px-1">
                    <Switch
                      id="only-consolidated"
                      checked={onlyConsolidated}
                      onCheckedChange={setOnlyConsolidated}
                    />
                    <Label htmlFor="only-consolidated" className="text-xs cursor-pointer">
                      Apenas consolidados
                      <Badge variant="outline" className="ml-1.5 text-[10px] h-4 px-1">
                        −{partialCount}
                      </Badge>
                    </Label>
                  </div>
                )}
              </div>

              <TabsContent value="chart" className="mt-4">
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : filteredValues.length ? (
                  <KpiEvolutionChart
                    values={filteredValues}
                    targetValue={kpi.target_value}
                    unit={kpi.unit}
                    direction={kpi.direction}
                    consolidationFrequency={kpi.consolidation_frequency ?? null}
                  />

                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <ChartLine className="h-12 w-12 opacity-30 mb-3" />
                    <p className="text-sm">
                      {onlyConsolidated
                        ? 'Nenhum valor consolidado registrado.'
                        : 'Nenhum valor registrado ainda.'}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="table" className="mt-4">
                <KpiValuesTable
                  values={filteredValues}
                  unit={kpi.unit}
                  direction={kpi.direction}
                  isLoading={isLoading}
                  kpiName={kpi.name}
                  consolidationFrequency={kpi.consolidation_frequency ?? null}
                  updateFrequency={kpi.update_frequency ?? null}
                  canEdit={canUpdateValues}
                  onUpdateValue={handleUpdateValue}
                  onDeleteValue={handleDeleteValue}
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
