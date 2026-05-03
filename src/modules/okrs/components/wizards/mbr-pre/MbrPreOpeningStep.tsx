/**
 * MbrPreOpeningStep — Step 1 do Pré-MBR (Abertura)
 *
 * Espelha o canon do Check-in Individual (CollaboratorContextStep):
 *   - Saudação contextual via <RitualGreeting ritualSlug="mbr-pre" />
 *   - Snapshot agregado read-only do mês (KRs em atenção, KPIs em alerta,
 *     projetos/marcos atrasados)
 *   - Único CTA "Começar" (WizardFirstStepFooter)
 *
 * Sem duplicar componentes: reutiliza shared/RitualGreeting, WizardStepScaffold,
 * WizardStepHeader e WizardFirstStepFooter.
 */

import { useMemo } from 'react';
import { Sparkles, TrendingUp, Activity, FolderKanban } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  RitualGreeting,
  WizardStepHeader,
  WizardStepScaffold,
} from '../shared';
import { WizardFirstStepFooter } from '../shared/WizardStepFooter';
import { useRitualGreetingContext } from '@/modules/okrs/hooks';
import { useMbrPreTeamProjects } from '@/modules/okrs/hooks';
import type {
  MbrKpiSnapshot,
  MbrPreDraftData,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrPreOpeningStepProps {
  teamId: string | null | undefined;
  teamName?: string | null;
  effectiveUserId?: string | null;
  cycleId?: string | null;
  isLoading?: boolean;
  krFinalStates: MbrPreDraftData['krFinalStates'];
  kpiSnapshots: MbrKpiSnapshot[];
  onContinue: () => void;
}

// ============================================================
// SNAPSHOT CARD
// ============================================================

interface StatTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  total: number;
  tone: 'attention' | 'neutral' | 'ok';
}

function StatTile({ icon: Icon, label, value, total, tone }: StatTileProps) {
  const accent =
    tone === 'attention' && value > 0
      ? 'border-status-amber/40 bg-status-amber-muted/40'
      : tone === 'ok' && total > 0
        ? 'border-status-green/30 bg-status-green-muted/30'
        : 'border-border bg-card';

  return (
    <div
      className={cn(
        'rounded-lg border p-3 flex items-start gap-3 min-w-0',
        accent,
      )}
    >
      <Icon className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-base font-semibold text-foreground">
          {value}
          <span className="text-xs text-muted-foreground font-normal">
            {' '}
            / {total}
          </span>
        </p>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrPreOpeningStep({
  teamId,
  teamName,
  effectiveUserId = null,
  cycleId = null,
  isLoading,
  krFinalStates,
  kpiSnapshots,
  onContinue,
}: MbrPreOpeningStepProps) {
  // Saudação contextual
  const greeting = useRitualGreetingContext({
    ritualSlug: 'mbr-pre',
    effectiveUserId,
  });

  // Projetos do time (read-only — usado apenas para a contagem agregada)
  const { projects, overdueProjectIds, overdueMilestoneIds, isLoading: loadingProjects } =
    useMbrPreTeamProjects(teamId);

  const stats = useMemo(() => {
    const krsTotal = krFinalStates.length;
    const krsAttention = krFinalStates.filter((kr) => {
      const s = (kr.state ?? '').toLowerCase();
      return s.includes('risk') || s.includes('off') || s.includes('stagnant');
    }).length;

    const kpisTotal = kpiSnapshots.length;
    const kpisAttention = kpiSnapshots.filter(
      (k) => k.ragStatus === 'red' || k.ragStatus === 'yellow',
    ).length;

    const projectsTotal = projects.length;
    const projectsAttention = overdueProjectIds.length + overdueMilestoneIds.length;

    return {
      krsTotal,
      krsAttention,
      kpisTotal,
      kpisAttention,
      projectsTotal,
      projectsAttention,
    };
  }, [krFinalStates, kpiSnapshots, projects.length, overdueProjectIds.length, overdueMilestoneIds.length]);

  const showLoading = !!isLoading || loadingProjects;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Sparkles}
          title="Abertura"
          tooltip="mbr-pre-opening"
          description="Resumo do mês do time — confira o panorama antes de começar"
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
          ritualSlug="mbr-pre"
          userName={teamName ?? null}
          cycleName={greeting.cycleName}
          weekNumber={greeting.weekNumber}
          checkInOrdinal={greeting.checkInOrdinal}
        />

        {showLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Resumo do mês
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatTile
                icon={TrendingUp}
                label="KRs em atenção"
                value={stats.krsAttention}
                total={stats.krsTotal}
                tone="attention"
              />
              <StatTile
                icon={Activity}
                label="KPIs fora da meta"
                value={stats.kpisAttention}
                total={stats.kpisTotal}
                tone="attention"
              />
              <StatTile
                icon={FolderKanban}
                label="Itens de projeto atrasados"
                value={stats.projectsAttention}
                total={stats.projectsTotal}
                tone="attention"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Esta é uma visão reflexiva. Você não vai atualizar valores aqui — só
              olhar o que precisa de justificativa nos próximos passos.
            </p>
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
}
