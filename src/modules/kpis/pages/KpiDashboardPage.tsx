import { useState } from "react";
import { Plus, BarChart3 } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { KpisBreadcrumb } from "@/components/ui/global-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useKpiData } from "../hooks/useKpiData";
import { KpiDashboardFilters } from "../components/KpiDashboardFilters";
import { KpiCategorySection } from "../components/KpiCategorySection";
import { KpiDetailDialog } from "../components/KpiDetailDialog";
import { CreateKpiDialog } from "../components/CreateKpiDialog";
import { AddKpiValueDialog } from "../components/AddKpiValueDialog";
import { KpiStatusSummary } from "../components/KpiStatusSummary";
import { KpiCategory, KpiWithValues, CATEGORY_LABELS } from "../types";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/ui/empty-state";
import { useUrlState } from "@/shared/url";
import { useBu } from "@/contexts/BuContext";

export default function KpiDashboardPage() {
  usePageTitle("KPIs");
  const { isAdmin } = useAuth();
  const { currentBu } = useBu();
  
  // URL State
  const categoryState = useUrlState<KpiCategory | "all">({ 
    key: 'category', 
    defaultValue: 'all',
    parse: (v) => v as KpiCategory | "all",
  });
  const teamState = useUrlState<string>({ key: 'team_id', defaultValue: 'all' });
  
  const categoryFilter = categoryState.value;
  const setCategoryFilter = categoryState.set;
  const teamFilter = teamState.value;
  const setTeamFilter = teamState.set;
  
  // Local state for dialogs
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [addValueOpen, setAddValueOpen] = useState(false);
  const [addValueKpi, setAddValueKpi] = useState<KpiWithValues | null>(null);

  // Use real data from hook
  const { kpis: allKpis, isLoading, error } = useKpiData({
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    teamId: teamFilter === 'all' ? undefined : teamFilter,
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

  // Group KPIs by category
  const kpisByCategory = (Object.keys(CATEGORY_LABELS) as KpiCategory[]).reduce(
    (acc, category) => {
      acc[category] = allKpis.filter((kpi) => kpi.category === category);
      return acc;
    },
    {} as Record<KpiCategory, KpiWithValues[]>
  );

  return (
    <HubLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <KpisBreadcrumb />
        <PageHeader
          title="KPIs"
          description={`Indicadores de saúde da ${currentBu?.name || 'organização'}`}
          actions={
            isAdmin && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo KPI
              </Button>
            )
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

        {/* Filters */}
        <KpiDashboardFilters
          category={categoryFilter}
          teamId={teamFilter}
          onCategoryChange={setCategoryFilter}
          onTeamChange={setTeamFilter}
        />

        {/* KPIs by Category */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Carregando KPIs..." />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-4">
              <EmptyState
                icon={BarChart3}
                title="Erro ao carregar KPIs"
                description="Ocorreu um erro ao carregar os indicadores. Tente novamente."
              />
            </CardContent>
          </Card>
        ) : allKpis.length === 0 ? (
          <Card>
            <CardContent className="py-4">
              <EmptyState
                icon={BarChart3}
                title="Nenhum KPI encontrado"
                description={
                  isAdmin
                    ? `Comece criando seu primeiro KPI para acompanhar a saúde da ${currentBu?.name || 'organização'}.`
                    : "Nenhum KPI foi cadastrado ainda."
                }
                actionLabel={isAdmin ? "Criar KPI" : undefined}
                onAction={isAdmin ? () => setCreateOpen(true) : undefined}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {(Object.keys(CATEGORY_LABELS) as KpiCategory[]).map((category) => (
              kpisByCategory[category].length > 0 && (
                <KpiCategorySection
                  key={category}
                  category={category}
                  kpis={kpisByCategory[category]}
                  onKpiClick={handleKpiClick}
                />
              )
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
