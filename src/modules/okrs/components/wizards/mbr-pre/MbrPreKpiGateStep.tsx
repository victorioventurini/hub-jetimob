/**
 * MbrPreKpiGateStep — Etapa "Indicadores do Time" do Pré-MBR.
 *
 * v3.32.0: passa a consumir `useMbrPreTeamKpisMonthly(teamId, referenceMonth)`
 * — snapshots **ancorados no mês de referência** — em vez do estado ATUAL
 * (`useKpisForWizardV2`). Isso garante que valores lançados em meses
 * posteriores não contaminem a análise do mês fechado.
 *
 * Buckets são montados via `classifyKpiGateBucketsFromMonthlySnapshots`:
 *   - overdue: sem valor consolidado dentro do mês (ou parcial / no_data)
 *   - critical: ragStatus === 'red' no fim do mês
 *   - attention: ragStatus === 'yellow'
 *   - healthy: ragStatus === 'green'
 *   - guardrailViolated / teamContext: vazios nesta variante mensal
 *
 * UI: continua usando o `KpiGateStep` canônico do framework em modo
 * `cardVariant: 'rich-paginated'`, agnóstico de wizardType.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useMbrPreTeamKpisMonthly } from '@/modules/okrs/hooks/useMbrPreTeamKpisMonthly';
import {
  classifyKpiGateBucketsFromMonthlySnapshots,
  type KpiGateBucket,
  type KpiGateBucketId,
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
  /** Mês fechado analisado pelo rito (YYYY-MM). */
  referenceMonth: string;
  /** Snapshots persistidos no draft (SSOT após reconciliação canônica). */
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

export function MbrPreKpiGateStep({
  teamId,
  referenceMonth,
  kpiSnapshots,
  onKpiSnapshotsChange,
  decisions,
  onDecisionsChange,
  noDataReasons,
  onNoDataReasonChange,
  onContinue,
  onBack,
}: MbrPreKpiGateStepProps) {
  const { snapshots: monthlySnapshots, isLoading } = useMbrPreTeamKpisMonthly(
    teamId,
    referenceMonth,
  );

  const buckets: KpiGateBucket[] = useMemo(
    () => classifyKpiGateBucketsFromMonthlySnapshots(
      monthlySnapshots.map((s) => ({
        kpiId: s.kpiId,
        name: s.name,
        currentValue: s.currentValue,
        previousValue: s.previousValue,
        target: s.target,
        ragStatus: s.ragStatus,
        unit: s.unit ?? null,
        lastValueAt: s.lastValueAt ?? null,
        scope: s.scope ?? null,
        latestInputType: s.latestInputType ?? null,
      })),
    ),
    [monthlySnapshots],
  );

  // Reconcilia snapshots persistidos com snapshots mensais ancorados,
  // preservando `impactAssessment` e `requiresStrategicDecision` do draft.
  const reconciledSnapshots = useMemo<MbrKpiSnapshot[]>(() => {
    const persistedByKpi = new Map(kpiSnapshots.map((s) => [s.kpiId, s]));
    return monthlySnapshots.map((next) => {
      const prev = persistedByKpi.get(next.kpiId);
      return {
        ...next,
        impactAssessment: prev?.impactAssessment,
        requiresStrategicDecision: prev?.requiresStrategicDecision ?? false,
      };
    });
  }, [monthlySnapshots, kpiSnapshots]);

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
          prev.previousValue !== s.previousValue ||
          prev.target !== s.target ||
          prev.ragStatus !== s.ragStatus
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
  const isExplainNoData = !!currentEntry && (
    currentEntry.bucketId === 'overdue' ||
    (currentEntry.bucketId === 'teamContext' && currentEntry.kpi.status === 'unknown')
  );
  const currentJustOk = !currentRequiresPlan
    || (
      (justifications[currentEntry!.kpi.id] ?? '').trim().length > 0
      && (!isExplainNoData || (noDataReasons[currentEntry!.kpi.id] ?? '').trim().length > 0)
    );

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
      config={{ requireResolution: true, cardVariant: 'rich-paginated', splitNoDataReason: true }}
      data={[]}
      onDataChange={() => { /* noop — buckets é a fonte */ }}
      buckets={buckets}
      justifications={justifications}
      onJustificationChange={handleJustificationChange}
      noDataReasons={noDataReasons}
      onNoDataReasonChange={onNoDataReasonChange}
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
