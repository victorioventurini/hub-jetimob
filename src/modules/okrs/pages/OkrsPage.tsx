import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Users, AlertTriangle, TrendingUp, Target, Loader2 } from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';
import { PageHeader } from '@/components/ui/page-header';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OkrObjectiveCard } from '../components/OkrObjectiveCard';
import { YearSelect, TeamSelect } from '@/components/selects';
import { useUrlState, useUrlTab, parsers } from "@/shared/url";
import { useOrgObjectives, useTeamObjectives } from '../hooks/queries';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { EmptyState } from '@/components/ui/empty-state';

export default function OkrsPage() {
  usePageTitle("OKRs");
  const { buId } = useOptionalBuClient();
  const currentYear = new Date().getFullYear();
  
  // URL State
  const yearState = useUrlState<number>({ key: 'year', defaultValue: currentYear, parse: parsers.number });
  const selectedYear = yearState.value;
  const setSelectedYear = yearState.set;
  
  const teamState = useUrlState<string>({ key: 'team_id', defaultValue: 'all' });
  const selectedTeam = teamState.value;
  const setSelectedTeam = teamState.set;
  
  const [activeTab, setActiveTab] = useUrlTab<string>('org');

  const years = [currentYear, currentYear + 1];

  // Fetch real data from hooks
  const { 
    data: orgObjectives = [], 
    isLoading: isLoadingOrg 
  } = useOrgObjectives({ buId, year: selectedYear });

  const { 
    data: teamObjectives = [], 
    isLoading: isLoadingTeam 
  } = useTeamObjectives({ 
    buId, 
    teamId: selectedTeam === 'all' ? undefined : selectedTeam 
  });

  // Calculate stats from real data
  const stats = useMemo(() => {
    return {
      totalOrgObjectives: orgObjectives.length,
      totalTeamObjectives: teamObjectives.length,
      // Note: KR stats would require fetching KRs - simplified for now
      atRiskKrs: 0,
      greenKrs: 0,
    };
  }, [orgObjectives, teamObjectives]);

  // Get unique teams from team objectives
  const teams = useMemo(() => {
    const uniqueTeams = new Map<string, string>();
    teamObjectives.forEach(obj => {
      if (obj.team_id) {
        // We don't have team_name in the data, would need to join
        uniqueTeams.set(obj.team_id, obj.team_id);
      }
    });
    return Array.from(uniqueTeams, ([id]) => ({ id, name: id }));
  }, [teamObjectives]);

  const isLoading = isLoadingOrg || isLoadingTeam;

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="OKRs"
          description="Objetivos e Resultados-Chave"
          actions={
            <div className="flex items-center gap-3">
              <YearSelect
                value={selectedYear}
                onValueChange={setSelectedYear}
                years={years}
                triggerClassName="w-[100px]"
              />
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </div>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Organizacionais
              </CardTitle>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalOrgObjectives}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Times
              </CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalTeamObjectives}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                No Caminho
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.greenKrs}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Risco
              </CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.atRiskKrs}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="org" className="gap-2">
              <Building2 className="w-4 h-4" />
              Organizacionais
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="w-4 h-4" />
              Times
            </TabsTrigger>
          </TabsList>

          {/* Org Objectives */}
          <TabsContent value="org" className="space-y-4">
            {isLoadingOrg ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : orgObjectives.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    icon={Target}
                    title="Nenhum objetivo organizacional"
                    description="Crie seu primeiro objetivo organizacional para começar."
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {orgObjectives.map((objective) => (
                  <OkrObjectiveCard
                    key={objective.id}
                    id={objective.id}
                    title={objective.title}
                    description={objective.description || undefined}
                    status={objective.status}
                    type="org"
                    keyResults={[]} // Would need separate query for KRs
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Team Objectives */}
          <TabsContent value="team" className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <TeamSelect
                value={selectedTeam === "all" ? undefined : selectedTeam}
                onValueChange={(v) => setSelectedTeam(v ?? "all")}
                includeAll
                allLabel="Todos os times"
                triggerClassName="w-[180px]"
              />
            </div>

            {isLoadingTeam ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : teamObjectives.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    icon={Target}
                    title="Nenhum objetivo de time"
                    description="Crie seu primeiro objetivo de time para começar."
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {teamObjectives.map((objective) => (
                  <OkrObjectiveCard
                    key={objective.id}
                    id={objective.id}
                    title={objective.title}
                    description={objective.description || undefined}
                    status={objective.status}
                    type="team"
                    keyResults={[]} // Would need separate query for KRs
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </HubLayout>
  );
}
