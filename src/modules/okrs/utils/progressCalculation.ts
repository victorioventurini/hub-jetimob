/**
 * Progress Calculation Utilities for OKRs
 * 
 * FONTE DE VERDADE para cálculo de progresso de Key Results.
 * 
 * REGRAS OBRIGATÓRIAS:
 * 1. Se baseline ≠ meta: (resultado - baseline) / (meta - baseline) × 100
 * 2. Se baseline = meta (KR de manutenção): binário 0% ou 100%
 * 3. Direção 'down' inverte a lógica para KRs de redução
 * 4. NUNCA calcular como resultado/meta quando houver baseline
 */

import type { OkrDirection } from '../types';

/**
 * Calcula o progresso de uma KR considerando baseline, resultado atual e meta.
 * 
 * FÓRMULA: Progresso = (Resultado atual − Baseline) / (Meta − Baseline) × 100
 * 
 * @example
 * // Crescimento: Baseline 150, Meta 300, Resultado 250 → 66.67%
 * calculateProgress(150, 250, 300, 'up')
 * 
 * // Redução: Baseline 50, Meta 15, Resultado 25 → 71.43%
 * calculateProgress(50, 25, 15, 'down')
 * 
 * // Baseline zero: Baseline 0, Meta 50, Resultado 45 → 90%
 * calculateProgress(0, 45, 50, 'up')
 * 
 * // Manutenção (binário): Baseline 75, Meta 75, Resultado 70 → 0%
 * calculateProgress(75, 70, 75, 'up')
 */
export function calculateProgress(
  baseline: number,
  current: number,
  target: number,
  direction: OkrDirection
): number {
  // Direção 'maintain': tratado explicitamente como binário
  // - Se current >= target: 100%
  // - Se current < target: 0%
  if (direction === 'maintain') {
    return current >= target ? 100 : 0;
  }

  if (direction === 'up') {
    // KR de manutenção implícita (baseline = meta): tratamento binário (compatibilidade)
    if (target === baseline) {
      return current >= target ? 100 : 0;
    }
    // Fórmula padrão: (resultado - baseline) / (meta - baseline) × 100
    // Não limitar a 100% para permitir exibição de superação de metas
    const progress = ((current - baseline) / (target - baseline)) * 100;
    return Math.max(0, progress);
  } else {
    // KR de manutenção para redução
    if (baseline === target) {
      return current <= target ? 100 : 0;
    }
    // Fórmula para redução: (baseline - resultado) / (baseline - meta) × 100
    // Não limitar a 100% para permitir exibição de superação de metas
    const progress = ((baseline - current) / (baseline - target)) * 100;
    return Math.max(0, progress);
  }
}

/**
 * Calcula progresso agregado de múltiplas KRs (média simples)
 */
export function calculateAggregatedProgress(
  krs: Array<{
    baseline: number;
    current_value: number;
    target: number;
    direction: OkrDirection;
  }>
): number {
  if (!krs || krs.length === 0) return 0;
  
  const total = krs.reduce((acc, kr) => {
    return acc + calculateProgress(
      Number(kr.baseline) || 0,
      Number(kr.current_value) || 0,
      Number(kr.target) || 0,
      kr.direction || 'up'
    );
  }, 0);
  
  return total / krs.length;
}

/**
 * Calcula progresso com valores opcionais/nullable (para uso com dados do banco)
 */
export function calculateProgressFromNullable(
  baseline: number | string | null | undefined,
  current: number | string | null | undefined,
  target: number | string | null | undefined,
  direction: string | null | undefined
): number {
  return calculateProgress(
    Number(baseline) || 0,
    Number(current) || 0,
    Number(target) || 0,
    (direction as OkrDirection) || 'up'
  );
}
