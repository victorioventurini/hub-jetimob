/**
 * MbrPreKpiGateStep — Etapa "Indicadores do Time" do Pré-MBR.
 *
 * Implementa o KPI Gate canônico v3.0.0 (6 buckets) consumindo:
 *   - `useKpisForWizardV2` (filtrando por `responsibleTeamId` do time do rito)
 *   - `classifyKpiGateBuckets` (overdue > critical > guardrail > attention > healthy > teamContext)
 *
 * UX delegada a `MbrKpiGateStep` (cards com "Plano de ação do líder" inline,
 * decisões com `metadata.source='kpi_gate'` e `kpi_id`).
 *
 * Substitui a etapa anterior baseada em `QbrKpiAnalysisStep paginated`
 * + classificador paralelo de 4 buckets (`getKpiActionBucket`).
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useKpisForWizardV2 } from '@/modules/kpis/hooks/useKpisForWizardV2';
import { classifyKpiGateBuckets } from '@/modules/okrs/components/wizards/shared/framework/config/stepContentAdapters';
import { LoadingState } from '@/components/ui/loading-state';
import { MbrKpiGateStep } from '@/modules/okrs/components/wizards/mbr/MbrKpiGateStep';
import type {
  MbrKpiSnapshot,
  TeamCheckinDecision,
} from '@/modules/okrs/types/wizard';
import type { KpiGateItem } from '@/modules/okrs/components/wizards/shared/framework/config/stepContentAdapters';

export interface MbrPreKpiGateStepProps {
  teamId: string;
  /** Snapshots persistidos no draft (usados como SSOT após reconciliação canônica). */
  kpiSnapshots: MbrKpiSnapshot[];
  onKpiSnapshotsChange: (snapshots: MbrKpiSnapshot[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

function gateItemToSnapshot(item: KpiGateItem): MbrKpiSnapshot {
  const ragStatus: MbrKpiSnapshot['ragStatus'] =
    item.status === 'red' ? 'red'
      : item.status === 'amber' ? 'yellow'
      : item.status === 'green' ? 'green'
      : 'no_data';
  return {
    kpiId: item.id,
    name: item.name,
    currentValue: item.currentValue != null ? Number(item.currentValue) : null,
    previousValue: null,
    target: item.target != null ? Number(item.target) : null,
    ragStatus,
    requiresStrategicDecision: !!item.requiresDecision,
    latestInputType: item.lastInputType ?? null,
  } as MbrKpiSnapshot;
}

export function MbrPreKpiGateStep({
  teamId,
  kpiSnapshots,
  onKpiSnapshotsChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: MbrPreKpiGateStepProps) {
  const { profile } = useAuth();

  const {
    kpisToUpdate,
    kpisInAlert,
    kpisStrategic,
    kpisTeamContext,
    guardrailsViolated,
    isLoading,
  } = useKpisForWizardV2({
    userId: profile?.id ?? '',
    teamId,
    scope: 'leader',
    // Pré-MBR: lista SOMENTE KPIs cujo time responsável é o time do rito.
    responsibleTeamId: teamId,
    // Inclui KPIs `proposed` (ainda não 'active') — caso do "MRR commit".
    lifecycleStatuses: ['active', 'proposed'],
    includeGuardrailsAtRisk: true,
  });

  // Decisões já registradas no gate → marcam KPIs como "endereçados".
  const resolvedIds = useMemo(() => {
    const set = new Set<string>();
    for (const d of decisions) {
      if (d.sourceStep !== 'kpi-gate') continue;
      const kpiId = (d.metadata as { kpi_id?: string } | undefined)?.kpi_id;
      if (kpiId && d.text.trim().length > 0) set.add(kpiId);
    }
    return set;
  }, [decisions]);

  const buckets = useMemo(
    () => classifyKpiGateBuckets({
      kpisToUpdate,
      kpisInAlert,
      kpisStrategic,
      kpisTeamContext,
      guardrailsViolated,
      resolvedIds,
    }),
    [kpisToUpdate, kpisInAlert, kpisStrategic, kpisTeamContext, guardrailsViolated, resolvedIds],
  );

  // Snapshots canônicos derivados dos buckets. `requiresStrategicDecision`
  // vem SEMPRE do bucket canônico (red/amber → true) — sem preservar toggle
  // manual do líder, pois o MBR-Pré não expõe esse toggle.
  const reconciledSnapshots = useMemo(() => {
    const snapshots: MbrKpiSnapshot[] = [];
    const persistedByKpi = new Map(kpiSnapshots.map((s) => [s.kpiId, s]));
    for (const bucket of buckets) {
      for (const item of bucket.items) {
        const next = gateItemToSnapshot(item);
        const prev = persistedByKpi.get(next.kpiId);
        snapshots.push({
          ...next,
          impactAssessment: prev?.impactAssessment ?? next.impactAssessment,
        });
      }
    }
    return snapshots;
  }, [buckets, kpiSnapshots]);

  // Sincroniza draft com snapshots canônicos quando muda algo materialmente.
  useMemo(() => {
    const prevById = new Map(kpiSnapshots.map((s) => [s.kpiId, s]));
    const changed =
      reconciledSnapshots.length !== kpiSnapshots.length ||
      reconciledSnapshots.some((s) => {
        const prev = prevById.get(s.kpiId);
        return (
          !prev ||
          prev.currentValue !== s.currentValue ||
          prev.target !== s.target ||
          prev.ragStatus !== s.ragStatus ||
          prev.requiresStrategicDecision !== s.requiresStrategicDecision
        );
      });
    if (changed) onKpiSnapshotsChange(reconciledSnapshots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconciledSnapshots]);

  if (isLoading) {
    return <LoadingState text="Carregando indicadores do time..." />;
  }

  return (
    <MbrKpiGateStep
      kpiSnapshots={reconciledSnapshots}
      onKpiSnapshotsChange={onKpiSnapshotsChange}
      decisions={decisions}
      onDecisionsChange={onDecisionsChange}
      onContinue={onContinue}
      onBack={onBack}
      showStrategicDecisionToggle={false}
      showInlineDecisionInput={false}
    />
  );
}
