/**
 * OkrQualityPage - Página de qualidade das OKRs
 * 
 * Requisitos:
 * - Líderes veem apenas seus times
 * - Admins (wildcard) veem todos os times da BU
 * - URL state para team e cycle
 * - Meta tags para SEO
 */

import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronLeft, ShieldX, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUrlState } from "@/shared/url/useUrlState";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useLeaderTeams } from "@/modules/home/hooks/useLeaderTeams";
import { useActiveCycles } from "@/modules/okrs/hooks/useCycleData";
import { useTeamOkrQuality } from "../hooks/useTeamOkrQuality";
import { usePermissions } from "@/hooks/usePermissions";
import { useHierarchicalTeamList, type FlatTeamItem } from "@/modules/teams/hooks/useTeams";
import { TeamSelect } from "@/components/selects/TeamSelect";
import {
  QualityOverviewCard,
  QualityMetricsGrid,
  ObjectiveQualityList,
  QualityInsightsPanel,
} from "../components/quality";
import { Skeleton } from "@/components/ui/skeleton";

export default function OkrQualityPage() {
  const navigate = useNavigate();
  const { isWildcard, isLoading: isLoadingPermissions } = usePermissions();

  // Get leader teams (for non-admins)
  const { teams: leaderTeamsRaw, isLeader, isLoading: isLoadingLeaderTeams } = useLeaderTeams();
  
  // Get all teams (for admins)
  const { teams: allTeams, isLoading: isLoadingAllTeams } = useHierarchicalTeamList();

  // Determine which teams to show based on user role
  const isAdmin = isWildcard;
  const teams: FlatTeamItem[] = useMemo(() => {
    if (isAdmin) {
      return allTeams;
    }
    // Convert leader teams format to FlatTeamItem format
    return leaderTeamsRaw.map(t => ({
      id: t.team_id,
      name: t.team_name,
      level: 0,
      parentId: null,
    }));
  }, [isAdmin, allTeams, leaderTeamsRaw]);

  const isLoadingTeams = isLoadingPermissions || (isAdmin ? isLoadingAllTeams : isLoadingLeaderTeams);
  const hasAccess = isAdmin || isLeader;

  // Get active cycles
  const { data: activeCycles, isLoading: isLoadingCycles } = useActiveCycles();
  const defaultCycleId = activeCycles?.[0]?.id || '';

  // URL State - Team ID
  const teamIdState = useUrlState<string>({
    key: 'team',
    defaultValue: '',
    parse: (v) => v || '',
    serialize: (v) => v || '',
  });
  const teamParam = teamIdState.value;
  const setTeamParam = teamIdState.set;
  const selectedTeamId = teamParam || teams[0]?.id || '';

  // URL State - Cycle ID
  const cycleIdState = useUrlState<string>({
    key: 'cycle',
    defaultValue: '',
    parse: (v) => v || '',
    serialize: (v) => v || '',
  });
  const cycleParam = cycleIdState.value;
  const setCycleParam = cycleIdState.set;
  const selectedCycleId = cycleParam || defaultCycleId;

  // Keep URL state shareable by setting defaults once data is available
  useEffect(() => {
    if (!teamParam && teams.length > 0) {
      setTeamParam(teams[0].id);
    }
  }, [teamParam, teams, setTeamParam]);

  useEffect(() => {
    if (!cycleParam && defaultCycleId) {
      setCycleParam(defaultCycleId);
    }
  }, [cycleParam, defaultCycleId, setCycleParam]);

  // Get selected team and cycle names
  const selectedTeam = useMemo(() => 
    teams?.find(t => t.id === selectedTeamId),
    [teams, selectedTeamId]
  );
  
  const selectedCycle = useMemo(() => 
    activeCycles?.find(c => c.id === selectedCycleId),
    [activeCycles, selectedCycleId]
  );

  // Page title
  usePageTitle(selectedTeam ? `Qualidade OKRs - ${selectedTeam.name}` : 'Qualidade das OKRs');

  // Fetch quality data
  const { 
    overview, 
    krMetrics, 
    objectives, 
    isLoading: isLoadingQuality 
  } = useTeamOkrQuality(selectedTeamId || null, selectedCycleId || null);

  // Loading state
  if (isLoadingTeams) {
    return (
      <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Access restriction - only leaders and admins
  if (!hasAccess) {
    return (
      <div className="container max-w-7xl mx-auto py-6 px-4">
        <Helmet>
          <title>Acesso Restrito | Hub Jetimob</title>
          <meta name="description" content="Esta página é exclusiva para líderes de time e administradores." />
        </Helmet>
        
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <ShieldX className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            Esta página é exclusiva para líderes de time e administradores. Você precisa ser líder de pelo menos um time ou ter permissões administrativas para acessar a análise de qualidade das OKRs.
          </p>
          <Button onClick={() => navigate('/okrs')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar para OKRs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      <Helmet>
        <title>Qualidade das OKRs{selectedTeam ? ` - ${selectedTeam.name}` : ''} | Hub Jetimob</title>
        <meta 
          name="description" 
          content="Visualize a saúde e qualidade das OKRs do seu time. Identifique objetivos em risco e KRs que precisam de atenção." 
        />
      </Helmet>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/okrs')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Qualidade das OKRs
            </h1>
            <p className="text-sm text-muted-foreground">
              Avalie a saúde das OKRs do seu time
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Team selector - uses canonical TeamSelect with hierarchical display */}
          <TeamSelect
            value={selectedTeamId}
            onValueChange={(value) => teamIdState.set(value || '')}
            teams={teams}
            placeholder="Selecione o time"
            triggerClassName="w-[220px]"
          />

          {/* Cycle selector */}
          <Select
            value={selectedCycleId}
            onValueChange={(value) => cycleIdState.set(value)}
            disabled={isLoadingCycles}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o ciclo" />
            </SelectTrigger>
            <SelectContent>
              {activeCycles?.map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Overview and Insights row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QualityOverviewCard 
            overview={overview} 
            isLoading={isLoadingQuality} 
          />
          <QualityInsightsPanel 
            overview={overview}
            metrics={krMetrics}
            isLoading={isLoadingQuality} 
          />
        </div>

        {/* KR Metrics */}
        <QualityMetricsGrid 
          metrics={krMetrics} 
          isLoading={isLoadingQuality} 
        />

        {/* Objectives list */}
        <ObjectiveQualityList 
          objectives={objectives} 
          isLoading={isLoadingQuality} 
        />
      </div>
    </div>
  );
}
