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
  /** v3.31.1 — kpiId → "Por que está sem dados" (causa). */
  noDataReasons: Record<string, string>;
  onNoDataReasonChange: (kpiId: string, value: string) => void;
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

  // ── Pagination state (1 KPI por página, paridade com MbrPreKrAnalysisStep) ──
  const flat = useMemo(() => flattenBucketsForPagination(buckets), [buckets]);
  const totalKpiCount = flat.length;
  const [currentKpiIndex, setCurrentKpiIndex] = useState(0);
  // Clamp se a lista mudar (re-seed).
  useEffect(() => {
    if (currentKpiIndex > Math.max(0, totalKpiCount - 1)) {
      setCurrentKpiIndex(Math.max(0, totalKpiCount - 1));
    }
  }, [totalKpiCount, currentKpiIndex]);

  // ── Gate por página: KPI atual obrigatório precisa de plano ──
  // Regras canônicas (mem://features/kpis/kpis-master-standard §4):
  //   1. Buckets MANDATORY (overdue / critical / guardrailViolated)
  //   2. teamContext em status red OU unknown (sem dados)
  //   3. KPI sem meta cadastrada (target == null) — independente do bucket
  const currentEntry = totalKpiCount > 0 ? flat[Math.min(currentKpiIndex, totalKpiCount - 1)] : null;
  const kpiHasNoTarget = !!currentEntry && (
    currentEntry.kpi.target == null || (currentEntry.kpi.target as unknown as string) === ''
  );
  const currentRequiresPlan = !!currentEntry && (
    MANDATORY_BUCKETS.has(currentEntry.bucketId) ||
    (currentEntry.bucketId === 'teamContext' && (currentEntry.kpi.status === 'red' || currentEntry.kpi.status === 'unknown')) ||
    kpiHasNoTarget
  );
  const currentJustOk = !currentRequiresPlan
    || (justifications[currentEntry!.kpi.id] ?? '').trim().length > 0;

  const isFirst = currentKpiIndex === 0;
  const isLast = totalKpiCount === 0 || currentKpiIndex >= totalKpiCount - 1;

  const handlePrimary = useCallback(() => {
    if (!currentJustOk) return;
    if (isLast) onContinue();
    else setCurrentKpiIndex((i) => Math.min(totalKpiCount - 1, i + 1));
  }, [currentJustOk, isLast, onContinue, totalKpiCount]);

  const handleBack = useCallback(() => {
    if (isFirst) onBack();
    else setCurrentKpiIndex((i) => Math.max(0, i - 1));
  }, [isFirst, onBack]);

  // Atalho Ctrl/Cmd+Enter — paridade com MbrPreKrAnalysisStep
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && currentJustOk) {
        handlePrimary();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePrimary, currentJustOk]);

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
          showBack
          onBack={handleBack}
          backLabel={isFirst ? 'Voltar' : 'Anterior'}
          primaryLabel={isLast ? 'Avançar para Projetos' : 'Próximo'}
          onPrimary={handlePrimary}
          primaryDisabled={!currentJustOk}
        />
      }
    />
  );
}
