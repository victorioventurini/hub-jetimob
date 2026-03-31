import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNowStrict, isAfter, isBefore, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  FolderKanban,
} from 'lucide-react';

import { HubLayout } from '@/components/layout/HubLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { usePageTitle } from '@/hooks/usePageTitle';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useUrlState } from '@/shared/url';

import { useKpiData } from '@/modules/kpis/hooks/useKpiData';
import { useProjects, useProjectsForKr, useProjectsForWizard } from '@/modules/projects/hooks';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';
import { ProjectProgressBar } from '@/modules/projects/components/ProjectProgressBar';
import { useTeams, useKrInitiatives, calculateKrState } from '@/modules/okrs/hooks';
import { OkrProgressBar } from '@/modules/okrs/components/OkrProgressBar';
import { LastCheckinBadge } from '@/modules/okrs/components/wizards/shared/LastCheckinBadge';
import { KrStateInline } from '@/modules/okrs/components/insights';
import { calculateProgress } from '@/modules/okrs/types';

type QuarterCycle = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'closed';
  qbr_status: string | null;
};

type TeamObjectiveRow = {
  id: string;
  title: string;
  team_id: string;
  team: {
    id: string;
    name: string;
    area_id: string | null;
    area: { id: string; name: string; color: string | null } | null;
  } | null;
  key_results: Array<{
    id: string;
    title: string;
    baseline: number | null;
    current_value: number | null;
    target: number | null;
    direction: 'up' | 'down' | null;
    unit: string | null;
    status: 'green' | 'yellow' | 'red' | 'not_started' | null;
    last_checkin_at: string | null;
  }>;
};

type RitualSessionRow = {
  id: string;
  team_id: string | null;
  wizard_type: string;
  completed_at: string | null;
  decisions: Array<{ id?: string; text?: string; title?: string }> | null;
  reflection_data: Record<string, any> | null;
  addendums: Array<{ text?: string; created_at?: string; created_by?: string }> | null;
};

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {subtitle ? <p className="text-xs text-muted-foreground mt-1">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}

function trendArrow(variation: number | null) {
  const v = variation ?? 0;
  if (v >= 10) return <ArrowUp className="h-3.5 w-3.5" />;
  if (v > 1) return <TrendingUp className="h-3.5 w-3.5" />;
  if (v <= -10) return <ArrowDown className="h-3.5 w-3.5" />;
  if (v < -1) return <TrendingDown className="h-3.5 w-3.5" />;
  return <ArrowRight className="h-3.5 w-3.5" />;
}

function statusToKpiBadge(rag: string | null) {
  if (rag === 'green') return { label: 'Verde', cls: 'bg-status-green-muted text-status-green' };
  if (rag === 'yellow') return { label: 'Amarelo', cls: 'bg-status-yellow-muted text-status-yellow' };
  if (rag === 'red') return { label: 'Vermelho', cls: 'bg-status-red-muted text-status-red' };
  return { label: 'Sem dados', cls: 'bg-muted text-muted-foreground' };
}

function getFallback(text: string) {
  return text
    .split(' ')
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
}

function extractLearnings(reflectionData: Record<string, any> | null) {
  const data = reflectionData?.data ?? reflectionData ?? {};
  const keep = data.keep ?? data.learnings?.keep ?? data.whatWorked ?? [];
  const stop = data.stop ?? data.learnings?.stop ?? data.stopDoing ?? [];
  const debts = data.debitos ?? data.debts ?? data.learnings?.debts ?? [];
  const zombieKpis = data.zombieKpis ?? data.kpisZombie ?? [];
  const nextStepItems = data.nextSteps ?? data.itensDecisao ?? [];

  const toArray = (value: any): string[] => {
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
  };

  return {
    keep: toArray(keep),
    stop: toArray(stop),
    debts: toArray(debts),
    zombieKpis: toArray(zombieKpis),
    nextStepItems: toArray(nextStepItems),
  };
}

function TeamKrLinkedDetails({ krId }: { krId: string }) {
  const { data: initiatives } = useKrInitiatives(krId);
  const { data: projects } = useProjectsForKr(krId);

  if ((!initiatives || initiatives.length === 0) && (!projects || projects.length === 0)) return null;

  return (
    <div className="mt-2 rounded-md border bg-muted/30 p-3 space-y-2">
      {initiatives && initiatives.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Iniciativas vinculadas</p>
          <div className="flex flex-wrap gap-1.5">
            {initiatives.slice(0, 4).map((initiative) => (
              <Badge key={initiative.id} variant="outline" className="text-xs">
                {initiative.name}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {projects && projects.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Projetos vinculados</p>
          <div className="space-y-1.5">
            {projects.slice(0, 4).map((project) => (
              <div key={project.id} className="flex items-center justify-between gap-2">
                <span className="text-xs truncate">{project.name}</span>
                <ProjectHealthBadge health={project.health} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TeamUnlinkedProjects({ teamId, krIds }: { teamId: string; krIds: string[] }) {
  const supabase = useBuScopedSupabase();
  const { data: projects } = useProjectsForWizard(teamId);

  const { data: linkedProjectIds } = useQuery({
    queryKey: ['quarter-review', 'linked-project-ids', teamId, krIds],
    queryFn: async () => {
      if (!krIds.length) return [] as string[];
      const { data, error } = await supabase
        .from('project_krs')
        .select('project_id')
        .in('key_result_id', krIds);
      if (error) throw error;
      return [...new Set((data || []).map((r: any) => r.project_id))] as string[];
    },
    enabled: krIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const unlinkedProjects = useMemo(() => {
    if (!projects?.length) return [];
    const linked = new Set(linkedProjectIds || []);
    return projects.filter((p) => !linked.has(p.id));
  }, [projects, linkedProjectIds]);

  if (!unlinkedProjects.length) return null;

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">Projetos sem OKR</p>
      <div className="space-y-2">
        {unlinkedProjects.slice(0, 5).map((project) => (
          <div key={project.id} className="flex items-center justify-between gap-2">
            <span className="text-sm truncate">{project.name}</span>
            <div className="flex items-center gap-2">
              <ProjectHealthBadge health={project.health} />
              <span className="text-xs text-muted-foreground">{Math.round(project.completion_pct)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExecutiveQuarterReviewPage() {
  usePageTitle('Análise do Quarter — Executivo');

  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  const cycleState = useUrlState<string>({ key: 'cycle', defaultValue: '' });

  const { data: quarterCycles, isLoading: isLoadingCycles, error: cyclesError } = useQuery({
    queryKey: ['quarter-review', 'cycles', currentBuId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select('id, name, start_date, end_date, status, qbr_status')
        .eq('bu_id', currentBuId!)
        .eq('type', 'quarter')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as QuarterCycle[];
    },
    enabled: !!currentBuId,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (!quarterCycles?.length || cycleState.value) return;
    const preferred = quarterCycles.find((c) => c.status === 'active') ?? quarterCycles[0];
    if (preferred?.id) cycleState.set(preferred.id);
  }, [quarterCycles, cycleState]);

  const selectedCycle = useMemo(
    () => quarterCycles?.find((c) => c.id === cycleState.value) ?? null,
    [quarterCycles, cycleState.value],
  );

  const { data: teamObjectives, isLoading: isLoadingObjectives, error: objectivesError } = useQuery({
    queryKey: ['quarter-review', 'team-objectives', currentBuId, selectedCycle?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_team_objectives')
        .select(`
          id, title, team_id,
          team:teams!okr_team_objectives_team_id_fkey(
            id, name, area_id,
            area:areas!teams_area_id_fkey(id, name, color)
          ),
          key_results:okr_team_key_results(
            id, title, baseline, current_value, target, direction, unit, status, last_checkin_at, deleted_at, cancelled_at
          )
        `)
        .eq('bu_id', currentBuId!)
        .eq('cycle_id', selectedCycle!.id)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .neq('status', 'cancelled')
        .neq('status', 'discarded');
      if (error) throw error;

      return ((data || []) as any[]).map((obj) => ({
        ...obj,
        key_results: (obj.key_results || []).filter((kr: any) => !kr.deleted_at && !kr.cancelled_at),
      })) as TeamObjectiveRow[];
    },
    enabled: !!currentBuId && !!selectedCycle?.id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: ritualSessions, isLoading: isLoadingRituals, error: ritualError } = useQuery({
    queryKey: ['quarter-review', 'ritual-sessions', currentBuId, selectedCycle?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_wizard_sessions')
        .select('id, team_id, wizard_type, completed_at, decisions, reflection_data, addendums')
        .eq('bu_id', currentBuId!)
        .eq('cycle_id', selectedCycle!.id)
        .eq('status', 'completed')
        .in('wizard_type', ['qbr-pre', 'qbr-pre-clevel', 'qbr-meeting', 'qbr-post', 'mbr', 'mbr-pre', 'mbr-first', 'mbr-pre-first']);
      if (error) throw error;
      return (data || []) as RitualSessionRow[];
    },
    enabled: !!currentBuId && !!selectedCycle?.id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: teams } = useTeams();
  const { kpis, isLoading: isLoadingKpis, error: kpiError } = useKpiData({ scope: 'org' });
  const { data: inProgressProjects, isLoading: isLoadingProjects, error: projectsError } = useProjects({ status: 'in_progress' as any });

  const isLoading = isLoadingCycles || isLoadingObjectives || isLoadingRituals || isLoadingKpis || isLoadingProjects;
  const hasError = cyclesError || objectivesError || ritualError || kpiError || projectsError;

  const cycleSummaryText = selectedCycle
    ? `${format(parseISO(selectedCycle.start_date), 'dd MMM', { locale: ptBR })} → ${format(parseISO(selectedCycle.end_date), 'dd MMM', { locale: ptBR })} · ${selectedCycle.status === 'closed' ? 'Encerrado' : selectedCycle.status === 'active' ? 'Ativo' : 'Planejamento'}`
    : '';

  const teamStats = useMemo(() => {
    const source = teamObjectives || [];
    return source.map((objective) => {
      const krs = objective.key_results || [];
      const avgProgress = krs.length
        ? Math.round(
            krs.reduce(
              (sum, kr) =>
                sum +
                calculateProgress(
                  Number(kr.baseline) || 0,
                  Number(kr.current_value) || 0,
                  Number(kr.target) || 0,
                  (kr.direction || 'up') as 'up' | 'down',
                ),
              0,
            ) / krs.length,
          )
        : 0;

      const healthyCount = krs.filter((kr) => kr.status === 'green').length;
      const redYellowCount = krs.filter((kr) => kr.status === 'red' || kr.status === 'yellow').length;
      const healthScore = krs.length ? Math.round((healthyCount / krs.length) * 100) : 0;
      const healthStatus = redYellowCount > healthyCount ? 'risk' : healthScore >= 70 ? 'healthy' : 'attention';

      return {
        objective,
        krs,
        avgProgress,
        healthScore,
        healthStatus,
      };
    });
  }, [teamObjectives]);

  const groupedAreaData = useMemo(() => {
    const map = new Map<string, {
      areaName: string;
      areaColor: string | null;
      teams: Array<{
        teamId: string;
        teamName: string;
        objectives: typeof teamStats;
        healthScore: number;
        avgProgress: number;
        healthStatus: 'healthy' | 'attention' | 'risk';
      }>;
      healthScoreAvg: number;
    }>();

    for (const stat of teamStats) {
      const areaName = stat.objective.team?.area?.name || 'Sem área';
      const areaKey = stat.objective.team?.area?.id || 'no-area';
      const teamId = stat.objective.team_id;
      const teamName = stat.objective.team?.name || 'Time';

      if (!map.has(areaKey)) {
        map.set(areaKey, {
          areaName,
          areaColor: stat.objective.team?.area?.color || null,
          teams: [],
          healthScoreAvg: 0,
        });
      }

      const area = map.get(areaKey)!;
      const existingTeam = area.teams.find((t) => t.teamId === teamId);
      if (!existingTeam) {
        area.teams.push({
          teamId,
          teamName,
          objectives: [stat],
          healthScore: stat.healthScore,
          avgProgress: stat.avgProgress,
          healthStatus: stat.healthStatus,
        });
      } else {
        existingTeam.objectives.push(stat);
        existingTeam.healthScore = Math.round(
          existingTeam.objectives.reduce((s, o) => s + o.healthScore, 0) / existingTeam.objectives.length,
        );
        existingTeam.avgProgress = Math.round(
          existingTeam.objectives.reduce((s, o) => s + o.avgProgress, 0) / existingTeam.objectives.length,
        );
      }
    }

    for (const area of map.values()) {
      area.healthScoreAvg = area.teams.length
        ? Math.round(area.teams.reduce((s, t) => s + t.healthScore, 0) / area.teams.length)
        : 0;
    }

    return [...map.values()].sort((a, b) => a.areaName.localeCompare(b.areaName));
  }, [teamStats]);

  const flatKrs = useMemo(() => teamStats.flatMap((x) => x.krs), [teamStats]);
  const cutoff = subDays(new Date(), 7);
  const krsWithRecentCheckin = flatKrs.filter((kr) => kr.last_checkin_at && isAfter(parseISO(kr.last_checkin_at), cutoff)).length;
  const engagement = flatKrs.length ? Math.round((krsWithRecentCheckin / flatKrs.length) * 100) : 0;
  const okrsOnTrack = flatKrs.filter((kr) => kr.status === 'green').length;
  const okrsAtRisk = flatKrs.filter((kr) => kr.status === 'yellow' || kr.status === 'red').length;
  const decisionsCount = (ritualSessions || []).reduce((sum, s) => sum + (Array.isArray(s.decisions) ? s.decisions.length : 0), 0);

  const kpisByCategory = useMemo(() => {
    const groups = new Map<string, typeof kpis>();
    for (const kpi of kpis || []) {
      const key = (kpi.category || 'sem categoria').toString();
      if (!groups.has(key)) groups.set(key, [] as any);
      groups.get(key)!.push(kpi);
    }
    return [...groups.entries()].map(([category, items]) => ({
      category,
      items: [...items].sort((a, b) => {
        const score = (x: any) => (x.rag_status === 'red' ? 0 : x.rag_status === 'yellow' ? 1 : x.rag_status === 'green' ? 2 : 3);
        return score(a) - score(b);
      }),
    }));
  }, [kpis]);

  const projectsInCycle = useMemo(() => {
    if (!selectedCycle || !inProgressProjects) return [];
    const start = parseISO(selectedCycle.start_date);
    const end = parseISO(selectedCycle.end_date);
    return inProgressProjects.filter((project) => {
      const pStart = project.start_date ? parseISO(project.start_date) : null;
      const pDue = project.due_date ? parseISO(project.due_date) : null;
      if (!pStart && !pDue) return true;
      if (pStart && pDue) return !isAfter(pStart, end) && !isBefore(pDue, start);
      if (pStart) return !isAfter(pStart, end);
      return !isBefore(pDue!, start);
    });
  }, [inProgressProjects, selectedCycle]);

  const riskProjects = useMemo(
    () => [...projectsInCycle].filter((p) => p.health === 'at_risk' || p.health === 'late').sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999')),
    [projectsInCycle],
  );

  const ritualByTeam = useMemo(() => {
    const qbr = new Map<string, RitualSessionRow>();
    const mbr = new Map<string, RitualSessionRow>();

    for (const session of ritualSessions || []) {
      if (!session.team_id) continue;
      if (session.wizard_type === 'qbr-pre') qbr.set(session.team_id, session);
      if (session.wizard_type === 'mbr-pre') mbr.set(session.team_id, session);
    }

    return { qbr, mbr };
  }, [ritualSessions]);

  if (isLoading) {
    return (
      <HubLayout>
        <LoadingState text="Carregando análise do quarter..." />
      </HubLayout>
    );
  }

  if (hasError) {
    return (
      <HubLayout>
        <ErrorState title="Erro ao carregar análise" description="Não foi possível consolidar os dados do quarter." />
      </HubLayout>
    );
  }

  if (!quarterCycles || quarterCycles.length === 0) {
    return (
      <HubLayout>
        <div className="space-y-6">
          <PageHeader
            title="Análise do Quarter"
            description="Visão consolidada de OKRs, KPIs, projetos e aprendizados do ciclo."
            breadcrumbs={[
              { label: 'OKRs', href: '/okrs' },
              { label: 'Dashboard Executivo', href: '/okrs/executive' },
              { label: 'Análise do Quarter' },
            ]}
          />
          <EmptyState
            title="Nenhum ciclo disponível para análise"
            description="Configure um ciclo em Configurações → OKRs → Ciclos."
            actionLabel="Abrir configurações de ciclos"
            onAction={() => (window.location.href = '/hub/modules/okrs/settings')}
          />
        </div>
      </HubLayout>
    );
  }

  if (!selectedCycle) {
    return (
      <HubLayout>
        <ErrorState title="Ciclo não encontrado" description="Selecione um quarter válido para análise." />
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Análise do Quarter"
          description="Consolidação estratégica para CEO e C-Level."
          breadcrumbs={[
            { label: 'OKRs', href: '/okrs' },
            { label: 'Dashboard Executivo', href: '/okrs/executive' },
            { label: 'Análise do Quarter' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Analisando:</span>
              <Select value={selectedCycle.id} onValueChange={cycleState.set}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Selecionar quarter" />
                </SelectTrigger>
                <SelectContent>
                  {quarterCycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        <p className="text-sm text-muted-foreground -mt-3">{cycleSummaryText}</p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Scorecard do quarter</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard title="OKRs no ritmo" value={String(okrsOnTrack)} subtitle="KRs com saúde saudável" />
            <MetricCard title="OKRs em risco" value={String(okrsAtRisk)} subtitle="KRs em atenção ou fora de rota" />
            <MetricCard title="Engajamento" value={`${engagement}%`} subtitle="KRs com check-in nos últimos 7 dias" />
            <MetricCard title="Decisões" value={String(decisionsCount)} subtitle="Decisões registradas nos rituais" />
          </div>

          <div className="flex flex-wrap gap-2">
            {groupedAreaData.map((area) => (
              <Badge key={area.areaName} variant="outline" className="gap-2">
                <span>{area.areaName}</span>
                <span className="font-semibold">{area.healthScoreAvg}</span>
              </Badge>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Indicadores da empresa</h2>
          <div className="space-y-4">
            {kpisByCategory.map((group) => (
              <Card key={group.category}>
                <CardHeader className="pb-3">
                  <CardTitle className="capitalize text-base">{group.category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.items.map((kpi) => {
                    const rag = statusToKpiBadge(kpi.rag_status);
                    return (
                      <div
                        key={kpi.id}
                        className={`rounded-md border p-3 flex items-center justify-between gap-3 ${kpi.rag_status === 'red' ? 'border-status-red/50' : kpi.rag_status === 'yellow' ? 'border-status-yellow/50' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{kpi.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {kpi.current_value ?? '—'} {kpi.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={rag.cls}>{rag.label}</Badge>
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            {trendArrow(kpi.variation)}
                            {kpi.variation === null ? '—' : `${kpi.variation.toFixed(1)}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Desempenho por área</h2>
          <Accordion type="multiple" className="w-full">
            {groupedAreaData.map((area) => (
              <AccordionItem key={area.areaName} value={area.areaName}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span>{area.areaName}</span>
                    <Badge variant="outline">Score {area.healthScoreAvg}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {area.teams.map((team) => {
                      const allKrIds = team.objectives.flatMap((o) => o.krs.map((kr) => kr.id));

                      return (
                        <Card key={team.teamId}>
                          <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <CardTitle className="text-base">{team.teamName}</CardTitle>
                                <CardDescription>Progresso médio das KRs: {team.avgProgress}%</CardDescription>
                              </div>
                              <Badge variant="outline">
                                {team.healthStatus === 'healthy' ? 'healthy' : team.healthStatus === 'attention' ? 'attention' : 'risk'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {team.objectives.map((objectiveStat) => (
                              <div key={objectiveStat.objective.id} className="rounded-lg border p-3 space-y-2">
                                <p className="font-medium">{objectiveStat.objective.title}</p>
                                {objectiveStat.krs.map((kr) => {
                                  const progress = calculateProgress(
                                    Number(kr.baseline) || 0,
                                    Number(kr.current_value) || 0,
                                    Number(kr.target) || 0,
                                    (kr.direction || 'up') as 'up' | 'down',
                                  );
                                  const daysSinceCheckin = kr.last_checkin_at
                                    ? Math.max(
                                        0,
                                        Math.floor(
                                          (Date.now() - parseISO(kr.last_checkin_at).getTime()) / (1000 * 60 * 60 * 24),
                                        ),
                                      )
                                    : 999;
                                  const state = calculateKrState({
                                    progress,
                                    status: kr.status,
                                    daysSinceCheckin,
                                    cycleEnded: selectedCycle.status === 'closed',
                                  });

                                  return (
                                    <div key={kr.id} className="rounded-md border bg-muted/20 p-3">
                                      <div className="flex items-center justify-between gap-2 mb-2">
                                        <p className="text-sm font-medium truncate">{kr.title}</p>
                                        <KrStateInline state={state} />
                                      </div>
                                      <OkrProgressBar
                                        baseline={Number(kr.baseline) || 0}
                                        current={Number(kr.current_value) || 0}
                                        target={Number(kr.target) || 0}
                                        direction={(kr.direction || 'up') as 'up' | 'down'}
                                        status={(kr.status || 'not_started') as any}
                                        unit={kr.unit || '%'}
                                      />
                                      <div className="mt-2">
                                        <LastCheckinBadge lastCompletedAt={kr.last_checkin_at} />
                                      </div>
                                      <TeamKrLinkedDetails krId={kr.id} />
                                    </div>
                                  );
                                })}
                              </div>
                            ))}

                            <TeamUnlinkedProjects teamId={team.teamId} krIds={allKrIds} />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Projetos estratégicos</h2>
            <Button variant="outline" asChild>
              <Link to="/projects">Ver todos os projetos</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard title="Ativos" value={String(projectsInCycle.length)} />
            <MetricCard title="No prazo" value={String(projectsInCycle.filter((p) => p.health === 'on_track').length)} />
            <MetricCard title="Em risco" value={String(projectsInCycle.filter((p) => p.health === 'at_risk').length)} />
            <MetricCard title="Atrasados" value={String(projectsInCycle.filter((p) => p.health === 'late').length)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projetos críticos do quarter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {riskProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem projetos em risco/atrasados neste quarter.</p>
              ) : (
                riskProjects.map((project) => {
                  const nextMilestone = (project.milestones || [])
                    .filter((m: any) => m.status !== 'completed' && !m.deleted_at)
                    .sort((a: any, b: any) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))[0];

                  return (
                    <div key={project.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{project.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="inline-flex items-center gap-1">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={project.owner?.photo_url || undefined} />
                                <AvatarFallback>{getFallback(project.owner?.display_name || 'Owner')}</AvatarFallback>
                              </Avatar>
                              {project.owner?.display_name || 'Sem owner'}
                            </span>
                            <span>•</span>
                            <span>{project.teams.map((t) => t.team_name).join(', ') || 'Sem time'}</span>
                          </div>
                        </div>
                        <ProjectHealthBadge health={project.health} />
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {project.krs.map((kr) => (
                          <Badge key={kr.key_result_id} variant="outline" className="text-xs">
                            {kr.kr_title}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-2">
                        <ProjectProgressBar total={project.milestones_total} done={project.milestones_done} pct={project.completion_pct} showPct />
                      </div>

                      {nextMilestone ? (
                        <p className="text-xs text-muted-foreground mt-2">
                          Próximo milestone: {nextMilestone.name} · {nextMilestone.due_date ? format(parseISO(nextMilestone.due_date), 'dd/MM/yyyy') : 'sem data'}
                        </p>
                      ) : null}

                      {project.external_url ? (
                        <a
                          href={project.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                        >
                          Link externo <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">O que os times disseram este quarter</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {(teams || []).map((team) => {
              const qbrSession = ritualByTeam.qbr.get(team.id);
              const mbrSession = ritualByTeam.mbr.get(team.id);
              const baseSession = qbrSession || mbrSession || null;

              if (!baseSession) {
                return (
                  <Card key={team.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{team.name}</CardTitle>
                      <Badge variant="secondary">Sem preparação enviada</Badge>
                    </CardHeader>
                  </Card>
                );
              }

              const learnings = extractLearnings(baseSession.reflection_data);
              const decisions = (baseSession.decisions || []).map((d) => d.text || d.title || '').filter(Boolean);
              const hasAddendum = Array.isArray(baseSession.addendums) && baseSession.addendums.length > 0;

              return (
                <Card key={team.id} className={hasAddendum ? 'border-status-yellow/50' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{team.name}</CardTitle>
                        <CardDescription>
                          Enviado em {baseSession.completed_at ? format(parseISO(baseSession.completed_at), 'dd/MM/yyyy HH:mm') : '—'}
                        </CardDescription>
                      </div>
                      {hasAddendum ? <Badge className="bg-status-yellow-muted text-status-yellow">Adendo</Badge> : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium">Keep</p>
                      <p className="text-muted-foreground line-clamp-2">{learnings.keep.join(' • ') || '—'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Stop</p>
                      <p className="text-muted-foreground line-clamp-2">{learnings.stop.join(' • ') || '—'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Débitos</p>
                      <p className="text-muted-foreground line-clamp-2">{learnings.debts.join(' • ') || '—'}</p>
                    </div>

                    {learnings.zombieKpis.length > 0 ? (
                      <div>
                        <p className="font-medium">KPIs zombie</p>
                        <p className="text-muted-foreground line-clamp-2">{learnings.zombieKpis.join(' • ')}</p>
                      </div>
                    ) : null}

                    {decisions.length > 0 ? (
                      <div>
                        <p className="font-medium">Itens que precisam de decisão</p>
                        <p className="text-muted-foreground line-clamp-2">{decisions.join(' • ')}</p>
                      </div>
                    ) : null}

                    <Link
                      to={`/rituals/history?session=${baseSession.id}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                    >
                      Ver relatório completo <FolderKanban className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </HubLayout>
  );
}