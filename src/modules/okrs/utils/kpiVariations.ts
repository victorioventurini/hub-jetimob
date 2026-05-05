/**
 * KPI variation helpers — utilitários puros para variações percentuais
 * com consciência da DIREÇÃO da meta (canônico).
 *
 * Substituem campos antes persistidos em `MbrKpiSnapshot.variationVsLastMonth`
 * e `MbrKpiSnapshot.variationVsTarget`. As variações agora são derivadas em
 * runtime a partir de `currentValue`, `previousValue` e `target`.
 *
 * Direção:
 * - `up` → maior é melhor (default seguro)
 * - `down` → menor é melhor (ex.: CAC, churn)
 * - `maintain` / `null` / `undefined` → tratado como `up` para coloração;
 *   classificação retorna `flat` se delta = 0.
 *
 * Retornos `null` indicam dados insuficientes para calcular.
 */

export type KpiDirection = 'up' | 'down' | 'maintain' | null | undefined;

export function variationVsLast(
  currentValue: number | null | undefined,
  previousValue: number | null | undefined,
): number | null {
  if (currentValue == null || previousValue == null) return null;
  if (previousValue === 0) return null;
  return ((currentValue - previousValue) / previousValue) * 100;
}

export function variationVsTarget(
  currentValue: number | null | undefined,
  target: number | null | undefined,
): number | null {
  if (currentValue == null || target == null) return null;
  if (target === 0) return null;
  return ((currentValue - target) / target) * 100;
}

/**
 * Retorna o delta com SINAL ORIENTADO pela direção da KPI.
 * Positivo = movimento bom; negativo = movimento ruim.
 *
 * Para `direction='down'`, inverte o sinal do delta bruto. Para `up`,
 * `maintain`, `null` ou `undefined`, mantém o sinal original.
 */
export function orientedDeltaPct(
  deltaPct: number | null,
  direction: KpiDirection,
): number | null {
  if (deltaPct == null) return null;
  if (direction === 'down') return -deltaPct;
  return deltaPct;
}

/**
 * Classifica um delta percentual em improvement / regression / flat.
 * Retorna `null` quando o delta é desconhecido.
 */
export function classifyKpiDelta(
  deltaPct: number | null,
  direction: KpiDirection,
): 'improvement' | 'regression' | 'flat' | null {
  const oriented = orientedDeltaPct(deltaPct, direction);
  if (oriented == null) return null;
  if (oriented > 0) return 'improvement';
  if (oriented < 0) return 'regression';
  return 'flat';
}

/**
 * `true` se o movimento foi favorável à meta, `false` se desfavorável,
 * `null` quando indefinido (sem delta).
 */
export function isKpiImprovement(
  deltaPct: number | null,
  direction: KpiDirection,
): boolean | null {
  const klass = classifyKpiDelta(deltaPct, direction);
  if (klass == null) return null;
  return klass === 'improvement';
}
