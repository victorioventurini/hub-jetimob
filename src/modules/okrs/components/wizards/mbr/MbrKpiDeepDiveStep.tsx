/**
 * MbrKpiDeepDiveStep — Etapa "Indicadores fora da meta" (MBR Executivo).
 *
 * Apresenta UM KPI por página (mesma UI rich-paginated do Pré-MBR), filtrando
 * para KPIs em alerta (`red`/`amber`/sem dados). Cada página exibe abaixo do
 * card o painel `KpiLeaderInsightsPanel`, consolidando o que cada líder
 * registrou no Pré-MBR (justificativa, razão sem dados, planos de ação).
 *
 * Modo somente-leitura — não permite editar justificativas; é um espelho dos
 * inputs do Pré-MBR para fundamentar a discussão executiva.
 */

import { useEffect, useMemo, useCallback } from 'react';
import { useWizardSubStep } from '@/modules/okrs/hooks/useWizardSubStep';
import { KpiGateStep, flattenBucketsForPagination } from '@/wizards-framework';
import { WizardStepFooter } from '@/modules/okrs/components/wizards/shared';
import {
  KpiLeaderInsightsPanel,
} from '@/modules/okrs/components/wizards/shared/KpiLeaderInsightsPanel';
import { MbrKpiGateTable } from './MbrKpiGateTable';
import { previousMonthOf } from '@/modules/okrs/utils/mbr/referenceMonth';
import {
  useMbrMonthlyKpisByScope,
  type MbrMonthlyKpiSnapshot,
} from '@/modules/okrs/hooks/useMbrMonthlyKpisByScope';
import {
  classifyKpiGateBucketsFromMonthlySnapshots,
  type KpiGateBucket,
} from '@/modules/okrs/components/wizards/shared/framework/config/stepContentAdapters';
import { useMbrKpiLeaderInsights } from '@/modules/okrs/hooks/useMbrKpiLeaderInsights';
import { useOrgKrPrimaryKpiIds } from '@/modules/okrs/hooks/useOrgKrPrimaryKpiIds';
import { formatMonthLabel } from '@/modules/okrs/utils/mbr/referenceMonth';
import type {
  MbrKpiSnapshot,
  TeamCheckinDecision,
  MbrPreTeamSubmission,
} from '@/modules/okrs/types/wizard';

export interface MbrKpiDeepDiveStepProps {
  kpiSnapshots: MbrKpiSnapshot[];
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  referenceMonth: string;
  mbrPreByTeam: Record<string, MbrPreTeamSubmission>;
  teamNamesById: Record<string, string>;
  onContinue: () => void;
  onBack: () => void;
}

export function MbrKpiDeepDiveStep({
  kpiSnapshots,
  decisions,
  onDecisionsChange,
  referenceMonth,
  mbrPreByTeam,
  teamNamesById,
  onContinue,
  onBack,
}: MbrKpiDeepDiveStepProps) {
  // KPIs fora da meta: red/off_track, amber/yellow/at_risk e "sem dados".
  // Aceita tanto a nomenclatura RAG (red/yellow) quanto a operacional
  // (off_track/at_risk) para garantir paridade com o que o Pré-MBR registra.
  const offTargetSnapshots = useMemo(
    () => {
      const OFF_TARGET = new Set([
        'red',
        'yellow',
        'amber',
        'no_data',
        'off_track',
        'at_risk',
      ]);
      return kpiSnapshots.filter((k) => OFF_TARGET.has(k.ragStatus));
    },
    [kpiSnapshots],
  );

  const buckets: KpiGateBucket[] = useMemo(
    () =>
      classifyKpiGateBucketsFromMonthlySnapshots(
        offTargetSnapshots.map((s) => ({
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
          areaName: s.areaName ?? null,
          areaColor: s.areaColor ?? null,
          teamName: s.teamName ?? null,
        })),
      ),
    [offTargetSnapshots],
  );

  const insightsByKpi = useMbrKpiLeaderInsights(mbrPreByTeam, teamNamesById);

  // v3.x — valores reais do mês de referência e do mês anterior, derivados
  // direto de kpi_values (mesma fonte do KPI Gate). Evita usar o snapshot
  // congelado do draft, que só preenche `currentValue` e zera `previousValue`.
  const { snapshots: monthlySnapshots } = useMbrMonthlyKpisByScope(
    referenceMonth,
    ['org', 'area', 'team'],
  );
  const monthlyByKpi = useMemo(() => {
    const map = new Map<string, MbrMonthlyKpiSnapshot>();
    for (const s of monthlySnapshots) map.set(s.kpiId, s);
    return map;
  }, [monthlySnapshots]);

  const flat = useMemo(() => flattenBucketsForPagination(buckets), [buckets]);
  const totalCount = flat.length;

  // Sub-step na URL: ?substep=<kpiId>. Permite saber exatamente qual KPI
  // estava ativo quando uma nota/decisão foi registrada.
  const [activeKpiId, setActiveKpiId] = useWizardSubStep<string | null>({
    currentStep: 'kpi-deep-dive',
    ownerStep: 'kpi-deep-dive',
    defaultValue: null,
    serialize: (v) => v ?? '',
    deserialize: (raw) => (raw && raw.length > 0 ? raw : null),
  });

  const currentKpiIndex = useMemo(() => {
    if (!activeKpiId) return 0;
    const idx = flat.findIndex((f) => f.kpi.id === activeKpiId);
    return idx >= 0 ? idx : 0;
  }, [activeKpiId, flat]);

  const setCurrentKpiIndex = useCallback(
    (next: number | ((prev: number) => number)) => {
      const resolved = typeof next === 'function' ? (next as (p: number) => number)(currentKpiIndex) : next;
      const clamped = Math.max(0, Math.min(totalCount - 1, resolved));
      const id = flat[clamped]?.kpi.id ?? null;
      setActiveKpiId(id);
    },
    [currentKpiIndex, totalCount, flat, setActiveKpiId],
  );

  useEffect(() => {
    if (totalCount === 0) return;
    if (currentKpiIndex > totalCount - 1) {
      setCurrentKpiIndex(Math.max(0, totalCount - 1));
    }
  }, [totalCount, currentKpiIndex, setCurrentKpiIndex]);

  // Justificativas (read-only) — preferem `impactAssessment` do snapshot do
  // próprio MBR; quando ausente, caem no que o líder respondeu no Pré-MBR
  // (`impactAssessment` por time ou `kpiJustifications[kpiId]`).
  const justifications = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of offTargetSnapshots) {
      if (s.impactAssessment) {
        map[s.kpiId] = s.impactAssessment;
        continue;
      }
      // Fallback: agrega o que algum líder escreveu no Pré-MBR.
      const fromPre: string[] = [];
      for (const sub of Object.values(mbrPreByTeam)) {
        const snap = sub.kpiSnapshots?.find((x) => x.kpiId === s.kpiId);
        const txt =
          snap?.impactAssessment?.trim() ||
          sub.kpiJustifications?.[s.kpiId]?.trim();
        if (txt) {
          const teamName = teamNamesById[sub.teamId] ?? 'Time';
          fromPre.push(`[${teamName}] ${txt}`);
        }
      }
      if (fromPre.length > 0) map[s.kpiId] = fromPre.join('\n\n');
    }
    return map;
  }, [offTargetSnapshots, mbrPreByTeam, teamNamesById]);

  const isFirst = currentKpiIndex === 0;
  const isLast = totalCount === 0 || currentKpiIndex >= totalCount - 1;

  const handlePrimary = useCallback(() => {
    if (isLast) onContinue();
    else setCurrentKpiIndex((i) => Math.min(totalCount - 1, i + 1));
  }, [isLast, onContinue, totalCount, setCurrentKpiIndex]);

  const handleBack = useCallback(() => {
    if (isFirst) onBack();
    else setCurrentKpiIndex((i) => Math.max(0, i - 1));
  }, [isFirst, onBack, setCurrentKpiIndex]);

  return (
    <KpiGateStep
      persona="mbr"
      version="v4"
      stepId="kpi-deep-dive"
      config={{ requireResolution: false, cardVariant: 'rich-paginated' }}
      data={[]}
      onDataChange={() => { /* noop */ }}
      buckets={buckets}
      justifications={justifications}
      readOnlyJustification
      hideLeaderActionBlock
      currentKpiIndex={currentKpiIndex}
      onKpiIndexChange={setCurrentKpiIndex}
      decisions={decisions}
      onDecisionsChange={onDecisionsChange}
      
      extraContentForCurrentKpi={(kpi) => {
        const monthly = monthlyByKpi.get(kpi.id) ?? null;
        const snap = offTargetSnapshots.find((s) => s.kpiId === kpi.id);
        const tableSnap: MbrMonthlyKpiSnapshot | null = monthly
          ?? (snap
            ? {
                ...snap,
                areaId: snap.areaId ?? null,
                areaName: snap.areaName ?? null,
                areaColor: snap.areaColor ?? null,
                teamName: snap.teamName ?? null,
                indicatorType: null,
                owner: null,
              }
            : null);
        return (
          <>
            {tableSnap && (
              <MbrKpiGateTable
                snapshots={[tableSnap]}
                monthLabel={formatMonthLabel(referenceMonth)}
                previousMonthLabel={formatMonthLabel(previousMonthOf(referenceMonth))}
              />
            )}
            <KpiLeaderInsightsPanel
              kpiId={kpi.id}
              entriesByTeam={insightsByKpi.get(kpi.id) ?? []}
              referenceMonth={formatMonthLabel(referenceMonth)}
            />
          </>
        );
      }}
      footer={
        <WizardStepFooter
          showBack
          onBack={handleBack}
          backLabel={isFirst ? 'Voltar' : 'Anterior'}
          primaryLabel={isLast ? 'Avançar para Times' : 'Próximo'}
          onPrimary={handlePrimary}
        />
      }
    />
  );
}
