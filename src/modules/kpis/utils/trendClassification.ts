/**
 * Classificação de tendência de indicadores — orientada à meta.
 *
 * Reutiliza `orientedDeltaPct` (SSOT de variação orientada) para que
 * KPIs com `direction='down'` (ex.: churn, CAC) sejam classificados como
 * "crescimento" quando o valor cai (melhora).
 */
import { orientedDeltaPct } from "@/modules/okrs/utils/kpiVariations";
import type { KpiDirection } from "../types";
import { KPI_TREND_STABLE_BAND_PCT, type KpiTrendFilter } from "../types";

/**
 * Retorna a tendência orientada à meta, ou `null` quando não há dados
 * suficientes para calcular (sem valor anterior, ou anterior = 0).
 */
export function classifyKpiTrend(
  currentValue: number | null | undefined,
  previousValue: number | null | undefined,
  direction: KpiDirection | null | undefined,
  bandPct: number = KPI_TREND_STABLE_BAND_PCT,
): KpiTrendFilter | null {
  if (currentValue == null || previousValue == null) return null;
  if (previousValue === 0) return null;

  const rawDelta = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  const oriented = orientedDeltaPct(rawDelta, direction === "down" ? "down" : "up");
  if (oriented == null) return null;

  const band = Math.abs(bandPct);
  if (Math.abs(oriented) <= band) return "stable";
  return oriented > 0 ? "growth" : "decline";
}
