import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, AlertTriangle, Target, TrendingUp, Crosshair, RefreshCw, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useBu } from '@/contexts/BuContext';
import { useUrlState, useUrlStates, parsers, serializers } from '@/shared/url';
import { 
  useOrgObjectives, 
  useTeamObjectives, 
  useTeamKeyResults,
  useTeams, 
  useOrgKeyResults,
  useLatestCheckinDate,
  useUserProfile,
} from '../hooks/queries';
import { useKrStatusDistribution, OkrCalculatedStatus } from '../hooks/useOkrStatus';
import { usePendingCheckins } from '../hooks/usePendingCheckins';
import { useSharedOkrsInsights } from '../hooks/useTeamContributedOkrs';
import { useManageableTeams } from '../hooks/useManageableTeams';
import { useCanManageOrgOkr } from '../hooks/useCanManageTeamOkr';
import { calculateProgress } from '../types';

import { OkrViewSelector, OkrView } from '../components/dashboard/OkrViewSelector';
import { OkrDashboardFilters } from '../components/dashboard/OkrDashboardFilters';
import { OverallProgressCard } from '../components/dashboard/OverallProgressCard';
import { StatusDistributionBar } from '../components/dashboard/StatusDistributionBar';
import { ObjectiveListItem } from '../components/dashboard/ObjectiveListItem';
import { OrgObjectiveFormDialog } from '../components/OrgObjectiveFormDialog';

import { OkrEmptyState } from '../components/OkrEmptyState';
import { OkrAlertsCard } from '../components/OkrAlertsCard';
import { SharedOkrInsights } from '../components/SharedOkrInsights';

interface OkrFiltersState {
  year: number;
  teamId?: string;
  parentTeamId?: string;
  statuses: OkrCalculatedStatus[];
  sharedFilter?: 'all' | 'shared' | 'exclusive';
}

export default function OkrDashboardPage() {
  usePageTitle("OKRs");
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const { user } = useAuth();
  const { has, isWildcard } = usePermissions();
  const { currentBu, currentBuId } = useBu();
  
  // URL State - View (object API)
  const viewState = useUrlState<OkrView>({
    key: 'view',
    defaultValue: 'company',
    parse: (v) => v as OkrView,
  });
  const activeView = viewState.value;
  const setActiveView = viewState.set;
  
  // URL State - Filters (object API)
  const urlFiltersResult = useUrlStates({
    year: { key: 'year', defaultValue: currentYear, parse: parsers.number },
    teamId: { key: 'team_id', defaultValue: undefined as string | undefined, parse: parsers.stringOrUndefined },
    parentTeamId: { key: 'parent_team_id', defaultValue: undefined as string | undefined, parse: parsers.stringOrUndefined },
    statuses: { key: 'statuses', defaultValue: [] as OkrCalculatedStatus[], parse: (v) => v.split(',').filter(Boolean) as OkrCalculatedStatus[] },
    sharedFilter: { key: 'shared', defaultValue: 'all' as 'all' | 'shared' | 'exclusive', parse: (v) => v as 'all' | 'shared' | 'exclusive' },
  });
  
  // Convert URL filters to component state format
  const filters: OkrFiltersState = urlFiltersResult.values;
  const setFilters = (newFilters: OkrFiltersState) => urlFiltersResult.set(newFilters);

  // Normalize legacy/all value coming from TeamSelect ("all")
  // NOTE: if team_id=all, passing it to the query would filter everything out.
  const normalizedTeamId = filters.teamId && filters.teamId !== 'all' ? filters.teamId : undefined;

  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);

  // Queries
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: userProfile } = useUserProfile(user?.id);
  const { data: latestCheckinDate } = useLatestCheckinDate();
  const { data: pendingCheckins } = usePendingCheckins();

  // IMPORTANT: use currentBuId for BU-scoped queries (currentBu may be null if bu_unit data isn't loaded yet)
  const { data: orgObjectives, isLoading: orgLoading } = useOrgObjectives({ buId: currentBuId, year: filters.year });
  const { data: teamObjectives, isLoading: teamLoading } = useTeamObjectives({
    buId: currentBuId,
    teamId: activeView === 'team' ? normalizedTeamId : undefined,
  });
  const { data: allOrgKrs } = useOrgKeyResults({ buId: currentBuId });
  const { data: allTeamKrs, isLoading: krsLoading } = useTeamKeyResults(currentBuId, normalizedTeamId);

  // Shared OKRs insights
  const sharedInsights = useSharedOkrsInsights();
  
  // Permission checks for editing
  const { teams: manageableTeams } = useManageableTeams();
  const { canManage: canManageOrg } = useCanManageOrgOkr();
  const manageableTeamIds = useMemo(() => new Set(manageableTeams.map(t => t.id)), [manageableTeams]);
  
  // Calculate pending checkins count
  const pendingCheckinsCount = pendingCheckins?.filter(c => c.is_overdue).length || 0;
  
  // Calculate status distribution
  const krsForDistribution = activeView === 'company' 
    ? allOrgKrs 
    : allTeamKrs;
  
  const statusCounts = useKrStatusDistribution(krsForDistribution as any);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const krs = activeView === 'company' ? allOrgKrs : allTeamKrs;
    if (!krs || krs.length === 0) return 0;
    
    const totalProgress = krs.reduce((acc, kr) => {
      return acc + calculateProgress(
        Number(kr.baseline) || 0,
        Number(kr.current_value) || 0,
        Number(kr.target) || 0,
        kr.direction || 'up'
      );
    }, 0);
    
    return totalProgress / krs.length;
  }, [activeView, allOrgKrs, allTeamKrs]);

  // Determine what to display
  const isLoading = orgLoading || teamLoading || krsLoading || teamsLoading;
  const years = [currentYear, currentYear + 1];
  
  const displayObjectives = useMemo(() => {
    if (activeView === 'company') {
      return orgObjectives || [];
    }
    return teamObjectives || [];
  }, [activeView, orgObjectives, teamObjectives]);

  // Risk count for alert
  const atRiskCount = statusCounts.off_track + statusCounts.at_risk;

  // Can create based on permission keys (centralized)
  const canCreateOrg = isWildcard || has('okrs.org_objective.create:bu');
  const canCreateTeam = isWildcard || has('okrs.team_objective.create:team');

  const handleCreateClick = () => {
    if (activeView === 'company' && canCreateOrg) {
      setShowCreateOrgDialog(true);
    } else if ((activeView === 'team' || activeView === 'my') && canCreateTeam) {
      // Navigate to fullpage wizard for team OKR creation
      const teamParam = normalizedTeamId ? `?team=${normalizedTeamId}` : '';
      navigate(`/okrs/create${teamParam}`);
    }
  };

  return (
    <HubLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Crosshair className="h-6 w-6" />
              OKRs
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe o progresso e alinhamento dos objetivos
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/okrs/org-view">
                <Building2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Visão Org.</span>
              </Link>
            </Button>
            
            <OkrViewSelector 
              activeView={activeView} 
              onViewChange={setActiveView}
              showMyOkrs={!isWildcard}
            />
            
            {((activeView === 'company' && canCreateOrg) || 
              (activeView !== 'company' && canCreateTeam)) && (
              <Button onClick={handleCreateClick}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Objetivo
              </Button>
            )}
          </div>
        </div>
        
        {/* Filters */}
        <OkrDashboardFilters
          filters={filters}
          onFiltersChange={setFilters}
          teams={teams || []}
          years={years}
        />

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <OverallProgressCard
            progress={overallProgress}
            trend={overallProgress >= 50 ? 'up' : overallProgress >= 30 ? 'stable' : 'down'}
            lastUpdateDate={latestCheckinDate}
            isLoading={isLoading}
          />
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Objetivos</span>
                <Target className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <>
                  <div className="text-3xl font-bold">{displayObjectives.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeView === 'company' ? (currentBu?.name || 'da empresa') : 'do time'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Key Results</span>
                <TrendingUp className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <>
                  <div className="text-3xl font-bold">{statusCounts.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    em acompanhamento
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card className={atRiskCount > 0 ? 'border-destructive/50 bg-destructive/5' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Atenção</span>
                <AlertTriangle className={`w-4 h-4 ${atRiskCount > 0 ? 'text-destructive' : ''}`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <>
                  <div className={`text-3xl font-bold ${atRiskCount > 0 ? 'text-destructive' : ''}`}>
                    {atRiskCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {statusCounts.off_track} fora, {statusCounts.at_risk} em risco
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>


        {/* Shared OKRs Insights */}
        {sharedInsights.sharedOkrsCount > 0 && (
          <SharedOkrInsights
            sharedOkrsCount={sharedInsights.sharedOkrsCount}
            totalOkrsCount={displayObjectives.length}
            overdueSharedOkrsCount={sharedInsights.overdueSharedOkrsCount}
            teamsWithMostDependencies={sharedInsights.teamsWithMostDependencies}
          />
        )}

        {/* Alerts and Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {/* Status Distribution */}
            <Card>
              <CardContent className="pt-6">
                <StatusDistributionBar 
                  counts={statusCounts}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Quick Check-in Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Check-ins Pendentes</span>
                <RefreshCw className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingCheckinsCount > 0 ? (
                <>
                  <div className="text-3xl font-bold text-amber-600">{pendingCheckinsCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    KRs precisam de atualização
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-emerald-600">✓</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Todos os check-ins em dia
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Objectives List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Objetivos {activeView === 'company' ? (currentBu?.name || 'da Empresa') : activeView === 'team' ? 'do Time' : 'Pessoais'}
          </h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <ObjectiveListItem 
                  key={i} 
                  objective={{ id: '', title: '', year: currentYear, status: 'draft' }} 
                  isLoading
                  type={activeView === 'company' ? 'org' : 'team'}
                />
              ))}
            </div>
          ) : displayObjectives.length === 0 ? (
            <OkrEmptyState
              title={`Nenhum objetivo ${activeView === 'company' ? `da ${currentBu?.name || 'empresa'}` : 'do time'}`}
              description={
                activeView === 'company'
                  ? "Comece definindo objetivos estratégicos para o ano."
                  : "Os times ainda não criaram objetivos."
              }
              actionLabel={
                activeView === 'company' && canCreateOrg
                  ? "Criar Objetivo"
                  : activeView !== 'company' && canCreateTeam
                  ? "Criar Objetivo do Time"
                  : undefined
              }
              onAction={
                activeView === 'company' && canCreateOrg
                  ? () => setShowCreateOrgDialog(true)
                  : activeView !== 'company' && canCreateTeam
                  ? () => navigate(`/okrs/create${normalizedTeamId ? `?team=${normalizedTeamId}` : ''}`)
                  : undefined
              }
            />
          ) : (
            <div className="space-y-6">
              {displayObjectives.map((objective: any) => (
                <ObjectiveListItem
                  key={objective.id}
                  objective={objective}
                  keyResults={objective.key_results || []}
                  type={activeView === 'company' ? 'org' : 'team'}
                  teamName={objective.team?.name}
                  canEdit={activeView === 'company' ? canManageOrg : manageableTeamIds.has(objective.team_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <OrgObjectiveFormDialog
        open={showCreateOrgDialog}
        onOpenChange={setShowCreateOrgDialog}
        year={filters.year}
      />
    </HubLayout>
  );
}
