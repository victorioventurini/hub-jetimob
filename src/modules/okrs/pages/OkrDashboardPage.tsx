import { useState, useMemo } from 'react';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, AlertTriangle, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
import { calculateProgress } from '../types';

import { OkrViewSelector, OkrView } from '../components/dashboard/OkrViewSelector';
import { OkrDashboardFilters } from '../components/dashboard/OkrDashboardFilters';
import { OverallProgressCard } from '../components/dashboard/OverallProgressCard';
import { StatusDistributionBar } from '../components/dashboard/StatusDistributionBar';
import { ObjectiveListItem } from '../components/dashboard/ObjectiveListItem';
import { CreateOrgObjectiveDialog } from '../components/CreateOrgObjectiveDialog';
import { CreateTeamObjectiveDialog } from '../components/CreateTeamObjectiveDialog';
import { OkrEmptyState } from '../components/OkrEmptyState';
import { KpiSidePanel } from '@/modules/kpis/components/KpiSidePanel';

interface OkrFiltersState {
  year: number;
  teamId?: string;
  parentTeamId?: string;
  statuses: OkrCalculatedStatus[];
}

export default function OkrDashboardPage() {
  const currentYear = new Date().getFullYear();
  const { user, role } = useAuth();
  
  // State
  const [activeView, setActiveView] = useState<OkrView>('company');
  const [filters, setFilters] = useState<OkrFiltersState>({
    year: currentYear,
    teamId: undefined,
    parentTeamId: undefined,
    statuses: [],
  });
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);

  // Queries
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: userProfile } = useUserProfile(user?.id);
  const { data: latestCheckinDate } = useLatestCheckinDate();
  
  const { data: orgObjectives, isLoading: orgLoading } = useOrgObjectivesWithKrs(filters.year);
  const { data: teamObjectives, isLoading: teamLoading } = useTeamObjectivesWithKrs(
    activeView === 'team' ? filters.teamId : undefined
  );
  const { data: allOrgKrs } = useAllOrgKeyResults();
  const { data: allTeamKrs, isLoading: krsLoading } = useTeamKeyResults(filters.teamId);
  
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
  const canCreateOrg = role === 'ceo' || role === 'admin';
  const canCreateTeam = role === 'ceo' || role === 'admin' || role === 'team_leader';

  const handleCreateClick = () => {
    if (activeView === 'company' && canCreateOrg) {
      setShowCreateOrgDialog(true);
    } else if ((activeView === 'team' || activeView === 'my') && canCreateTeam) {
      setShowCreateTeamDialog(true);
    }
  };

  return (
    <HubLayout>
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">OKRs Dashboard</h1>
                <p className="text-muted-foreground">
                  Track progress and align on objectives
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <OkrViewSelector 
                  activeView={activeView} 
                  onViewChange={setActiveView}
                  showMyOkrs={role !== 'ceo' && role !== 'admin'}
                />
                
                {((activeView === 'company' && canCreateOrg) || 
                  (activeView !== 'company' && canCreateTeam)) && (
                  <Button onClick={handleCreateClick} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    New
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
          </div>

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
                  <span>Objectives</span>
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
                      {activeView === 'company' ? 'organizational' : 'team'} objectives
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
                      being tracked
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card className={atRiskCount > 0 ? 'border-destructive/50 bg-destructive/5' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  <span>Needs Attention</span>
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
                      {statusCounts.off_track} off track, {statusCounts.at_risk} at risk
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution */}
          <Card>
            <CardContent className="pt-6">
              <StatusDistributionBar 
                counts={statusCounts}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {/* Objectives List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {activeView === 'company' ? 'Organizational' : activeView === 'team' ? 'Team' : 'My'} Objectives
            </h2>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <ObjectiveListItem 
                    key={i} 
                    objective={{ id: '', title: '', year: currentYear, status: 'draft' }} 
                    isLoading 
                  />
                ))}
              </div>
            ) : displayObjectives.length === 0 ? (
              <OkrEmptyState
                title={`No ${activeView === 'company' ? 'organizational' : 'team'} objectives`}
                description={
                  activeView === 'company'
                    ? "Start by defining strategic objectives for the year."
                    : "Teams haven't created objectives yet."
                }
                actionLabel={
                  activeView === 'company' && canCreateOrg
                    ? "Create Objective"
                    : activeView !== 'company' && canCreateTeam
                    ? "Create Team Objective"
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
                {displayObjectives.map((objective) => (
                  <ObjectiveListItem
                    key={objective.id}
                    objective={objective}
                    keyResults={objective.key_results || []}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KPI Side Panel - Context */}
        <aside className="hidden xl:block w-80 shrink-0">
          <div className="sticky top-6">
            <KpiSidePanel />
          </div>
        </aside>
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
