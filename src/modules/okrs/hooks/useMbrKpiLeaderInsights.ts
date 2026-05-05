/**
 * useMbrKpiLeaderInsights — Deriva, para cada KPI, as respostas dos líderes
 * coletadas no Pré-MBR (justificativa, razão sem dados, planos de ação).
 *
 * Pure-derivation hook: NÃO faz queries. Recebe `mbrPreByTeam` (já carregado
 * por `useMbrPreSubmissions`) e `teamNamesById`, retornando um mapa
 * `kpiId → KpiLeaderInsightEntry[]`.
 *
 * Filtros:
 *   - decisões consideradas: aquelas com `metadata.kpi_id === kpi.id`
 *     (gravadas pelo `KpiGateStep` com `source: 'kpi_gate'`).
 *   - justificativa: `kpiSnapshots[].impactAssessment` (Pré-MBR rich card)
 *     com fallback para `kpiJustifications[kpiId]`.
 *   - razão sem dados: `kpiNoDataReasons[kpiId]`.
 */

import { useMemo } from 'react';
import type { MbrPreTeamSubmission } from '@/modules/okrs/types/wizard';
import type { KpiLeaderInsightEntry } from '@/modules/okrs/components/wizards/shared/KpiLeaderInsightsPanel';

export type MbrKpiLeaderInsightsByKpi = Map<string, KpiLeaderInsightEntry[]>;

export function useMbrKpiLeaderInsights(
  mbrPreByTeam: Record<string, MbrPreTeamSubmission>,
  teamNamesById: Record<string, string>,
): MbrKpiLeaderInsightsByKpi {
  return useMemo(() => {
    const byKpi: MbrKpiLeaderInsightsByKpi = new Map();

    for (const teamId of Object.keys(mbrPreByTeam)) {
      const sub = mbrPreByTeam[teamId];
      if (!sub) continue;
      const teamName = teamNamesById[teamId] ?? sub.teamId;

      // Coleta KPIs mencionados em qualquer um dos campos do Pré-MBR
      const kpiIds = new Set<string>();
      for (const s of sub.kpiSnapshots ?? []) kpiIds.add(s.kpiId);
      for (const id of Object.keys(sub.kpiJustifications ?? {})) kpiIds.add(id);
      for (const id of Object.keys(sub.kpiNoDataReasons ?? {})) kpiIds.add(id);
      for (const d of sub.decisions ?? []) {
        const id = (d.metadata as { kpi_id?: string } | undefined)?.kpi_id;
        if (id) kpiIds.add(id);
      }

      for (const kpiId of kpiIds) {
        const snap = sub.kpiSnapshots?.find((s) => s.kpiId === kpiId);
        const justification =
          snap?.impactAssessment?.trim() ||
          sub.kpiJustifications?.[kpiId]?.trim() ||
          undefined;
        const noDataReason = sub.kpiNoDataReasons?.[kpiId]?.trim() || undefined;
        const decisions = (sub.decisions ?? []).filter((d) => {
          const id = (d.metadata as { kpi_id?: string } | undefined)?.kpi_id;
          return id === kpiId && d.text?.trim().length > 0;
        });

        if (!justification && !noDataReason && decisions.length === 0) continue;

        const entry: KpiLeaderInsightEntry = {
          teamId,
          teamName,
          justification,
          noDataReason,
          decisions,
        };
        const list = byKpi.get(kpiId) ?? [];
        list.push(entry);
        byKpi.set(kpiId, list);
      }
    }

    // Ordena entradas por nome do time (estabilidade visual).
    for (const [kpiId, list] of byKpi) {
      list.sort((a, b) => a.teamName.localeCompare(b.teamName, 'pt-BR'));
      byKpi.set(kpiId, list);
    }

    return byKpi;
  }, [mbrPreByTeam, teamNamesById]);
}
