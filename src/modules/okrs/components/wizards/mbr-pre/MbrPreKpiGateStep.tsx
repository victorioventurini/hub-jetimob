/**
 * MbrPreKpiGateStep — Etapa "Indicadores do Time" do Pré-MBR.
 *
 * v3.30.0: passa a consumir o `KpiGateStep` canônico do framework
 * (`@/wizards-framework`) em modo `cardVariant: 'rich'`. Toda variação
 * visual vive na config; o componente do framework permanece agnóstico
 * de `wizardType` (TCR §4.8.1, Princípio #4).
 *
 * Fluxo:
 *   1. `useKpisForWizardV2` (filtrando por `responsibleTeamId`) →
 *      `classifyKpiGateBuckets` (6 buckets canônicos v3.0.0).
 *   2. Buckets passados ao `KpiGateStep`; justificativas hidratadas a
 *      partir de `kpiSnapshots[].impactAssessment` (SSOT do draft).
 *   3. Gate local: KPIs em buckets obrigatórios (overdue/critical/
 *      guardrailViolated) precisam de plano não vazio para "Próximo".
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useKpisForWizardV2 } from '@/modules/kpis/hooks/useKpisForWizardV2';
import {
  classifyKpiGateBuckets,
  type KpiGateBucket,
  type KpiGateBucketId,
  type KpiGateItem,
} from '@/modules/okrs/components/wizards/shared/framework/config/stepContentAdapters';
import { KpiGateStep, flattenBucketsForPagination } from '@/wizards-framework';
import { WizardStepFooter } from '@/modules/okrs/components/wizards/shared';
import { LoadingState } from '@/components/ui/loading-state';
import type {
  MbrKpiSnapshot,
  TeamCheckinDecision,
} from '@/modules/okrs/types/wizard';

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

const MANDATORY_BUCKETS: ReadonlySet<KpiGateBucketId> = new Set([
  'overdue',
  'critical',
  'guardrailViolated',
]);

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
    responsibleTeamId: teamId,
    lifecycleStatuses: ['active', 'proposed'],
    includeGuardrailsAtRisk: true,
  });

  const buckets: KpiGateBucket[] = useMemo(
    () => classifyKpiGateBuckets({
      kpisToUpdate,
      kpisInAlert,
      kpisStrategic,
      kpisTeamContext,
      guardrailsViolated,
    }),
    [kpisToUpdate, kpisInAlert, kpisStrategic, kpisTeamContext, guardrailsViolated],
  );

  // Reconcilia snapshots canônicos com o draft (preserva impactAssessment).
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

  // Sincroniza draft com snapshots quando muda algo materialmente.
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

  // Justificativas: kpiId → impactAssessment do snapshot.
  const justifications = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of reconciledSnapshots) {
      if (s.impactAssessment) map[s.kpiId] = s.impactAssessment;
    }
    return map;
  }, [reconciledSnapshots]);

  const handleJustificationChange = useCallback(
    (kpiId: string, value: string) => {
      const exists = reconciledSnapshots.some((s) => s.kpiId === kpiId);
      if (!exists) return;
      onKpiSnapshotsChange(
        reconciledSnapshots.map((s) =>
          s.kpiId === kpiId ? { ...s, impactAssessment: value } : s,
        ),
      );
    },
    [reconciledSnapshots, onKpiSnapshotsChange],
  );

  // Gate local: KPIs em buckets obrigatórios sem plano de ação.
  // Inclui também KPIs de teamContext em RED (KPIs de área sob responsabilidade
  // do time fora da meta) — equiparados aos críticos para o gate.
  const mandatoryMissing = useMemo(() => {
    let missing = 0;
    for (const bucket of buckets) {
      const bucketIsMandatory = MANDATORY_BUCKETS.has(bucket.id);
      for (const item of bucket.items) {
        const requiresPlan =
          bucketIsMandatory || (bucket.id === 'teamContext' && item.status === 'red');
        if (!requiresPlan) continue;
        if (!(justifications[item.id] ?? '').trim()) missing++;
      }
    }
    return missing;
  }, [buckets, justifications]);

  // ── Pagination state (1 KPI por página, paridade com MbrPreKrAnalysisStep) ──
  const totalKpiCount = useMemo(
    () => buckets.reduce((acc, b) => acc + b.items.length, 0),
    [buckets],
  );
  const [currentKpiIndex, setCurrentKpiIndex] = useState(0);
  // Clamp se a lista mudar (re-seed).
  useEffect(() => {
    if (currentKpiIndex > Math.max(0, totalKpiCount - 1)) {
      setCurrentKpiIndex(Math.max(0, totalKpiCount - 1));
    }
  }, [totalKpiCount, currentKpiIndex]);

  if (isLoading) {
    return <LoadingState text="Carregando indicadores do time..." />;
  }

  return (
    <KpiGateStep
      persona="mbr-pre"
      version="v3"
      stepId="kpis"
      config={{ requireResolution: true, cardVariant: 'rich-paginated' }}
      data={[]}
      onDataChange={() => { /* noop — buckets é a fonte */ }}
      buckets={buckets}
      justifications={justifications}
      onJustificationChange={handleJustificationChange}
      currentKpiIndex={currentKpiIndex}
      onKpiIndexChange={setCurrentKpiIndex}
      decisions={decisions}
      onDecisionsChange={onDecisionsChange}
      suppressInlineDecisions
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryLabel="Avançar para Projetos"
          primaryDisabled={mandatoryMissing > 0}
        />
      }
    />
  );
}
