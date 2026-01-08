import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Users, AlertTriangle, TrendingUp, Target } from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';
import { PageHeader } from '@/components/ui/page-header';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OkrObjectiveCard } from '../components/OkrObjectiveCard';
import { mockOrgObjectives, mockTeamObjectives, getMockStats } from '../hooks/useMockOkrData';
import { YearSelect, TeamSelect } from '@/components/selects';
import { FlatTeamItem } from '@/modules/teams/hooks/useTeams';
import { useUrlState, parsers } from "@/hooks/useUrlState";

export default function OkrsPage() {
  usePageTitle("OKRs");
  const currentYear = new Date().getFullYear();
  
  // URL State
  const [selectedYear, setSelectedYear] = useUrlState<number>({ key: 'year', defaultValue: currentYear, parse: parsers.number });
  const [selectedTeam, setSelectedTeam] = useUrlState<string>({ key: 'team_id', defaultValue: 'all' });
  const [activeTab, setActiveTab] = useUrlState<string>({ key: 'tab', defaultValue: 'org' });

  const years = [currentYear, currentYear + 1];
  const stats = useMemo(() => getMockStats(), []);

  // Get unique teams from mock data
  const teams = useMemo(() => {
    const uniqueTeams = new Map<string, string>();
    mockTeamObjectives.forEach(obj => {
      uniqueTeams.set(obj.team_id, obj.team_name);
    });
    return Array.from(uniqueTeams, ([id, name]) => ({ id, name }));
  }, []);

  // Filter team objectives by selected team
  const filteredTeamObjectives = useMemo(() => {
    if (selectedTeam === 'all') return mockTeamObjectives;
    return mockTeamObjectives.filter(obj => obj.team_id === selectedTeam);
  }, [selectedTeam]);

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
              <div className="text-2xl font-bold">{stats.totalOrgObjectives}</div>
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
              <div className="text-2xl font-bold">{stats.totalTeamObjectives}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                On Track
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.greenKrs}</div>
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
              <div className="text-2xl font-bold text-red-600">{stats.atRiskKrs}</div>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mockOrgObjectives.map((objective) => (
                <OkrObjectiveCard
                  key={objective.id}
                  id={objective.id}
                  title={objective.title}
                  description={objective.description}
                  status={objective.status}
                  type="org"
                  keyResults={objective.key_results}
                />
              ))}
            </div>
          </TabsContent>

          {/* Team Objectives */}
          <TabsContent value="team" className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <TeamSelect
                value={selectedTeam === "all" ? undefined : selectedTeam}
                onValueChange={(v) => setSelectedTeam(v ?? "all")}
                teams={teams.map(t => ({ id: t.id, name: t.name, level: 0, parentId: null }))}
                includeAll
                allLabel="Todos os times"
                triggerClassName="w-[180px]"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTeamObjectives.map((objective) => (
                <OkrObjectiveCard
                  key={objective.id}
                  id={objective.id}
                  title={objective.title}
                  description={objective.description}
                  status={objective.status}
                  type="team"
                  teamName={objective.team_name}
                  keyResults={objective.key_results}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </HubLayout>
  );
}
