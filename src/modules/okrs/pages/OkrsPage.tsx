import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, Users, AlertTriangle } from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';
import { OkrEmptyState } from '../components/OkrEmptyState';
import { useOrgObjectives, useTeamObjectives, useTeamKeyResults, useTeams } from '../hooks/useOkrData';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrgObjectiveCard } from '../components/OrgObjectiveCard';
import { TeamObjectiveCard } from '../components/TeamObjectiveCard';
import { CreateOrgObjectiveDialog } from '../components/CreateOrgObjectiveDialog';
import { CreateTeamObjectiveDialog } from '../components/CreateTeamObjectiveDialog';

export default function OkrsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('org');

  const { data: orgObjectives, isLoading: loadingOrg } = useOrgObjectives(selectedYear);
  const { data: teamObjectives, isLoading: loadingTeam } = useTeamObjectives(
    selectedTeam !== 'all' ? selectedTeam : undefined
  );
  const { data: teamKeyResults } = useTeamKeyResults();
  const { data: teams } = useTeams();

  const years = [currentYear, currentYear + 1];

  // Calculate summary stats
  const totalOrgObjectives = orgObjectives?.length || 0;
  const totalTeamObjectives = teamObjectives?.length || 0;
  const atRiskKrs = teamKeyResults?.filter(kr => kr.status === 'red').length || 0;

  const handleCreateClick = () => {
    if (activeTab === 'org') {
      setShowCreateOrgDialog(true);
    } else {
      setShowCreateTeamDialog(true);
    }
  };

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">OKRs</h1>
            <p className="text-muted-foreground">
              Objetivos e Resultados-Chave da Jetimob
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[120px]">
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
            <Button onClick={handleCreateClick}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Objetivo
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Objetivos Organizacionais
              </CardTitle>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrgObjectives}</div>
              <p className="text-xs text-muted-foreground">para {selectedYear}</p>
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
              <div className="text-2xl font-bold">{totalTeamObjectives}</div>
              <p className="text-xs text-muted-foreground">ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                KRs em Risco
              </CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{atRiskKrs}</div>
              <p className="text-xs text-muted-foreground">precisam de atenção</p>
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
            {loadingOrg ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-2 w-full mb-4" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : orgObjectives && orgObjectives.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orgObjectives.map((objective) => (
                  <OrgObjectiveCard
                    key={objective.id}
                    objective={objective}
                  />
                ))}
              </div>
            ) : (
              <OkrEmptyState
                title="Nenhum objetivo organizacional"
                description="Comece definindo os objetivos estratégicos da Jetimob para o ano."
                actionLabel="Criar Objetivo Organizacional"
                onAction={() => setShowCreateOrgDialog(true)}
              />
            )}
          </TabsContent>

          {/* Team Objectives */}
          <TabsContent value="team" className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os times" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os times</SelectItem>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingTeam ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-2 w-full mb-4" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : teamObjectives && teamObjectives.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamObjectives.map((objective) => (
                  <TeamObjectiveCard
                    key={objective.id}
                    objective={objective}
                    teams={teams || []}
                  />
                ))}
              </div>
            ) : (
              <OkrEmptyState
                title="Nenhum objetivo de time"
                description="Os times ainda não criaram objetivos vinculados aos OKRs organizacionais."
                actionLabel="Criar Objetivo de Time"
                onAction={() => setShowCreateTeamDialog(true)}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateOrgObjectiveDialog
        open={showCreateOrgDialog}
        onOpenChange={setShowCreateOrgDialog}
        year={selectedYear}
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
