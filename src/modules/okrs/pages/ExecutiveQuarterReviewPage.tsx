import { useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { HubLayout } from '@/components/layout/HubLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlState } from '@/shared/url';

import { useQuarterReviewData } from './executive-quarter-review/useQuarterReviewData';
import { ScorecardSection } from './executive-quarter-review/sections/ScorecardSection';
import { KpisSection } from './executive-quarter-review/sections/KpisSection';
import { AreaPerformanceSection } from './executive-quarter-review/sections/AreaPerformanceSection';
import { ProjectsSection } from './executive-quarter-review/sections/ProjectsSection';
import { RitualSummariesSection } from './executive-quarter-review/sections/RitualSummariesSection';

/**
 * Refatorado em 2026-05-04: lógica de queries e seções extraídas para
 * `executive-quarter-review/*` (W2.F.2).
 */
export default function ExecutiveQuarterReviewPage() {
  usePageTitle('Análise do Quarter — Executivo');

  const cycleState = useUrlState<string>({ key: 'cycle', defaultValue: '' });

  const {
    quarterCycles,
    selectedCycle,
    teams,
    kpisByCategory,
    groupedAreaData,
    okrsOnTrack,
    okrsAtRisk,
    engagement,
    decisionsCount,
    projectsInCycle,
    riskProjects,
    ritualByTeam,
    isLoading,
    errors,
  } = useQuarterReviewData({ selectedCycleId: cycleState.value });

  useEffect(() => {
    if (!quarterCycles?.length || cycleState.value) return;
    const preferred = quarterCycles.find((c) => c.status === 'active') ?? quarterCycles[0];
    if (preferred?.id) cycleState.set(preferred.id);
  }, [quarterCycles, cycleState]);

  const hasError =
    errors.cyclesError ||
    errors.objectivesError ||
    errors.ritualError ||
    errors.kpiError ||
    errors.projectsError;

  if (isLoading) {
    return (
      <HubLayout>
        <LoadingState text="Carregando análise do quarter..." />
      </HubLayout>
    );
  }

  if (hasError) {
    const failedSources = [
      errors.cyclesError && 'Ciclos',
      errors.objectivesError && 'Objetivos',
      errors.ritualError && 'Rituais',
      errors.kpiError && 'KPIs',
      errors.projectsError && 'Projetos',
    ].filter(Boolean);

    const errorDetail = (errors.cyclesError ||
      errors.objectivesError ||
      errors.ritualError ||
      errors.kpiError ||
      errors.projectsError) as Error | null;

    console.error('[QuarterReview] Query errors:', errors);

    return (
      <HubLayout>
        <ErrorState
          title="Erro ao carregar análise"
          description={`Falha ao buscar: ${failedSources.join(', ')}. ${errorDetail?.message || 'Tente novamente.'}`}
          retryLabel="Tentar novamente"
          onRetry={() => window.location.reload()}
        />
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

  const cycleSummaryText = `${format(parseISO(selectedCycle.start_date), 'dd MMM', { locale: ptBR })} → ${format(parseISO(selectedCycle.end_date), 'dd MMM', { locale: ptBR })} · ${
    selectedCycle.status === 'closed'
      ? 'Encerrado'
      : selectedCycle.status === 'active'
        ? 'Ativo'
        : 'Planejamento'
  }`;

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

        <ScorecardSection
          okrsOnTrack={okrsOnTrack}
          okrsAtRisk={okrsAtRisk}
          engagement={engagement}
          decisionsCount={decisionsCount}
          groupedAreaData={groupedAreaData}
        />

        <KpisSection kpisByCategory={kpisByCategory} />

        <AreaPerformanceSection
          groupedAreaData={groupedAreaData}
          selectedCycle={selectedCycle}
        />

        <ProjectsSection
          projectsInCycle={projectsInCycle}
          riskProjects={riskProjects}
        />

        <RitualSummariesSection teams={teams} ritualByTeam={ritualByTeam} />
      </div>
    </HubLayout>
  );
}
