import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, AlertTriangle, Target, TrendingUp, Crosshair, RefreshCw, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useBu } from '@/contexts/BuContext';
import { useUrlState, useUrlStates, parsers, serializers } from '@/hooks/useUrlState';
import { 
  useOrgObjectivesWithKrs, 
  useTeamObjectivesWithKrs, 
  useTeamKeyResults,
  useTeams, 
  useAllOrgKeyResults,
  useLatestCheckinDate,
  useUserProfile,
} from '../hooks/useOkrData';
import { useKrStatusDistribution, OkrCalculatedStatus } from '../hooks/useOkrStatus';
import { usePendingCheckins } from '../hooks/usePendingCheckins';
import { useSharedOkrsInsights } from '../hooks/useTeamContributedOkrs';
import { calculateProgress } from '../types';

import { OkrViewSelector, OkrView } from '../components/dashboard/OkrViewSelector';
import { OkrDashboardFilters } from '../components/dashboard/OkrDashboardFilters';
import { OverallProgressCard } from '../components/dashboard/OverallProgressCard';
import { StatusDistributionBar } from '../components/dashboard/StatusDistributionBar';
import { ObjectiveListItem } from '../components/dashboard/ObjectiveListItem';
import { CreateOrgObjectiveDialog } from '../components/CreateOrgObjectiveDialog';
import { CreateTeamObjectiveDialog } from '../components/CreateTeamObjectiveDialog';
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
  const currentYear = new Date().getFullYear();
  const { user, role } = useAuth();
  const { currentBu } = useBu();
  
  // URL State - View
  const [activeView, setActiveView] = useUrlState<OkrView>({
    key: 'view',
    defaultValue: 'company',
    parse: (v) => v as OkrView,
  });
  
  // URL State - Filters
  const [urlFilters, setUrlFilters] = useUrlStates({
    year: { key: 'year', defaultValue: currentYear, parse: parsers.number },
    teamId: { key: 'team_id', defaultValue: undefined as string | undefined, parse: parsers.stringOrUndefined },
    parentTeamId: { key: 'parent_team_id', defaultValue: undefined as string | undefined, parse: parsers.stringOrUndefined },
    statuses: { key: 'statuses', defaultValue: [] as OkrCalculatedStatus[], parse: (v) => v.split(',').filter(Boolean) as OkrCalculatedStatus[] },
    sharedFilter: { key: 'shared', defaultValue: 'all' as 'all' | 'shared' | 'exclusive', parse: (v) => v as 'all' | 'shared' | 'exclusive' },
  });
  
  // Convert URL filters to component state format
  const filters: OkrFiltersState = urlFilters;
  const setFilters = (newFilters: OkrFiltersState) => setUrlFilters(newFilters);
  
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);

  // Queries
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: userProfile } = useUserProfile(user?.id);
  const { data: latestCheckinDate } = useLatestCheckinDate();
  const { data: pendingCheckins } = usePendingCheckins();
  
  const { data: orgObjectives, isLoading: orgLoading } = useOrgObjectivesWithKrs(currentBu?.id, filters.year);
  const { data: teamObjectives, isLoading: teamLoading } = useTeamObjectivesWithKrs(
    currentBu?.id,
    activeView === 'team' ? filters.teamId : undefined
  );
  const { data: allOrgKrs } = useAllOrgKeyResults(currentBu?.id);
  const { data: allTeamKrs, isLoading: krsLoading } = useTeamKeyResults(currentBu?.id, filters.teamId);
  
  // Shared OKRs insights
  const sharedInsights = useSharedOkrsInsights();
  
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

  // Can create based on role
  const canCreateOrg = role === 'super_admin' || role === 'admin';
  const canCreateTeam = role === 'super_admin' || role === 'admin' || role === 'team_leader';

  const handleCreateClick = () => {
    if (activeView === 'company' && canCreateOrg) {
      setShowCreateOrgDialog(true);
    } else if ((activeView === 'team' || activeView === 'my') && canCreateTeam) {
      setShowCreateTeamDialog(true);
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
              showMyOkrs={role !== 'super_admin' && role !== 'admin'}
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
                  ? () => setShowCreateTeamDialog(true)
                  : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {displayObjectives.map((objective: any) => (
                <ObjectiveListItem
                  key={objective.id}
                  objective={objective}
                  keyResults={objective.key_results || []}
                  type={activeView === 'company' ? 'org' : 'team'}
                  teamName={objective.team?.name}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateOrgObjectiveDialog
        open={showCreateOrgDialog}
        onOpenChange={setShowCreateOrgDialog}
        year={filters.year}
      />
      <CreateTeamObjectiveDialog
        open={showCreateTeamDialog}
        onOpenChange={setShowCreateTeamDialog}
        teams={teams || []}
        orgObjectives={orgObjectives || []}
      />
    </HubLayout>
  );
}
