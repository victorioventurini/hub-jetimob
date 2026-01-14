import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HubLayout } from "@/components/layout/HubLayout";
import { useBu } from "@/contexts/BuContext";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useTeamContributionView } from "../hooks";
import { TeamContributionHeader } from "../components/team-contribution/TeamContributionHeader";
import { OrgObjectiveContributionCard } from "../components/team-contribution/OrgObjectiveContributionCard";
import { TeamContributionInsights } from "../components/team-contribution/TeamContributionInsights";
import { TeamContributionFilters } from "../components/team-contribution/TeamContributionFilters";
import { EmptyState } from "@/components/ui/empty-state";
import { useSafeBack } from "@/hooks/useSafeBack";
import { useUrlState } from "@/shared/url";
import { OkrTeamContributionBreadcrumb } from "../components/ui/OkrBreadcrumb";

export default function TeamContributionPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const goBack = useSafeBack({ moduleRoot: '/teams' });
  const { currentBu } = useBu();
  const { data, isLoading, error } = useTeamContributionView(teamId);
  
  // URL State for filters
  const { value: statusFilter, set: setStatusFilter } = useUrlState<string>({ 
    key: 'status', 
    defaultValue: 'all' 
  });

  const filteredContributions = useMemo(() => {
    if (!data?.contributions) return [];
    
    if (statusFilter === "all") return data.contributions;
    
    return data.contributions.filter(c => c.status === statusFilter);
  }, [data?.contributions, statusFilter]);

  if (isLoading) {
    return (
      <HubLayout>
        <LoadingState text="Carregando contribuições..." className="min-h-[400px]" />
      </HubLayout>
    );
  }

  if (error || !data) {
    return (
      <HubLayout>
        <div className="p-6">
          <ErrorState
            title="Erro ao carregar dados"
            description="Não foi possível carregar a visão de contribuição do time."
            onBack={goBack}
          />
        </div>
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <OkrTeamContributionBreadcrumb teamName={data.team.name} />

        {/* Header */}
        <TeamContributionHeader data={data} buName={currentBu?.name} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Contributions List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Objetivos Organizacionais Impactados
            </h2>
            <TeamContributionFilters 
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />
          </div>

          {filteredContributions.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Nenhuma contribuição encontrada"
              description={
                statusFilter !== "all"
                  ? "Nenhum objetivo encontrado com o filtro selecionado."
                  : "Este time ainda não possui OKRs vinculados a Objetivos Organizacionais."
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredContributions.map((contribution) => (
                <OrgObjectiveContributionCard
                  key={contribution.id}
                  contribution={contribution}
                  onNavigateToObjective={(id) => navigate(`/okrs/org-view/${id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Insights Sidebar */}
        <div className="lg:col-span-1">
          <TeamContributionInsights data={data} />
        </div>
      </div>
      </div>
    </HubLayout>
  );
}
