import { useState, useMemo, useEffect } from "react";
import { Plus, TrendingUp, BarChart3 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListPageFilters } from "@/components/ui/list-page-filters";
import { ViewOptionsBar } from "@/components/ui/view-options-bar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useKpiData, useKpiKrLinks } from "@/modules/kpis/hooks";
import { useAreas } from "@/modules/areas/hooks";
import { KpiDashboardFilters } from "../components/KpiDashboardFilters";
import { KpiAreaSection } from "../components/KpiAreaSection";
import { KpiDashboardTable } from "../components/KpiDashboardTable";
import { KpiViewToggle, type KpiViewMode } from "../components/KpiViewToggle";
import { KpiDetailDialog } from "../components/KpiDetailDialog";
import { CreateKpiDialog } from "../components/CreateKpiDialog";
import { AddKpiValueDialog } from "../components/AddKpiValueDialog";
import { KpiStatusSummary } from "../components/KpiStatusSummary";
import { KpiScope, KpiIndicatorType, KpiRagStatus, KpiKrLinkStatus, KpiWithValues } from "../types";
import { EmptyState } from "@/components/ui/empty-state";
import { useUrlState, useLocalSearch } from "@/shared/url";
import { useBu } from "@/contexts/BuContext";
import { usePermissions } from "@/hooks/usePermissions";
import { SavedLinksPopover } from "@/shared/saved-links";

/**
 * v2.90.0 - Dashboard de Indicadores
 * 
 * Mudanças:
 * - v2.83.0: Agrupamento por Área (em vez de Categoria)
 * - v2.83.0: Filtros atualizados: Tipo, Área, Escopo, Time
 * - v2.86.0: Adicionado toggle de visualização (Cards/Tabela)
 * - v2.86.0: Adicionado recurso de filtros salvos (SavedLinksPopover)
 * - v2.88.0: Layout padronizado - Linha 1 (Filtros) + Linha 2 (ViewOptionsBar)
 * - v2.89.0: Deep-linking via ?kpi= para abrir KpiDetailDialog automaticamente
 * - v2.90.0: Filtro de Vínculo com KRs (Primário, Guardrail, Sem vínculo)
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
  const ragStatusState = useUrlState<KpiRagStatus | "all">({
    key: 'status',
    defaultValue: 'all',
    parse: (v) => v as KpiRagStatus | "all",
  });
  
  // v2.90.0: KR Link filter state
  const krLinkStatusState = useUrlState<KpiKrLinkStatus | "all">({
    key: 'kr_link',
    defaultValue: 'all',
    parse: (v) => v as KpiKrLinkStatus | "all",
  });
  
  // v2.86.0: View mode state synced to URL
  const viewModeState = useUrlState<KpiViewMode>({
    key: 'view',
    defaultValue: 'cards',
    parse: (v) => v as KpiViewMode,
  });
  
  // v2.87.0: Text search with URL sync
  const { value: searchValue, setValue: setSearchValue } = useLocalSearch("q", 300);
  
  const indicatorTypeFilter = indicatorTypeState.value;
  const setIndicatorTypeFilter = indicatorTypeState.set;
  const areaFilter = areaState.value;
  const setAreaFilter = areaState.set;
  const scopeFilter = scopeState.value;
  const setScopeFilter = scopeState.set;
  const teamFilter = teamState.value;
  const setTeamFilter = teamState.set;
  const ragStatusFilter = ragStatusState.value;
  const setRagStatusFilter = ragStatusState.set;
  const krLinkStatusFilter = krLinkStatusState.value;
  const setKrLinkStatusFilter = krLinkStatusState.set;
  const viewMode = viewModeState.value;
  const setViewMode = viewModeState.set;
  
  // v2.89.0: Deep-linking - Read ?kpi= from URL to open KpiDetailDialog automatically
  const [searchParams, setSearchParams] = useSearchParams();
  const kpiIdFromUrl = searchParams.get('kpi');
  
  // Local state for dialogs
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [addValueOpen, setAddValueOpen] = useState(false);
  const [addValueKpi, setAddValueKpi] = useState<KpiWithValues | null>(null);
  
  // v2.89.0: Effect to open dialog when ?kpi= is in URL
  useEffect(() => {
    if (kpiIdFromUrl) {
      setSelectedKpiId(kpiIdFromUrl);
      setDetailOpen(true);
    }
  }, [kpiIdFromUrl]);
  
  // v2.89.0: Handle closing the detail dialog (clears URL param if present)
  const handleDetailOpenChange = (open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      setSelectedKpiId(null);
      // Clear ?kpi= from URL if it was a deep-link
      if (kpiIdFromUrl) {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('kpi');
        setSearchParams(newParams, { replace: true });
      }
    }
  };

  // Fetch areas for grouping
  const { data: areas = [] } = useAreas();
  
  // v2.90.0: Fetch KPI-KR links for filtering
  const { data: krLinks } = useKpiKrLinks();

  // Use real data from hook
  const { kpis: allKpis, isLoading, error } = useKpiData({
    areaId: areaFilter === 'all' ? undefined : areaFilter,
    scope: scopeFilter === 'all' ? undefined : scopeFilter,
    teamId: teamFilter === 'all' ? undefined : teamFilter,
    indicatorType: indicatorTypeFilter === 'all' ? undefined : indicatorTypeFilter,
  });

  // v2.87.0: Client-side text, status and KR link filtering
  const filteredKpis = useMemo(() => {
    let result = allKpis;
    
    // Filter by RAG status
    if (ragStatusFilter !== 'all') {
      result = result.filter((kpi) => kpi.rag_status === ragStatusFilter);
    }
    
    // v2.90.0: Filter by KR link status
    if (krLinkStatusFilter !== 'all') {
      result = result.filter((kpi) => {
        switch (krLinkStatusFilter) {
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
    }
    
    // Filter by text search
    if (searchValue.trim()) {
      const query = searchValue.toLowerCase().trim();
      result = result.filter((kpi) => {
        const searchableFields = [
          kpi.name,
          kpi.description,
          kpi.area?.name,
          kpi.owner?.display_name,
          kpi.unit,
        ].filter(Boolean).join(" ").toLowerCase();
        
        return searchableFields.includes(query);
      });
    }
    
    return result;
  }, [allKpis, searchValue, ragStatusFilter, krLinkStatusFilter, krLinks]);

  // Calculate summary from filtered data
  const summary = {
    total: filteredKpis.length,
    onTrack: filteredKpis.filter(k => k.rag_status === 'on_track').length,
    atRisk: filteredKpis.filter(k => k.rag_status === 'at_risk').length,
    offTrack: filteredKpis.filter(k => k.rag_status === 'off_track').length,
    improving: filteredKpis.filter(k => k.trend === 'up').length,
  };

  const handleKpiClick = (kpi: KpiWithValues) => {
    setSelectedKpiId(kpi.id);
    setDetailOpen(true);
  };

  // Group KPIs by area (only used in cards view)
  const kpisByArea = new Map<string | null, { areaName: string; areaColor: string | null; kpis: KpiWithValues[] }>();
  
  // Initialize with areas that have KPIs (use filtered data)
  filteredKpis.forEach((kpi) => {
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
        {/* Header com breadcrumbs integrados */}
        <PageHeader
          title="Indicadores"
          description={`KPIs e Métricas da ${currentBu?.name || 'organização'}`}
          breadcrumbs={[{ label: "Indicadores" }]}
          actions={
            <div className="flex items-center gap-2">
              {/* v2.86.0: Filtros Salvos */}
              <SavedLinksPopover moduleSlug="kpis" />
              
              {/* v2.87.0: Acesso ao Dashboard de Evolução */}
              <Button variant="outline" asChild>
                <Link to="/kpis/evolution">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Evolução
                </Link>
              </Button>
              
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

        {/* v2.88.0: Linha 1 - Busca + Filtros (todos em uma linha) */}
        <ListPageFilters
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Buscar indicadores..."
        >
          <KpiDashboardFilters
            category="all"
            teamId={teamFilter}
            areaId={areaFilter}
            scope={scopeFilter}
            indicatorType={indicatorTypeFilter}
            ragStatus={ragStatusFilter}
            krLinkStatus={krLinkStatusFilter}
            onCategoryChange={() => {}} // No-op, category deprecated
            onTeamChange={setTeamFilter}
            onAreaChange={setAreaFilter}
            onScopeChange={setScopeFilter}
            onIndicatorTypeChange={setIndicatorTypeFilter}
            onRagStatusChange={setRagStatusFilter}
            onKrLinkStatusChange={setKrLinkStatusFilter}
          />
        </ListPageFilters>

        {/* v2.88.0: Linha 2 - Contador + Opções de visualização */}
        <ViewOptionsBar
          resultCount={!isLoading ? filteredKpis.length : undefined}
          resultCountLabel="indicadores encontrados"
          resultCountLabelSingular="indicador encontrado"
        >
          <KpiViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
          />
        </ViewOptionsBar>

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
        ) : filteredKpis.length === 0 ? (
          <Card>
            <CardContent className="py-4">
              <EmptyState
                icon={BarChart3}
                title={searchValue ? "Nenhum resultado encontrado" : "Nenhum indicador encontrado"}
                description={
                  searchValue
                    ? `Nenhum indicador corresponde à busca "${searchValue}".`
                    : canCreateIndicator
                      ? `Comece criando seu primeiro indicador para acompanhar a saúde da ${currentBu?.name || 'organização'}.`
                      : "Nenhum indicador foi cadastrado ainda."
                }
                actionLabel={!searchValue && canCreateIndicator ? "Criar Indicador" : undefined}
                onAction={!searchValue && canCreateIndicator ? () => setCreateOpen(true) : undefined}
              />
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          // Table View
          <KpiDashboardTable 
            kpis={filteredKpis} 
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
        onOpenChange={handleDetailOpenChange}
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
