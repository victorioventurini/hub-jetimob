import { useState } from "react";
import { Plus, BarChart3, AlertCircle } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useKpiData } from "../hooks/useKpiData";
import { KpiDashboardFilters } from "../components/KpiDashboardFilters";
import { KpiCategorySection } from "../components/KpiCategorySection";
import { KpiDetailDialog } from "../components/KpiDetailDialog";
import { CreateKpiDialog } from "../components/CreateKpiDialog";
import { AddKpiValueDialog } from "../components/AddKpiValueDialog";
import { KpiCategory, KpiWithValues, CATEGORY_LABELS } from "../types";
import { useAuth } from "@/hooks/useAuth";

export default function KpiDashboardPage() {
  const { isAdmin } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<KpiCategory | "all">("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [addValueOpen, setAddValueOpen] = useState(false);
  const [addValueKpi, setAddValueKpi] = useState<KpiWithValues | null>(null);

  const { kpis, isLoading } = useKpiData({
    category: categoryFilter === "all" ? undefined : categoryFilter,
    teamId: teamFilter === "all" ? undefined : teamFilter,
  });

  const handleKpiClick = (kpi: KpiWithValues) => {
    setSelectedKpiId(kpi.id);
    setDetailOpen(true);
  };

  // Group KPIs by category
  const kpisByCategory = (Object.keys(CATEGORY_LABELS) as KpiCategory[]).reduce(
    (acc, category) => {
      acc[category] = kpis.filter((kpi) => kpi.category === category);
      return acc;
    },
    {} as Record<KpiCategory, KpiWithValues[]>
  );

  // Summary stats
  const totalKpis = kpis.length;
  const kpisWithData = kpis.filter((k) => k.current_value !== null).length;
  const kpisImproving = kpis.filter(
    (k) =>
      (k.direction === "up" && k.trend === "up") ||
      (k.direction === "down" && k.trend === "down")
  ).length;
  const kpisWorsening = kpis.filter(
    (k) =>
      (k.direction === "up" && k.trend === "down") ||
      (k.direction === "down" && k.trend === "up")
  ).length;

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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-foreground">{totalKpis}</div>
              <p className="text-xs text-muted-foreground">KPIs ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-foreground">{kpisWithData}</div>
              <p className="text-xs text-muted-foreground">Com dados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-emerald-500">{kpisImproving}</div>
              <p className="text-xs text-muted-foreground">Melhorando</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-500">{kpisWorsening}</div>
              <p className="text-xs text-muted-foreground">Piorando</p>
            </CardContent>
          </Card>
        </div>

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
        ) : kpis.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum KPI encontrado
              </h3>
              <p className="text-muted-foreground text-center max-w-md">
                {isAdmin
                  ? "Comece criando seu primeiro KPI para acompanhar a saúde do negócio."
                  : "Nenhum KPI foi cadastrado ainda."}
              </p>
              {isAdmin && (
                <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar KPI
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {(Object.keys(CATEGORY_LABELS) as KpiCategory[]).map((category) => (
              <KpiCategorySection
                key={category}
                category={category}
                kpis={kpisByCategory[category]}
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
