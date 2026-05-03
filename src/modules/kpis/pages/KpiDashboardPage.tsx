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
import { KpiDashboardFilters, type KpiNeedsUpdateFilter } from "../components/KpiDashboardFilters";
import { KpiAreaSection } from "../components/KpiAreaSection";
import { KpiDashboardTable } from "../components/KpiDashboardTable";
import { KpiViewToggle, type KpiViewMode } from "../components/KpiViewToggle";
import { KpiDetailDialog } from "../components/KpiDetailDialog";
import { CreateKpiDialog } from "../components/CreateKpiDialog";
import { AddKpiValueDialog } from "../components/AddKpiValueDialog";
import { KpiStatusSummary } from "../components/KpiStatusSummary";
import { KpiMigrationBanner } from "../components/KpiMigrationBanner";
import { KpiScope, KpiIndicatorType, KpiRagStatus, KpiKrLinkStatus, KpiWithValues } from "../types";
import { EmptyState } from "@/components/ui/empty-state";
import { useUrlState, useLocalSearch } from "@/shared/url";
import { useBu } from "@/contexts/BuContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useHierarchicalLeadership } from "@/hooks/useHierarchicalLeadership";
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
  // Pode criar se tiver permissão de criar métricas, gerenciar KPIs ou for líder hierárquico
  // (líder de área/time pode cadastrar KPIs/Métricas no seu escopo). O CreateKpiDialog filtra
  // os escopos disponíveis via useCanCreateKpi.
  const { manageableTeamIds, ledAreaIds } = useHierarchicalLeadership();
  const canCreateIndicator =
    hasPermission("kpis.metric.create:bu") ||
    hasPermission("kpis.settings.manage:bu") ||
    manageableTeamIds.length > 0 ||
    ledAreaIds.length > 0;
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
  const ownerState = useUrlState<string>({ key: 'owner_id', defaultValue: 'all' });
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
    defaultValue: 'table',
    parse: (v) => v as KpiViewMode,
  });

  // v3.0.0: Filter "indicadores pendentes de revisão"
  const needsReviewState = useUrlState<"0" | "1">({
    key: 'needs_review',
    defaultValue: '0',
    parse: (v) => (v === '1' ? '1' : '0'),
  });
  const needsReviewOnly = needsReviewState.value === '1';

  // Governança: KPIs de Área/Global sem Time Responsável
  const missingResponsibleState = useUrlState<"0" | "1">({
    key: 'missing_responsible',
    defaultValue: '0',
    parse: (v) => (v === '1' ? '1' : '0'),
  });
  const missingResponsibleOnly = missingResponsibleState.value === '1';

  // v3.x — Filtro "Atualização" (Regra A overdue + Regra B consolidação pendente)
  const needsUpdateState = useUrlState<KpiNeedsUpdateFilter>({
    key: 'needs_update',
    defaultValue: 'all',
    parse: (v) => (['any', 'overdue', 'pending'].includes(v) ? (v as KpiNeedsUpdateFilter) : 'all'),
  });
  const needsUpdateFilter = needsUpdateState.value;
  
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
  const ownerFilter = ownerState.value;
  const setOwnerFilter = ownerState.set;
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
    ownerId: ownerFilter === 'all' ? undefined : ownerFilter,
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

    // v3.0.0: Filter by "needs review" (frequency_migration_reviewed=false)
    if (needsReviewOnly) {
      result = result.filter((kpi) => kpi.frequency_migration_reviewed === false);
    }

    // Governança: KPIs Área/Global sem Time Responsável
    if (missingResponsibleOnly) {
      result = result.filter(
        (kpi) => (kpi.scope === 'area' || kpi.scope === 'org') && !kpi.responsible_team_id,
      );
    }

    return result;
  }, [allKpis, searchValue, ragStatusFilter, krLinkStatusFilter, krLinks, needsReviewOnly, missingResponsibleOnly]);

  // v3.0.0: Count of KPIs pending migration review (uses unfiltered base)
  const pendingReviewCount = useMemo(
    () => allKpis.filter((k) => k.frequency_migration_reviewed === false).length,
    [allKpis],
  );
  const missingResponsibleCount = useMemo(
    () =>
      allKpis.filter(
        (k) => (k.scope === 'area' || k.scope === 'org') && !k.responsible_team_id,
      ).length,
    [allKpis],
  );
  const canManageKpis = hasPermission("kpis.settings.manage:bu");

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
            <div className="flex items-center gap-2 flex-wrap">
              {/* v2.86.0: Filtros Salvos */}
              <SavedLinksPopover moduleSlug="kpis" />

              {/* v2.87.0: Acesso ao Dashboard de Evolução */}
              <Button variant="outline" asChild aria-label="Evolução">
                <Link to="/kpis/evolution">
                  <TrendingUp className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Evolução</span>
                </Link>
              </Button>

              {canCreateIndicator && (
                <Button onClick={() => setCreateOpen(true)} aria-label="Novo Indicador">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Novo Indicador</span>
                </Button>
              )}
            </div>
          }
        />

        {/* v3.0.0: Banner global de migração de frequência */}
        {canManageKpis && pendingReviewCount > 0 && !needsReviewOnly && (
          <KpiMigrationBanner
            variant="dashboard-global"
            count={pendingReviewCount}
            onReview={() => needsReviewState.set('1')}
          />
        )}
        {needsReviewOnly && (
          <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Mostrando apenas indicadores pendentes de revisão de frequência.
            </span>
            <Button size="sm" variant="ghost" onClick={() => needsReviewState.set('0')}>
              Limpar filtro
            </Button>
          </div>
        )}

        {/* Governança: KPIs de Área/Global sem Time Responsável */}
        {canManageKpis && missingResponsibleCount > 0 && !missingResponsibleOnly && (
          <div className="flex items-center justify-between rounded-md border border-dashed border-warning/40 bg-warning/10 px-3 py-2 text-sm">
            <span className="text-foreground">
              <strong>{missingResponsibleCount}</strong>{' '}
              {missingResponsibleCount === 1
                ? 'indicador de Área/Global sem Time Responsável.'
                : 'indicadores de Área/Globais sem Time Responsável.'}
            </span>
            <Button size="sm" variant="outline" onClick={() => missingResponsibleState.set('1')}>
              Revisar
            </Button>
          </div>
        )}
        {missingResponsibleOnly && (
          <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Mostrando apenas indicadores de Área/Globais sem Time Responsável.
            </span>
            <Button size="sm" variant="ghost" onClick={() => missingResponsibleState.set('0')}>
              Limpar filtro
            </Button>
          </div>
        )}

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
            ownerId={ownerFilter}
            onCategoryChange={() => {}} // No-op, category deprecated
            onTeamChange={setTeamFilter}
            onAreaChange={setAreaFilter}
            onScopeChange={setScopeFilter}
            onIndicatorTypeChange={setIndicatorTypeFilter}
            onRagStatusChange={setRagStatusFilter}
            onKrLinkStatusChange={setKrLinkStatusFilter}
            onOwnerChange={setOwnerFilter}
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
          consolidationFrequency={addValueKpi.consolidation_frequency ?? null}
          updateFrequency={addValueKpi.update_frequency ?? null}
          open={addValueOpen}
          onOpenChange={setAddValueOpen}
        />
      )}
    </HubLayout>
  );
}
