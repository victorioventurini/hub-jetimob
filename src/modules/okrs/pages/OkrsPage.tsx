import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, Users, Target, AlertTriangle } from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';
import { OkrCard } from '../components/OkrCard';
import { OkrEmptyState } from '../components/OkrEmptyState';
import { useOrgObjectives, useTeamObjectives, useTeams } from '../hooks/useOkrData';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OkrsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  const { data: orgObjectives, isLoading: loadingOrg } = useOrgObjectives(selectedYear);
  const { data: teamObjectives, isLoading: loadingTeam } = useTeamObjectives(
    selectedTeam !== 'all' ? selectedTeam : undefined
  );
  const { data: teams } = useTeams();

  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Calculate summary stats
  const totalOrgObjectives = orgObjectives?.length || 0;
  const totalTeamObjectives = teamObjectives?.length || 0;
  const atRiskKrs = teamObjectives?.reduce((acc, obj) => {
    return acc + (obj.key_results?.filter(kr => kr.status === 'red').length || 0);
  }, 0) || 0;

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
            <Button>
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
        <Tabs defaultValue="org" className="space-y-4">
          <div className="flex items-center justify-between">
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

            {/* Team filter - only visible on team tab */}
            <div className="hidden data-[state=team]:flex" data-state="team">
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
          </div>

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
                  <OkrCard
                    key={objective.id}
                    objective={objective}
                    type="org"
                    onClick={() => {
                      // TODO: Navigate to objective detail
                      console.log('Navigate to', objective.id);
                    }}
                  />
                ))}
              </div>
            ) : (
              <OkrEmptyState
                title="Nenhum objetivo organizacional"
                description="Comece definindo os objetivos estratégicos da Jetimob para o ano."
                actionLabel="Criar Objetivo Organizacional"
                onAction={() => console.log('Create org objective')}
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
                  <OkrCard
                    key={objective.id}
                    objective={objective}
                    type="team"
                    onClick={() => {
                      // TODO: Navigate to objective detail
                      console.log('Navigate to', objective.id);
                    }}
                  />
                ))}
              </div>
            ) : (
              <OkrEmptyState
                title="Nenhum objetivo de time"
                description="Os times ainda não criaram objetivos vinculados aos OKRs organizacionais."
                actionLabel="Criar Objetivo de Time"
                onAction={() => console.log('Create team objective')}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </HubLayout>
  );
}
