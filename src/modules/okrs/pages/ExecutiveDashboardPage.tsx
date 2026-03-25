import { useState } from 'react';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, TrendingUp, Target, Users, Building2, ChevronRight, AlertCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useBu } from '@/contexts/BuContext';
import { useOrgObjectives, useTeamObjectives, useTeamKeyResults, useTeams, useOrgKeyResults } from '../hooks';
import { calculateProgress, getRagStatusColor } from '../types';
import { RiskKrsList } from '../components/RiskKrsList';
import { AlignmentMap } from '../components/AlignmentMap';
import { ProgressSummary } from '../components/ProgressSummary';
import { YearSelect } from '@/components/selects';
import { CLevelCheckinWizardCard } from '../components/wizards/clevel-checkin/CLevelCheckinWizardCard';
import { MbrWizardCard } from '../components/wizards/mbr/MbrWizardCard';
import { QbrWizardCard } from '../components/wizards/qbr/QbrWizardCard';
import { useLastCompletedSession } from '../hooks/useLastCompletedSession';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExecutiveDashboardPage() {
  usePageTitle("Dashboard Executivo - OKRs");
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { currentBu } = useBu();

  const { data: orgObjectives, isLoading: loadingOrg } = useOrgObjectives(currentBu?.id, selectedYear);
  const { data: teamObjectives, isLoading: loadingTeam } = useTeamObjectives(currentBu?.id);
  const { data: teamKeyResults, isLoading: loadingKrs } = useTeamKeyResults(currentBu?.id);
  const { data: teams } = useTeams();

  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Calculate metrics
  const totalOrgObjectives = orgObjectives?.length || 0;
  const totalTeamObjectives = teamObjectives?.length || 0;
  const totalKrs = teamKeyResults?.length || 0;
  
  const redKrs = teamKeyResults?.filter(kr => kr.status === 'red') || [];
  const yellowKrs = teamKeyResults?.filter(kr => kr.status === 'yellow') || [];
  const greenKrs = teamKeyResults?.filter(kr => kr.status === 'green') || [];
  
  // Calculate overall progress
  const avgProgress = teamKeyResults && teamKeyResults.length > 0
    ? teamKeyResults.reduce((acc, kr) => {
        const progress = calculateProgress(
          Number(kr.baseline) || 0,
          Number(kr.current_value) || 0,
          Number(kr.target) || 0,
          kr.direction || 'up'
        );
        return acc + progress;
      }, 0) / teamKeyResults.length
    : 0;

  const { lastCompletedAt: lastMbrDate, isLoading: loadingMbr } = useLastCompletedSession('mbr');
  const isLoading = loadingOrg || loadingTeam || loadingKrs;

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Executivo"
          description="Visão executiva dos OKRs organizacionais"
          breadcrumbs={[
            { label: "OKRs", href: "/okrs" },
            { label: "Dashboard Executivo" },
          ]}
          actions={
            <YearSelect
              value={selectedYear}
              onValueChange={setSelectedYear}
              years={years}
              triggerClassName="w-[120px]"
            />
          }
        />

        {/* Strategic Wizard Entry Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CLevelCheckinWizardCard
            companyOkrCount={totalOrgObjectives}
            overallProgress={avgProgress}
            atRiskCount={redKrs.length}
            isLoading={isLoading}
          />
          <MbrWizardCard
            lastMbrDate={lastMbrDate}
            isLoading={loadingMbr}
          />
        </div>

        {/* Ritual History Quick Access */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link to="/okrs/ritual-history" className="gap-2">
              <History className="h-4 w-4" />
              Histórico de Rituais
            </Link>
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Progresso Geral
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{avgProgress.toFixed(0)}%</div>
                  <Progress value={avgProgress} className="mt-2 h-2" />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Objetivos Org.
              </CardTitle>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{totalOrgObjectives}</div>
                  <p className="text-xs text-muted-foreground">para {selectedYear}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Objetivos de Times
              </CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{totalTeamObjectives}</div>
                  <p className="text-xs text-muted-foreground">ativos</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className={redKrs.length > 0 ? 'border-destructive/50 bg-destructive/5' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                KRs em Risco
              </CardTitle>
              <AlertTriangle className={`w-4 h-4 ${redKrs.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${redKrs.length > 0 ? 'text-destructive' : ''}`}>
                    {redKrs.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {yellowKrs.length} em atenção
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Risks */}
          <div className="lg:col-span-1 space-y-6">
            <RiskKrsList 
              redKrs={redKrs} 
              yellowKrs={yellowKrs} 
              teams={teams || []} 
              isLoading={isLoading} 
            />
          </div>

          {/* Right Column - Alignment Map & Progress */}
          <div className="lg:col-span-2 space-y-6">
            <AlignmentMap 
              orgObjectives={orgObjectives || []}
              teamObjectives={teamObjectives || []}
              teams={teams || []}
              isLoading={isLoading}
            />
            
            <ProgressSummary
              orgObjectives={orgObjectives || []}
              teamKeyResults={teamKeyResults || []}
              greenCount={greenKrs.length}
              yellowCount={yellowKrs.length}
              redCount={redKrs.length}
              notStartedCount={teamKeyResults?.filter(kr => kr.status === 'not_started').length || 0}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </HubLayout>
  );
}
