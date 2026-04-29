/**
 * KPI variation helpers — utilitários puros para variações percentuais.
 *
 * Substituem campos antes persistidos em `MbrKpiSnapshot.variationVsLastMonth`
 * e `MbrKpiSnapshot.variationVsTarget` (removidos — ver Onda 1 da refatoração
 * de campos de ritos). As variações agora são derivadas em runtime a partir
 * de `currentValue`, `previousValue` e `target` que permanecem no snapshot.
 *
 * Retornos `null` indicam dados insuficientes para calcular.
 */

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
