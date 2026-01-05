import { useState } from "react";
import { Plus, BarChart3 } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useMockKpiData } from "../hooks/useMockKpiData";
import { KpiDashboardFilters } from "../components/KpiDashboardFilters";
import { KpiCategorySection } from "../components/KpiCategorySection";
import { KpiDetailDialog } from "../components/KpiDetailDialog";
import { CreateKpiDialog } from "../components/CreateKpiDialog";
import { AddKpiValueDialog } from "../components/AddKpiValueDialog";
import { KpiStatusSummary } from "../components/KpiStatusSummary";
import { KpiCategory, KpiWithValues, CATEGORY_LABELS } from "../types";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/ui/empty-state";
import { useUrlState } from "@/hooks/useUrlState";

export default function KpiDashboardPage() {
  usePageTitle("KPIs");
  const { isAdmin } = useAuth();
  
  // URL State
  const [categoryFilter, setCategoryFilter] = useUrlState<KpiCategory | "all">({ 
    key: 'category', 
    defaultValue: 'all',
    parse: (v) => v as KpiCategory | "all",
  });
  const [teamFilter, setTeamFilter] = useUrlState({ key: 'team_id', defaultValue: 'all' });
  
  // Local state for dialogs
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [addValueOpen, setAddValueOpen] = useState(false);
  const [addValueKpi, setAddValueKpi] = useState<KpiWithValues | null>(null);

  // Use mock data for now
  const { kpis: allKpis, summary, isLoading } = useMockKpiData();

  // Apply filters
  const filteredKpis = allKpis.filter((kpi) => {
    if (categoryFilter !== "all" && kpi.category !== categoryFilter) return false;
    if (teamFilter !== "all" && kpi.team_id !== teamFilter) return false;
    return true;
  });

  const handleKpiClick = (kpi: KpiWithValues) => {
    setSelectedKpiId(kpi.id);
    setDetailOpen(true);
  };

  // Group KPIs by category
  const kpisByCategory = (Object.keys(CATEGORY_LABELS) as KpiCategory[]).reduce(
    (acc, category) => {
      acc[category] = filteredKpis.filter((kpi) => kpi.category === category);
      return acc;
    },
    {} as Record<KpiCategory, KpiWithValues[]>
  );

  // Get unique teams for filter
  const teams = Array.from(new Set(allKpis.map(k => k.team).filter(Boolean)));

  return (
    <HubLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              KPIs
            </h1>
            <p className="text-muted-foreground mt-1">
              Indicadores de saúde do negócio
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo KPI
            </Button>
          )}
        </div>

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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : filteredKpis.length === 0 ? (
          <Card>
            <CardContent className="py-4">
              <EmptyState
                icon={BarChart3}
                title="Nenhum KPI encontrado"
                description={
                  isAdmin
                    ? "Comece criando seu primeiro KPI para acompanhar a saúde do negócio."
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
