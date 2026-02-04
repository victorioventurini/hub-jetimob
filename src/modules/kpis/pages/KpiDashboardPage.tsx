import { useState } from "react";
import { Plus, BarChart3 } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { KpisBreadcrumb } from "@/components/ui/global-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useKpiData } from "@/modules/kpis/hooks";
import { useAreas } from "@/modules/areas/hooks";
import { KpiDashboardFilters } from "../components/KpiDashboardFilters";
import { KpiAreaSection } from "../components/KpiAreaSection";
import { KpiDashboardTable } from "../components/KpiDashboardTable";
import { KpiViewToggle, type KpiViewMode } from "../components/KpiViewToggle";
import { KpiDetailDialog } from "../components/KpiDetailDialog";
import { CreateKpiDialog } from "../components/CreateKpiDialog";
import { AddKpiValueDialog } from "../components/AddKpiValueDialog";
import { KpiStatusSummary } from "../components/KpiStatusSummary";
import { KpiScope, KpiIndicatorType, KpiWithValues } from "../types";
import { EmptyState } from "@/components/ui/empty-state";
import { useUrlState } from "@/shared/url";
import { useBu } from "@/contexts/BuContext";
import { usePermissions } from "@/hooks/usePermissions";
import { SavedLinksPopover } from "@/shared/saved-links";

/**
 * v2.86.0 - Dashboard de Indicadores
 * 
 * Mudanças:
 * - v2.83.0: Agrupamento por Área (em vez de Categoria)
 * - v2.83.0: Filtros atualizados: Tipo, Área, Escopo, Time
 * - v2.86.0: Adicionado toggle de visualização (Cards/Tabela)
 * - v2.86.0: Adicionado recurso de filtros salvos (SavedLinksPopover)
 */

export default function KpiDashboardPage() {
  usePageTitle("Indicadores");
  const { has: hasPermission } = usePermissions();
  // Pode criar se tiver permissão de criar métricas OU gerenciar KPIs
  const canCreateIndicator = hasPermission("kpis.metric.create:bu") || hasPermission("kpis.settings.manage:bu");
  const { currentBu } = useBu();
  
  // URL State for filters
  const indicatorTypeState = useUrlState<KpiIndicatorType | "all">({ 
    key: 'type', 
    defaultValue: 'all',
    parse: (v) => v as KpiIndicatorType | "all",
  });
  const areaState = useUrlState<string>({ key: 'area_id', defaultValue: 'all' });
  const scopeState = useUrlState<KpiScope | "all">({ 
    key: 'scope', 
    defaultValue: 'all',
    parse: (v) => v as KpiScope | "all",
  });
  const teamState = useUrlState<string>({ key: 'team_id', defaultValue: 'all' });
  
  // v2.86.0: View mode state synced to URL
  const viewModeState = useUrlState<KpiViewMode>({
    key: 'view',
    defaultValue: 'cards',
    parse: (v) => v as KpiViewMode,
  });
  
  const indicatorTypeFilter = indicatorTypeState.value;
  const setIndicatorTypeFilter = indicatorTypeState.set;
  const areaFilter = areaState.value;
  const setAreaFilter = areaState.set;
  const scopeFilter = scopeState.value;
  const setScopeFilter = scopeState.set;
  const teamFilter = teamState.value;
  const setTeamFilter = teamState.set;
  const viewMode = viewModeState.value;
  const setViewMode = viewModeState.set;
  
  // Local state for dialogs
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [addValueOpen, setAddValueOpen] = useState(false);
  const [addValueKpi, setAddValueKpi] = useState<KpiWithValues | null>(null);

  // Fetch areas for grouping
  const { data: areas = [] } = useAreas();

  // Use real data from hook
  const { kpis: allKpis, isLoading, error } = useKpiData({
    areaId: areaFilter === 'all' ? undefined : areaFilter,
    scope: scopeFilter === 'all' ? undefined : scopeFilter,
    teamId: teamFilter === 'all' ? undefined : teamFilter,
    indicatorType: indicatorTypeFilter === 'all' ? undefined : indicatorTypeFilter,
  });

  // Calculate summary from real data
  const summary = {
    total: allKpis.length,
    onTrack: allKpis.filter(k => k.rag_status === 'on_track').length,
    atRisk: allKpis.filter(k => k.rag_status === 'at_risk').length,
    offTrack: allKpis.filter(k => k.rag_status === 'off_track').length,
    improving: allKpis.filter(k => k.trend === 'up').length,
  };

  const handleKpiClick = (kpi: KpiWithValues) => {
    setSelectedKpiId(kpi.id);
    setDetailOpen(true);
  };

  // Group KPIs by area (only used in cards view)
  const kpisByArea = new Map<string | null, { areaName: string; areaColor: string | null; kpis: KpiWithValues[] }>();
  
  // Initialize with areas that have KPIs
  allKpis.forEach((kpi) => {
    const areaId = kpi.area_id;
    const areaInfo = areas.find(a => a.id === areaId);
    
    if (!kpisByArea.has(areaId)) {
      kpisByArea.set(areaId, {
        areaName: areaInfo?.name || kpi.area?.name || "Sem Área",
        areaColor: areaInfo?.color || kpi.area?.color || null,
        kpis: [],
      });
    }
    
    kpisByArea.get(areaId)!.kpis.push(kpi);
  });

  // Sort areas by name
  const sortedAreas = Array.from(kpisByArea.entries()).sort((a, b) => {
    // "Sem Área" goes last
    if (a[0] === null) return 1;
    if (b[0] === null) return -1;
    return a[1].areaName.localeCompare(b[1].areaName);
  });

  return (
    <HubLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <KpisBreadcrumb />
        <PageHeader
          title="Indicadores"
          description={`KPIs e Métricas da ${currentBu?.name || 'organização'}`}
          actions={
            <div className="flex items-center gap-2">
              {/* v2.86.0: Filtros Salvos */}
              <SavedLinksPopover moduleSlug="kpis" />
              
              {canCreateIndicator && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Indicador
                </Button>
              )}
            </div>
          }
        />

        {/* Status Summary */}
        <KpiStatusSummary
          total={summary.total}
          onTrack={summary.onTrack}
          atRisk={summary.atRisk}
          offTrack={summary.offTrack}
          improving={summary.improving}
        />

        {/* Filters Row - v2.86.0: Added view toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <KpiDashboardFilters
            category="all"
            teamId={teamFilter}
            areaId={areaFilter}
            scope={scopeFilter}
            indicatorType={indicatorTypeFilter}
            onCategoryChange={() => {}} // No-op, category deprecated
            onTeamChange={setTeamFilter}
            onAreaChange={setAreaFilter}
            onScopeChange={setScopeFilter}
            onIndicatorTypeChange={setIndicatorTypeFilter}
          />
          
          {/* View Mode Toggle */}
          <KpiViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
          />
        </div>

        {/* Result count */}
        {!isLoading && allKpis.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{allKpis.length.toLocaleString("pt-BR")}</span>{" "}
            {allKpis.length === 1 ? "indicador encontrado" : "indicadores encontrados"}
          </div>
        )}

        {/* KPIs Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Carregando indicadores..." />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-4">
              <EmptyState
                icon={BarChart3}
                title="Erro ao carregar indicadores"
                description="Ocorreu um erro ao carregar os indicadores. Tente novamente."
              />
            </CardContent>
          </Card>
        ) : allKpis.length === 0 ? (
          <Card>
            <CardContent className="py-4">
              <EmptyState
                icon={BarChart3}
                title="Nenhum indicador encontrado"
                description={
                  canCreateIndicator
                    ? `Comece criando seu primeiro indicador para acompanhar a saúde da ${currentBu?.name || 'organização'}.`
                    : "Nenhum indicador foi cadastrado ainda."
                }
                actionLabel={canCreateIndicator ? "Criar Indicador" : undefined}
                onAction={canCreateIndicator ? () => setCreateOpen(true) : undefined}
              />
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          // Table View
          <KpiDashboardTable 
            kpis={allKpis} 
            onKpiClick={handleKpiClick} 
          />
        ) : (
          // Cards View (grouped by area)
          <div className="space-y-8">
            {sortedAreas.map(([areaId, { areaName, areaColor, kpis }]) => (
              <KpiAreaSection
                key={areaId || 'no-area'}
                areaId={areaId}
                areaName={areaName}
                areaColor={areaColor}
                kpis={kpis}
                onKpiClick={handleKpiClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <KpiDetailDialog
        kpiId={selectedKpiId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <CreateKpiDialog open={createOpen} onOpenChange={setCreateOpen} />

      {addValueKpi && (
        <AddKpiValueDialog
          kpiId={addValueKpi.id}
          kpiName={addValueKpi.name}
          unit={addValueKpi.unit}
          open={addValueOpen}
          onOpenChange={setAddValueOpen}
        />
      )}
    </HubLayout>
  );
}
