/**
 * CollaboratorContextStep — Step 1 do Check-in Individual.
 *
 * v3 (2026-05-01): redesenhado como abertura ritual.
 *   - Saudação contextual (`<RitualGreeting>`)
 *   - Snapshot compacto (`<CollaboratorSnapshot>`)
 *   - Trilha do check-in (`<CollaboratorCheckinTrail>`)
 *   - Único CTA: "Começar"
 *
 * A lista operacional de KPIs/KRs (antiga UI deste step) foi MOVIDA para o
 * Step 2 (`CollaboratorKpiStep` mostra agora também o contexto de KPIs do
 * time / estratégicos).
 */

import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Sparkles } from 'lucide-react';
import type { WizardKr } from '@/modules/okrs/hooks';
import type { KpiForWizard } from '@/modules/kpis/hooks';
import type { KpiForWizardV2 } from '@/modules/kpis/types';
import { RitualGreeting } from '../shared/RitualGreeting';
import { WizardStepScaffold } from '../shared/WizardStepScaffold';
import { WizardStepHeader } from '../shared/WizardStepHeader';
import { WizardFirstStepFooter } from '../shared/WizardStepFooter';
import { CollaboratorWeekActivity } from './CollaboratorWeekActivity';
import { CollaboratorCheckinTrail, computeTrailEta } from './CollaboratorCheckinTrail';
import { STEP_ORDER, type WizardStep } from './wizardSteps';
import {
  useRitualGreetingContext,
  useCollaboratorOpeningSignals,
  useCollaboratorInitiativesSignal,
  useMyPendingDecisions,
} from '@/modules/okrs/hooks';

// ============================================================
// TYPES
// ============================================================

export interface CollaboratorContextStepProps {
  krs: WizardKr[];
  /** KPIs que o colaborador precisa atualizar (V1 or V2 types accepted) */
  kpisToUpdate?: (KpiForWizard | KpiForWizardV2)[];
  /** @deprecated mantidos por compat — passados ao Step 2 a partir de v3. */
  kpisTeamContext?: KpiForWizardV2[];
  /** @deprecated idem. */
  kpisStrategic?: KpiForWizardV2[];
  isLoading?: boolean;
  /** Nome do usuário efetivo (admin pode estar revisando outro). */
  userName?: string | null;
  /** ID do usuário efetivo — usado para sinais de projetos/bloqueios/iniciativas. */
  effectiveUserId?: string | null;
  /** Ciclo ativo — necessário para o sinal de iniciativas do colaborador. */
  cycleId?: string | null;
  /** Mantido por compat com chamadas anteriores. */
  cycleName?: string;
  lastCompletedAt?: string | null;
  onContinue: () => void;
  /**
   * Sub-conjunto de `STEP_ORDER` que está visível no rito (após filtros
   * dinâmicos como `hasKrStep`/`hasKpiStep`). Default = todos.
   * A trilha respeita esse filtro para não anunciar etapas que não existem.
   */
  visibleStepOrder?: readonly WizardStep[];
}

// ============================================================
// COMPONENT
// ============================================================

export function CollaboratorContextStep({
  krs,
  kpisToUpdate = [],
  isLoading,
  userName,
  effectiveUserId = null,
  cycleId = null,
  visibleStepOrder = STEP_ORDER,
  onContinue,
}: CollaboratorContextStepProps) {
  // Saudação contextual
  const greeting = useRitualGreetingContext({
    ritualSlug: 'collaborator',
    effectiveUserId,
  });

  // Sinais agregados (projetos saudáveis + bloqueios abertos)
  const signals = useCollaboratorOpeningSignals(effectiveUserId);

  // Sinal de iniciativas (owner OR contributor) no ciclo
  const initiativesSignal = useCollaboratorInitiativesSignal(effectiveUserId, cycleId);

  // Estatísticas para snapshot e trilha
  const stats = useMemo(() => {
    const krsTotal = krs.length;
    const krsAttention = krs.filter(
      (kr) => kr.is_at_risk || kr.is_pending || kr.status === 'red' || kr.status === 'yellow',
    ).length;
    const krsOnTrack = Math.max(0, krsTotal - krsAttention);

    const kpisTotal = kpisToUpdate.length;
    const kpisPending = kpisToUpdate.filter((k) => k.needs_update).length;
    const kpisUpdated = Math.max(0, kpisTotal - kpisPending);

    return {
      krsTotal, krsAttention, krsOnTrack,
      kpisTotal, kpisPending, kpisUpdated,
    };
  }, [krs, kpisToUpdate]);

  const projectsAttention = Math.max(0, signals.projectsTotal - signals.projectsHealthy);
  const initiativesAttention = Math.max(
    0,
    initiativesSignal.initiativesTotal - initiativesSignal.initiativesOnTrack,
  );

  // Pendências do usuário (mesma fonte do step `decisions`).
  const { data: pendingDecisions = [] } = useMyPendingDecisions(effectiveUserId);
  const pendingDecisionsCount = pendingDecisions.length;

  const eta = useMemo(
    () =>
      computeTrailEta({
        pendingKpis: stats.kpisPending,
        attentionKrs: stats.krsAttention,
        pendingProjectMilestones: projectsAttention,
        attentionInitiatives: initiativesAttention,
        pendingDecisions: pendingDecisionsCount,
      }),
    [stats.kpisPending, stats.krsAttention, projectsAttention, initiativesAttention, pendingDecisionsCount],
  );

  // Trilha derivada de STEP_ORDER — espelha a ordem real dos steps do rito.
  // Steps `context`, `decisions`, `summary` não fazem parte da trilha (não são
  // "trabalho do usuário" anunciado na abertura). `reflection` aparece sempre
  // como último item.
  const trailSteps = useMemo(() => {
    type StepRow = {
      label: string;
      pendingCount: number;
      total?: number;
      summaryOverride?: string;
      etaMinutes: number;
    };

    const builders: Partial<Record<WizardStep, () => StepRow>> = {
      kpis: () => ({
        label: 'Indicadores',
        pendingCount: stats.kpisPending,
        summaryOverride:
          stats.kpisTotal === 0
            ? 'Sem KPIs neste ciclo'
            : stats.kpisPending === 0
              ? 'Tudo em dia'
              : `${stats.kpisPending} KPI${stats.kpisPending > 1 ? 's' : ''} para atualizar`,
        etaMinutes: eta.kpis,
      }),
      projects: () => ({
        label: 'Projetos',
        pendingCount: projectsAttention,
        total: signals.projectsTotal,
        summaryOverride: signals.projectsTotal === 0 ? 'Sem projetos' : undefined,
        etaMinutes: eta.projects,
      }),
      initiatives: () => ({
        label: 'Iniciativas',
        pendingCount: initiativesAttention,
        total: initiativesSignal.initiativesTotal,
        summaryOverride:
          initiativesSignal.initiativesTotal === 0
            ? 'Sem iniciativas'
            : `${initiativesSignal.initiativesOnTrack} de ${initiativesSignal.initiativesTotal} em dia`,
        etaMinutes: eta.initiatives,
      }),
      checkin: () => ({
        label: 'KRs',
        pendingCount: stats.krsAttention,
        summaryOverride:
          stats.krsTotal === 0
            ? 'Sem KRs atribuídos'
            : stats.krsAttention === 0
              ? 'Tudo em dia'
              : `${stats.krsAttention} KR${stats.krsAttention > 1 ? 's' : ''} precisa${stats.krsAttention > 1 ? 'm' : ''} atenção`,
        etaMinutes: eta.krs,
      }),
      decisions: () => ({
        label: 'Pendências',
        pendingCount: pendingDecisionsCount,
        summaryOverride:
          pendingDecisionsCount === 0
            ? 'Nada para resolver'
            : `${pendingDecisionsCount} ${pendingDecisionsCount > 1 ? 'itens' : 'item'} para resolver`,
        etaMinutes: eta.decisions,
      }),
      reflection: () => ({
        label: 'Reflexão e envio',
        pendingCount: 0,
        summaryOverride: ' ',
        etaMinutes: eta.reflection,
      }),
    };

    return visibleStepOrder
      .map((id) => builders[id]?.())
      .filter((row): row is StepRow => !!row);
  }, [
    visibleStepOrder,
    stats.kpisPending, stats.kpisTotal, stats.krsAttention, stats.krsTotal,
    projectsAttention, signals.projectsTotal,
    initiativesAttention, initiativesSignal.initiativesTotal, initiativesSignal.initiativesOnTrack,
    pendingDecisionsCount,
    eta.kpis, eta.projects, eta.initiatives, eta.krs, eta.decisions, eta.reflection,
  ]);

  const hasNothing =
    stats.krsTotal === 0 &&
    stats.kpisTotal === 0 &&
    signals.projectsTotal === 0 &&
    initiativesSignal.initiativesTotal === 0;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Sparkles}
          title="Visão geral"
          tooltip="collaborator-context"
          description="Confira o que vamos revisar e comece pela sua trilha"
          variant="purple"
        />
      }
      footer={
        <WizardFirstStepFooter
          primaryLabel="Começar"
          onPrimary={onContinue}
        />
      }
    >
      <div className="p-4 md:p-6 space-y-6 min-w-0 max-w-full">
        <RitualGreeting
          ritualSlug="collaborator"
          userName={userName}
          cycleName={greeting.cycleName}
          weekNumber={greeting.weekNumber}
          checkInOrdinal={greeting.checkInOrdinal}
        />

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : hasNothing ? (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h4 className="font-medium">Nada para atualizar</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Você não possui KRs, KPIs, iniciativas ou projetos para revisar neste ciclo.
            </p>
          </div>
        ) : (
          <>
            <CollaboratorWeekActivity
              effectiveUserId={effectiveUserId}
              cycleId={cycleId}
              krs={krs}
              kpisToUpdate={kpisToUpdate}
            />

            <CollaboratorCheckinTrail steps={trailSteps} />
          </>
        )}
      </div>
    </WizardStepScaffold>
  );
}
