/**
 * Classificação de tendência de indicadores — orientada à meta.
 *
 * v3.x — A tendência passa a ser calculada sobre a SÉRIE de valores
 * CONSOLIDADOS de uma janela de tempo (3/6/12 meses), via regressão
 * linear simples, em vez de comparar apenas os 2 últimos lançamentos.
 *
 * Reutiliza `orientedDeltaPct` (SSOT de variação orientada) para que
 * KPIs com `direction='down'` (ex.: churn, CAC) sejam classificados como
 * "crescimento" quando o valor cai (melhora).
 */
import { orientedDeltaPct } from "@/modules/okrs/utils/kpiVariations";
import type { KpiDirection } from "../types";
import { KPI_TREND_STABLE_BAND_PCT, type KpiTrendFilter } from "../types";

/** Ponto de série usado no cálculo de tendência. */
export interface KpiTrendPoint {
  value: number;
  reference_date: string;
}

export interface KpiTrendResult {
  trend: KpiTrendFilter;
  /** Variação orientada à meta ao longo da janela, em %. */
  orientedPct: number;
  /** Quantidade de consolidados usados. */
  points: number;
  firstDate: string;
  lastDate: string;
}

export interface ClassifyKpiTrendSeriesOptions {
  bandPct?: number;
  /** Mínimo de pontos para usar regressão. Abaixo disso usa comparativo simples. */
  minPoints?: number;
}

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
  return classifyOriented(rawDelta, direction, bandPct);
}

function classifyOriented(
  rawDeltaPct: number,
  direction: KpiDirection | null | undefined,
  bandPct: number,
): KpiTrendFilter | null {
  const oriented = orientedDeltaPct(rawDeltaPct, direction === "down" ? "down" : "up");
  if (oriented == null) return null;

  const band = Math.abs(bandPct);
  if (Math.abs(oriented) <= band) return "stable";
  return oriented > 0 ? "growth" : "decline";
}

/**
 * Classifica a tendência a partir de uma série de valores consolidados.
 *
 * - Ordena por `reference_date` (ascendente).
 * - Com >= `minPoints` pontos: regressão linear simples; a inclinação total
 *   da reta ao longo da janela é normalizada em % sobre a média do período.
 * - Com 2 pontos: comparativo simples entre primeiro e último.
 * - Com < 2 pontos: `null` (dados insuficientes).
 */
export function classifyKpiTrendSeries(
  series: KpiTrendPoint[] | null | undefined,
  direction: KpiDirection | null | undefined,
  options: ClassifyKpiTrendSeriesOptions = {},
): KpiTrendResult | null {
  const bandPct = options.bandPct ?? KPI_TREND_STABLE_BAND_PCT;
  const minPoints = options.minPoints ?? 3;

  const points = (series ?? [])
    .filter((p) => p && typeof p.value === "number" && Number.isFinite(p.value))
    .slice()
    .sort((a, b) => a.reference_date.localeCompare(b.reference_date));

  if (points.length < 2) return null;

  const n = points.length;
  const first = points[0];
  const last = points[n - 1];

  let rawDeltaPct: number;

  if (n >= minPoints) {
    // Regressão linear simples: y = a + b*x (x = índice temporal 0..n-1)
    const meanX = (n - 1) / 2;
    const meanY = points.reduce((acc, p) => acc + p.value, 0) / n;
    let num = 0;
    let den = 0;
    points.forEach((p, i) => {
      num += (i - meanX) * (p.value - meanY);
      den += (i - meanX) ** 2;
    });
    if (den === 0 || meanY === 0) return null;
    const slope = num / den; // variação por período
    const totalChange = slope * (n - 1); // variação acumulada na janela
    rawDeltaPct = (totalChange / Math.abs(meanY)) * 100;
  } else {
    if (first.value === 0) return null;
    rawDeltaPct = ((last.value - first.value) / Math.abs(first.value)) * 100;
  }

  const trend = classifyOriented(rawDeltaPct, direction, bandPct);
  if (trend == null) return null;

  const oriented = orientedDeltaPct(rawDeltaPct, direction === "down" ? "down" : "up") ?? 0;

  return {
    trend,
    orientedPct: oriented,
    points: n,
    firstDate: first.reference_date,
    lastDate: last.reference_date,
  };
}
