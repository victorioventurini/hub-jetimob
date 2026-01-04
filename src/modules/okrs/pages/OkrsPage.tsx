import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, Users, AlertTriangle, TrendingUp, Target } from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OkrObjectiveCard } from '../components/OkrObjectiveCard';
import { mockOrgObjectives, mockTeamObjectives, getMockStats } from '../hooks/useMockOkrData';

export default function OkrsPage() {
  usePageTitle("OKRs");
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('org');

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">OKRs</h1>
            <p className="text-muted-foreground">
              Objetivos e Resultados-Chave
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo
            </Button>
          </div>
        </div>

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
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos os times" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os times</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
