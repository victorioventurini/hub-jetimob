/**
 * extractDecisions — utilitário compartilhado para ler decisões de uma
 * `okr_wizard_sessions` row.
 *
 * Decisões podem morar em:
 *   1) coluna `decisions` (JSONB array) — fonte canônica;
 *   2) `reflection_data.data.decisions` — fallback histórico para
 *      sessões antigas que ainda não migraram.
 *
 * Mantém a precedência (1) > (2) e remove duplicatas por `id` quando
 * ambas existirem.
 */
import type { TeamCheckinDecision } from '../types/wizard';

export interface DecisionsSourceRow {
  decisions?: unknown;
  reflection_data?: unknown;
}

export function extractAllDecisions(row: DecisionsSourceRow): TeamCheckinDecision[] {
  const results: TeamCheckinDecision[] = [];

  if (Array.isArray(row.decisions) && row.decisions.length > 0) {
    results.push(...(row.decisions as TeamCheckinDecision[]));
  }

  const rd = row.reflection_data;
  if (rd && typeof rd === 'object') {
    const data = (rd as { data?: unknown }).data;
    if (data && typeof data === 'object' && Array.isArray((data as { decisions?: unknown }).decisions)) {
      const existingIds = new Set(results.map((d) => d.id));
      for (const d of (data as { decisions: TeamCheckinDecision[] }).decisions) {
        if (d && !existingIds.has(d.id)) results.push(d);
      }
    }
  }

  return results;
}
