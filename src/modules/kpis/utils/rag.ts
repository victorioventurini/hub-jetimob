/**
 * KPI RAG calculation — SSOT client-side.
 *
 * Espelha exatamente a função SQL canônica `kpi_calculate_rag(value, target, direction)`
 * (definida em `public.kpi_calculate_rag`). Qualquer mudança de thresholds ou fórmula
 * DEVE ser feita em conjunto na função SQL e aqui.
 *
 * Regras (idênticas ao banco):
 * - `value` ou `target` nulos / iguais a 0 → `no_data` (sem base para avaliar).
 * - `direction = 'up'` (maior = melhor):  pct = (value / target) * 100.
 * - `direction = 'down'` (menor = melhor): pct = (target / value) * 100.
 * - pct ≥ 90 → `on_track`; pct ≥ 70 → `at_risk`; senão → `off_track`.
 *
 * Consumo: usado por ritos (CollaboratorKpiStep etc.) para estimar o RAG do
 * valor que o usuário está digitando ANTES do save, mantendo o gating de
 * "notes obrigatórias quando RAG ≠ on_track" (TCR §KPI Values, linha 843).
 */
import type { KpiDirection, KpiRagStatus } from '../types';

export function calculateKpiRag(
  value: number | null | undefined,
  target: number | null | undefined,
  direction: KpiDirection,
): KpiRagStatus {
  if (value == null || target == null || value === 0 || target === 0) {
    return 'no_data';
  }

  const pct = direction === 'up' ? (value / target) * 100 : (target / value) * 100;

  if (pct >= 90) return 'on_track';
  if (pct >= 70) return 'at_risk';
  return 'off_track';
}
