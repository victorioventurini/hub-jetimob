/**
 * useMbrV2ObjectiveAnalyses
 *
 * Calcula severidade por objetivo organizacional para o MBR v2.
 *
 * Severidade = combinação de:
 *   - KRs filhos com status efetivo `at_risk` / `stagnant` / `off_track`
 *   - Progresso agregado abaixo da pace esperada
 *   - Itens de Pré-MBR sinalizados como `needsDecision`
 *
 * Retorna a lista pronta para hidratar `MbrV2DraftData.objectiveAnalyses`,
 * já ORDENADA por severidade decrescente (high → medium → low).
 */

import { useMemo } from 'react';
import type { OrgObjectiveWithKrs } from '@/modules/okrs/hooks/queries';
import {
  type MbrV2ObjectiveAnalysis,
  type MbrV2ObjectiveSeverity,
  MBR_V2_TIME_BUDGET_MIN,
} from '@/modules/okrs/types/wizard/mbr-v2';

interface PreSignalSummary {
  /** Quantos times relacionados sinalizaram needsDecision para este objetivo. */
  needsDecisionCount: number;
}

interface UseMbrV2ObjectiveAnalysesArgs {
  objectives: OrgObjectiveWithKrs[] | undefined;
  /** objectiveId → sinais agregados do Pré-MBR (opcional). */
  preSignalsByObjective?: Record<string, PreSignalSummary>;
}

export function useMbrV2ObjectiveAnalyses({
  objectives,
  preSignalsByObjective = {},
}: UseMbrV2ObjectiveAnalysesArgs): MbrV2ObjectiveAnalysis[] {
  return useMemo(() => {
    const list = objectives ?? [];
    const analyses: MbrV2ObjectiveAnalysis[] = list.map((obj) => {
      const drivers: string[] = [];
      let weight = 0;

      const krs = obj.orgKrs ?? [];
      const totalKrs = krs.length;
      let atRiskKrs = 0;
      let offTrackKrs = 0;

      for (const kr of krs) {
        const status = String((kr as any).aggregatedStatus ?? (kr as any).status ?? '');
        if (status === 'at_risk' || status === 'yellow' || status === 'stagnant') {
          atRiskKrs += 1;
          weight += 2;
        } else if (status === 'off_track' || status === 'red') {
          offTrackKrs += 1;
          weight += 3;
        }
      }
      if (atRiskKrs > 0) drivers.push(`${atRiskKrs} KR(s) em atenção`);
      if (offTrackKrs > 0) drivers.push(`${offTrackKrs} KR(s) fora da rota`);

      const aggregatedProgress = Number(obj.aggregatedProgress ?? 0);
      if (aggregatedProgress < 30 && totalKrs > 0) {
        weight += 2;
        drivers.push(`Progresso agregado em ${Math.round(aggregatedProgress)}%`);
      } else if (aggregatedProgress < 60 && totalKrs > 0) {
        weight += 1;
      }

      const preSignals = preSignalsByObjective[obj.id];
      if (preSignals?.needsDecisionCount) {
        weight += preSignals.needsDecisionCount;
        drivers.push(
          `${preSignals.needsDecisionCount} time(s) pediram decisão no Pré-MBR`,
        );
      }

      let severity: MbrV2ObjectiveSeverity = 'low';
      if (weight >= 5) severity = 'high';
      else if (weight >= 2) severity = 'medium';

      return {
        objectiveId: obj.id,
        title: obj.title,
        severity,
        timeBudgetMin: MBR_V2_TIME_BUDGET_MIN[severity],
        drivers,
        discussed: false,
        manualSeverityOverride: null,
      };
    });

    const order: Record<MbrV2ObjectiveSeverity, number> = { high: 0, medium: 1, low: 2 };
    return analyses.sort(
      (a, b) =>
        order[a.manualSeverityOverride ?? a.severity] -
        order[b.manualSeverityOverride ?? b.severity],
    );
  }, [objectives, preSignalsByObjective]);
}
