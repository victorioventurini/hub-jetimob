/**
 * KpiEvolutionPage - Página de Evolução de Indicadores
 * 
 * Visualização consolidada da evolução de KPIs e Métricas.
 * Segue o padrão de CycleCheckinsPage para consistência.
 * 
 * @see TCR v2.86.0
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  ChartLine, 
  LayoutGrid, 
  Table as TableIcon, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target,
  BarChart3,
} from "lucide-react";
import { SavedLinksPopover } from "@/shared/saved-links";
import { HubLayout } from "@/components/layout/HubLayout";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
// Breadcrumb handled via PageHeader's breadcrumbs prop
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaBadge } from "@/components/ui/area-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUrlState } from "@/shared/url";
import { ListPageFilters } from "@/components/ui/list-page-filters";
import { ViewOptionsBar } from "@/components/ui/view-options-bar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useKpiEvolutionList, type KpiEvolutionItem } from "../hooks/useKpiEvolutionList";
import { useKpiWithHistory } from "../hooks/useKpiWithHistory";
import { useKpiKrLinks } from "../hooks/useKpiKrLinks";
import { KpiEvolutionChart } from "../components/KpiEvolutionChart";
import { KpiHistoryDialog, type KpiHistoryDialogData } from "../components/KpiHistoryDialog";
import { 
  RAG_STATUS_CONFIG, 
  INDICATOR_TYPE_LABELS, 
  getScopeLabels,
  type KpiIndicatorType, 
  type KpiScope, 
  type KpiRagStatus,
  type KpiKrLinkStatus,
} from "../types";
import { useBu } from "@/contexts/BuContext";
import { useAreas } from "@/modules/areas/hooks";
import { KpiDashboardFilters } from "../components/KpiDashboardFilters";

type ViewMode = 'cards' | 'table' | 'charts';

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

function KpiMiniChart({ kpiId, unit, direction, targetValue }: { 
  kpiId: string; 
  unit: string; 
  direction: 'up' | 'down'; 
  targetValue: number | null;
}) {
  const { data, isLoading } = useKpiWithHistory(kpiId);
  
  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }
  
  if (!data?.values?.length || data.values.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-muted-foreground text-xs">
        Dados insuficientes
      </div>
    );
  }

  return (
    <KpiEvolutionChart
      values={data.values}
      targetValue={targetValue}
      unit={unit}
      direction={direction}
      compact
    />
  );
}

function KpiEvolutionCard({ 
  kpi, 
  onSelect 
}: { 
  kpi: KpiEvolutionItem; 
  onSelect: (kpi: KpiEvolutionItem) => void;
}) {
  const ragConfig = RAG_STATUS_CONFIG[kpi.rag_status];
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;
  
  const trendColor = kpi.direction === 'up'
    ? kpi.trend === 'up' ? 'text-success' : kpi.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
    : kpi.trend === 'down' ? 'text-success' : kpi.trend === 'up' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card 
      className="cursor-pointer hover:shadow-md hover:border-accent/30 transition-all hover:-translate-y-0.5"
      onClick={() => onSelect(kpi)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
              {kpi.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {INDICATOR_TYPE_LABELS[kpi.indicator_type]}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn("text-xs", ragConfig.color)}
              >
                {ragConfig.label}
              </Badge>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold">
              {formatValue(kpi.current_value, kpi.unit)}
            </div>
            {kpi.variation !== null && (
              <div className={cn("flex items-center justify-end gap-0.5 text-xs", trendColor)}>
                <TrendIcon className="h-3 w-3" />
                <span>{Math.abs(kpi.variation).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <KpiMiniChart 
          kpiId={kpi.id} 
          unit={kpi.unit}
          direction={kpi.direction}
          targetValue={kpi.target_value}
        />
        <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs text-muted-foreground">
          {kpi.area && (
            <AreaBadge area={kpi.area} />
          )}
          {kpi.owner && (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-4 w-4">
                <AvatarImage src={kpi.owner.photo_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {kpi.owner.display_name.split(' ').map(n => n[0]).slice(0,2).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[80px]">{kpi.owner.display_name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function KpiExpandedChart({ kpi }: { kpi: KpiEvolutionItem }) {
  const { data, isLoading } = useKpiWithHistory(kpi.id);
  const ragConfig = RAG_STATUS_CONFIG[kpi.rag_status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{kpi.name}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{INDICATOR_TYPE_LABELS[kpi.indicator_type]}</Badge>
              <Badge variant="outline" className={ragConfig.color}>{ragConfig.label}</Badge>
              {kpi.area && (
                <AreaBadge area={kpi.area} />
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatValue(kpi.current_value, kpi.unit)}</div>
            {kpi.target_value && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                Meta: {formatValue(kpi.target_value, kpi.unit)}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : data?.values?.length ? (
          <KpiEvolutionChart
            values={data.values}
            targetValue={kpi.target_value}
            unit={kpi.unit}
            direction={kpi.direction}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <ChartLine className="h-12 w-12 opacity-30 mb-2" />
            <p className="text-sm">Nenhum valor registrado ainda.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function KpiEvolutionPage() {
  usePageTitle("Evolução de Indicadores");

  // URL State
  const searchState = useUrlState<string>({ key: 'q', defaultValue: '' });
  const viewModeState = useUrlState<ViewMode>({ 
    key: 'view', 
    defaultValue: 'cards',
    parse: (v) => v as ViewMode,
  });
  const indicatorTypeState = useUrlState<KpiIndicatorType | 'all'>({ 
    key: 'type', 
    defaultValue: 'all',
    parse: (v) => v as KpiIndicatorType | 'all',
  });
  const areaState = useUrlState<string>({ key: 'area_id', defaultValue: 'all' });
  const scopeState = useUrlState<KpiScope | 'all'>({ 
    key: 'scope', 
    defaultValue: 'all',
    parse: (v) => v as KpiScope | 'all',
  });
  const teamState = useUrlState<string>({ key: 'team_id', defaultValue: 'all' });
  const ragStatusState = useUrlState<KpiRagStatus | 'all'>({ 
    key: 'status', 
    defaultValue: 'all',
    parse: (v) => v as KpiRagStatus | 'all',
  });
  // v2.90.0: KR Link filter state
  const krLinkStatusState = useUrlState<KpiKrLinkStatus | 'all'>({
    key: 'kr_link',
    defaultValue: 'all',
    parse: (v) => v as KpiKrLinkStatus | 'all',
  });

  const [selectedKpi, setSelectedKpi] = useState<KpiHistoryDialogData | null>(null);

  // Fetch areas for filter
  const { data: areas = [] } = useAreas();
  
  // v2.90.0: Fetch KPI-KR links for filtering
  const { data: krLinks } = useKpiKrLinks();

  // Fetch KPIs with all filters
  const { kpis: rawKpis, aggregates, isLoading, error } = useKpiEvolutionList({
    indicatorType: indicatorTypeState.value === 'all' ? undefined : indicatorTypeState.value,
    areaId: areaState.value === 'all' ? undefined : areaState.value,
    scope: scopeState.value === 'all' ? undefined : scopeState.value,
    teamId: teamState.value === 'all' ? undefined : teamState.value,
    ragStatus: ragStatusState.value === 'all' ? undefined : ragStatusState.value,
    search: searchState.value || undefined,
  });
  
  // v2.90.0: Apply KR link filter client-side
  const kpis = useMemo(() => {
    if (krLinkStatusState.value === 'all' || !krLinks) return rawKpis;
    
    return rawKpis.filter((kpi) => {
      switch (krLinkStatusState.value) {
        case 'primary':
          return krLinks.primaryKpiIds.has(kpi.id);
        case 'guardrail':
          return krLinks.guardrailKpiIds.has(kpi.id);
        case 'none':
          return !krLinks.linkedKpiIds.has(kpi.id);
        default:
          return true;
      }
    });
  }, [rawKpis, krLinkStatusState.value, krLinks]);

  // Single KPI mode (when only one result from search)
  const singleKpiMode = kpis.length === 1 && searchState.value;

  const handleKpiSelect = (kpi: KpiEvolutionItem) => {
    setSelectedKpi({
      id: kpi.id,
      name: kpi.name,
      unit: kpi.unit,
      direction: kpi.direction,
      target_value: kpi.target_value,
      current_value: kpi.current_value,
      indicator_type: kpi.indicator_type,
      rag_status: kpi.rag_status,
      frequency: kpi.frequency as any,
      area: kpi.area,
      owner: kpi.owner,
      team: kpi.team,
    });
  };

  return (
    <HubLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb & Header */}
        <PageHeader
          title="Evolução de Indicadores"
          description="Visualize a evolução temporal de KPIs e Métricas"
          breadcrumbs={[
            { label: "Indicadores", href: "/kpis" },
            { label: "Evolução" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              {/* v2.89.1: SavedLinks no PageHeader.actions (padrão canônico) */}
              <SavedLinksPopover moduleSlug="kpis-evolution" />
              
              <Button variant="outline" asChild>
                <Link to="/kpis">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
            </div>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card 
            className={cn(
              "cursor-pointer transition-colors",
              ragStatusState.value === 'all' && "ring-2 ring-primary"
            )}
            onClick={() => ragStatusState.set('all')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{aggregates.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-colors",
              ragStatusState.value === 'on_track' && "ring-2 ring-success"
            )}
            onClick={() => ragStatusState.set('on_track')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-success">{aggregates.on_track}</div>
              <div className="text-sm text-muted-foreground">No Caminho</div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-colors",
              ragStatusState.value === 'at_risk' && "ring-2 ring-warning"
            )}
            onClick={() => ragStatusState.set('at_risk')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-warning">{aggregates.at_risk}</div>
              <div className="text-sm text-muted-foreground">Em Risco</div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-colors",
              ragStatusState.value === 'off_track' && "ring-2 ring-destructive"
            )}
            onClick={() => ragStatusState.set('off_track')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive">{aggregates.off_track}</div>
              <div className="text-sm text-muted-foreground">Fora da Meta</div>
            </CardContent>
          </Card>
        </div>

        {/* Linha 1: Busca + Filtros */}
        <ListPageFilters
          searchValue={searchState.value}
          onSearchChange={searchState.set}
          searchPlaceholder="Buscar indicador..."
        >
          <KpiDashboardFilters
            category="all"
            teamId={teamState.value}
            areaId={areaState.value}
            scope={scopeState.value}
            indicatorType={indicatorTypeState.value}
            ragStatus={ragStatusState.value}
            krLinkStatus={krLinkStatusState.value}
            onCategoryChange={() => {}}
            onTeamChange={teamState.set}
            onAreaChange={areaState.set}
            onScopeChange={scopeState.set}
            onIndicatorTypeChange={indicatorTypeState.set}
            onRagStatusChange={ragStatusState.set}
            onKrLinkStatusChange={krLinkStatusState.set}
          />
        </ListPageFilters>

        {/* Linha 2: Contador + Toggle de visualização */}
        <ViewOptionsBar
          resultCount={kpis.length}
          resultCountLabel="indicadores"
          resultCountLabelSingular="indicador"
        >
          <Tabs value={viewModeState.value} onValueChange={(v) => viewModeState.set(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="cards" className="gap-1.5">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5">
                <TableIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Tabela</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-1.5">
                <ChartLine className="h-4 w-4" />
                <span className="hidden sm:inline">Gráficos</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </ViewOptionsBar>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Carregando indicadores..." />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8">
              <EmptyState
                icon={ChartLine}
                title="Erro ao carregar indicadores"
                description="Ocorreu um erro ao carregar os dados. Tente novamente."
              />
            </CardContent>
          </Card>
        ) : kpis.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <EmptyState
                icon={ChartLine}
                title="Nenhum indicador encontrado"
                description="Ajuste os filtros ou crie novos indicadores."
              />
            </CardContent>
          </Card>
        ) : singleKpiMode ? (
          // Single KPI expanded view
          <KpiExpandedChart kpi={kpis[0]} />
        ) : viewModeState.value === 'cards' ? (
          // Cards Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map(kpi => (
              <KpiEvolutionCard key={kpi.id} kpi={kpi} onSelect={handleKpiSelect} />
            ))}
          </div>
        ) : viewModeState.value === 'table' ? (
          // Table View
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead className="text-right">Valor Atual</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Atualização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.map(kpi => {
                  const ragConfig = RAG_STATUS_CONFIG[kpi.rag_status];
                  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;
                  const trendColor = kpi.direction === 'up'
                    ? kpi.trend === 'up' ? 'text-success' : kpi.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                    : kpi.trend === 'down' ? 'text-success' : kpi.trend === 'up' ? 'text-destructive' : 'text-muted-foreground';

                  return (
                    <TableRow 
                      key={kpi.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleKpiSelect(kpi)}
                    >
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {kpi.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {INDICATOR_TYPE_LABELS[kpi.indicator_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {kpi.area ? (
                          <AreaBadge area={kpi.area} />
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatValue(kpi.current_value, kpi.unit)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {kpi.target_value ? formatValue(kpi.target_value, kpi.unit) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {kpi.variation !== null ? (
                          <div className={cn("flex items-center justify-end gap-1", trendColor)}>
                            <TrendIcon className="h-3.5 w-3.5" />
                            <span>{Math.abs(kpi.variation).toFixed(1)}%</span>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", ragConfig.color, ragConfig.bgColor)}>
                          {ragConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {kpi.last_updated_at 
                          ? format(parseISO(kpi.last_updated_at), "dd/MM/yyyy", { locale: ptBR })
                          : '—'
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ) : (
          // Charts Grid
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {kpis.map(kpi => (
              <div key={kpi.id} onClick={() => handleKpiSelect(kpi)} className="cursor-pointer">
                <KpiExpandedChart kpi={kpi} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History Dialog */}
      <KpiHistoryDialog
        open={!!selectedKpi}
        onOpenChange={(open) => !open && setSelectedKpi(null)}
        kpi={selectedKpi}
      />
    </HubLayout>
  );
}
