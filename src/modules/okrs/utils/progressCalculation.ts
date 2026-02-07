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
 * 
 * REGRA CANÔNICA DE RITMO (v2.87.0):
 * - Progresso deve ser avaliado em relação ao tempo transcorrido do ciclo
 * - KPIs NÃO possuem ciclo próprio; herdam o ciclo da KR vinculada
 * - Metas de longo prazo devem ser interpretadas proporcionalmente
 * - Classificação: "acima/dentro/abaixo do ritmo esperado"
 * 
 * @see docs/guides/PROGRESS_INTERPRETATION_CANON.md
 */

import type { OkrDirection } from '../types';

// ============================================================
// TYPES
// ============================================================

export type PaceStatus = 
  | 'above_pace'      // Acima do ritmo esperado
  | 'on_pace'         // Dentro do ritmo esperado
  | 'below_pace'      // Abaixo do ritmo esperado
  | 'not_started'     // Não iniciado
  | 'completed';      // Meta atingida/superada

export interface PaceAnalysis {
  status: PaceStatus;
  label: string;
  expectedProgress: number;
  actualProgress: number;
  gap: number;
  cycleElapsed: number;
  interpretation: string;
}

export interface CycleContext {
  startDate: Date;
  endDate: Date;
  type: 'month' | 'quarter' | 'semester' | 'year';
  name?: string;
}

// ============================================================
// PACE CALCULATION (CANONICAL)
// ============================================================

/**
 * Calcula o progresso esperado baseado no tempo transcorrido do ciclo.
 * 
 * @example
 * // Ciclo trimestral, 45 dias transcorridos de 90 → 50% esperado
 * calculateExpectedProgress({ startDate: jan1, endDate: mar31 }, feb15)
 */
export function calculateExpectedProgress(
  cycle: CycleContext,
  referenceDate: Date = new Date()
): number {
  const start = cycle.startDate.getTime();
  const end = cycle.endDate.getTime();
  const now = referenceDate.getTime();
  
  // Antes do início do ciclo
  if (now < start) return 0;
  
  // Após o fim do ciclo
  if (now > end) return 100;
  
  const totalDuration = end - start;
  const elapsed = now - start;
  
  return Math.round((elapsed / totalDuration) * 100);
}

/**
 * Calcula a porcentagem do ciclo já transcorrida.
 */
export function calculateCycleElapsed(
  cycle: CycleContext,
  referenceDate: Date = new Date()
): number {
  return calculateExpectedProgress(cycle, referenceDate);
}

/**
 * REGRA CANÔNICA: Analisa o ritmo de progresso considerando o ciclo.
 * 
 * Esta é a função central para interpretação estratégica de progresso.
 * Todas as análises do Hub (e-mails, wizards, dashboards, agentes IA)
 * DEVEM usar esta função para consistência.
 * 
 * @example
 * const analysis = analyzePace({
 *   actualProgress: 25,
 *   cycle: { startDate, endDate, type: 'quarter' },
 * });
 * // Se o ciclo está 50% transcorrido e progresso é 25%:
 * // → status: 'below_pace'
 * // → interpretation: 'Abaixo do ritmo esperado para este ponto do ciclo trimestral'
 */
export function analyzePace(params: {
  actualProgress: number;
  cycle: CycleContext;
  referenceDate?: Date;
  tolerancePercent?: number; // Margem de tolerância (default: 10%)
}): PaceAnalysis {
  const { 
    actualProgress, 
    cycle, 
    referenceDate = new Date(),
    tolerancePercent = 10 
  } = params;
  
  const expectedProgress = calculateExpectedProgress(cycle, referenceDate);
  const cycleElapsed = calculateCycleElapsed(cycle, referenceDate);
  const gap = actualProgress - expectedProgress;
  
  // Labels por tipo de ciclo
  const cycleLabels: Record<CycleContext['type'], string> = {
    month: 'mensal',
    quarter: 'trimestral',
    semester: 'semestral',
    year: 'anual',
  };
  const cycleLabel = cycleLabels[cycle.type];
  
  // Meta já atingida
  if (actualProgress >= 100) {
    return {
      status: 'completed',
      label: 'Meta atingida',
      expectedProgress,
      actualProgress,
      gap,
      cycleElapsed,
      interpretation: `Meta do ciclo ${cycleLabel} já foi atingida.`,
    };
  }
  
  // Não iniciado
  if (actualProgress === 0 && cycleElapsed > 10) {
    return {
      status: 'not_started',
      label: 'Não iniciado',
      expectedProgress,
      actualProgress,
      gap,
      cycleElapsed,
      interpretation: `KR ainda não iniciou, com ${cycleElapsed}% do ciclo ${cycleLabel} transcorrido.`,
    };
  }
  
  // Início do ciclo (primeiros 15%) - não fazer julgamentos precipitados
  if (cycleElapsed <= 15) {
    return {
      status: 'on_pace',
      label: 'Início do ciclo',
      expectedProgress,
      actualProgress,
      gap,
      cycleElapsed,
      interpretation: `Ciclo ${cycleLabel} ainda no início. Progresso atual: ${actualProgress}%.`,
    };
  }
  
  // Análise de ritmo com tolerância
  if (gap >= tolerancePercent) {
    return {
      status: 'above_pace',
      label: 'Acima do ritmo',
      expectedProgress,
      actualProgress,
      gap,
      cycleElapsed,
      interpretation: `Acima do ritmo esperado para este ponto do ciclo ${cycleLabel} (+${gap.toFixed(0)}%).`,
    };
  }
  
  if (gap <= -tolerancePercent) {
    return {
      status: 'below_pace',
      label: 'Abaixo do ritmo',
      expectedProgress,
      actualProgress,
      gap,
      cycleElapsed,
      interpretation: `Abaixo do ritmo esperado para este ponto do ciclo ${cycleLabel} (${gap.toFixed(0)}%).`,
    };
  }
  
  return {
    status: 'on_pace',
    label: 'Dentro do ritmo',
    expectedProgress,
    actualProgress,
    gap,
    cycleElapsed,
    interpretation: `Dentro do ritmo esperado para o ciclo ${cycleLabel}.`,
  };
}

/**
 * Gera interpretação textual para uso em e-mails e relatórios.
 * Segue a regra canônica: linguagem de ritmo, não de atraso.
 */
export function getPaceInterpretationText(analysis: PaceAnalysis): string {
  const { status, actualProgress, expectedProgress, cycleElapsed } = analysis;
  
  switch (status) {
    case 'completed':
      return `✓ Meta atingida (${actualProgress}%)`;
    case 'above_pace':
      return `↑ ${actualProgress}% — acima do ritmo esperado (${expectedProgress}% era o esperado)`;
    case 'on_pace':
      return `→ ${actualProgress}% — dentro do ritmo esperado`;
    case 'below_pace':
      return `↓ ${actualProgress}% — abaixo do ritmo (esperado: ${expectedProgress}% neste ponto)`;
    case 'not_started':
      return `○ Não iniciado (${cycleElapsed}% do ciclo transcorrido)`;
    default:
      return `${actualProgress}%`;
  }
}

// ============================================================
// PROGRESS CALCULATION (ORIGINAL)
// ============================================================

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
