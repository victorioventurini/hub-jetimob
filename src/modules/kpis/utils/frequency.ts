// ============================================================
// KPI Frequency utilities — v3.0.0
// SSOT para conversão, validação e cálculo de períodos de
// consolidação. Espelha a semântica do banco
// (kpi_calculate_period_v2) — manter ambos sincronizados.
// ============================================================

import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  addDays,
  differenceInDays,
  format,
  getMonth,
  getYear,
  setMonth,
  setDate,
} from 'date-fns';
import type {
  KpiFrequency,
  KpiFrequencyValue,
  KpiInputType,
  KpiMetric,
} from '../types';

// === Constantes ===

/** Dias correspondentes a cada cadência (ordenados ascendentemente). */
export const FREQUENCY_DAYS: Record<KpiFrequencyValue, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  semiannual: 180,
  annual: 365,
};

/**
 * Janela máxima (em dias) para considerar um KPI "atrasado" em
 * relação à sua `update_frequency`. Hoje é igual a FREQUENCY_DAYS,
 * mas mantido separado para futura calibração (ex: tolerância +1 dia).
 */
export const UPDATE_OVERDUE_THRESHOLDS: Record<KpiFrequencyValue, number> = {
  ...FREQUENCY_DAYS,
};

/** Ordem canônica (mais frequente → menos frequente). */
export const FREQUENCY_ORDER: KpiFrequencyValue[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'semiannual',
  'annual',
];

// === Mapeamento legado ===

/**
 * Converte o enum legado `KpiFrequency` para `KpiFrequencyValue`.
 * Retorna `null` para `'manual'` — KPIs manuais ficam fora dos
 * ritos até serem revisados (Fase 9 banner).
 *
 * @deprecated v3.0.0 — uso interno apenas (suggestInputType e migrações).
 *   Novos consumidores devem ler `consolidation_frequency`/`update_frequency`
 *   diretamente. Será removido na Fase 4 do KPI sunset plan.
 */
export function legacyFrequencyToValue(
  legacy: KpiFrequency | null | undefined,
): KpiFrequencyValue | null {
  if (!legacy || legacy === 'manual') return null;
  switch (legacy) {
    case 'daily':
      return 'daily';
    case 'weekly':
      return 'weekly';
    case 'monthly':
      return 'monthly';
    case 'quarterly':
      return 'quarterly';
    default:
      return null;
  }
}

/**
 * Inverso de `legacyFrequencyToValue`. Converte `KpiFrequencyValue` (v3) para
 * o enum legado `KpiFrequency` (v2) reduzindo cadências adicionais ao bucket
 * mais próximo, para manter retrocompatibilidade do shape público de KpiMetric.
 *
 * - `biweekly` → `weekly`
 * - `semiannual`/`annual` → `quarterly`
 * - demais valores são mantidos.
 */
export function valueFrequencyToLegacy(
  value: KpiFrequencyValue | null | undefined,
): KpiFrequency {
  switch (value) {
    case 'daily':
      return 'daily';
    case 'weekly':
    case 'biweekly':
      return 'weekly';
    case 'monthly':
      return 'monthly';
    case 'quarterly':
    case 'semiannual':
    case 'annual':
      return 'quarterly';
    default:
      return 'monthly';
  }
}

/**
 * `update_frequency` não pode ser MENOS frequente que
 * `consolidation_frequency`. Espelha o trigger DB
 * `validate_kpi_frequency_relationship`.
 */
export function isUpdateFrequencyValid(
  consolidation: KpiFrequencyValue | null | undefined,
  update: KpiFrequencyValue | null | undefined,
): boolean {
  if (!consolidation || !update) return true;
  return FREQUENCY_DAYS[update] <= FREQUENCY_DAYS[consolidation];
}

/** Lista as `update_frequency` válidas dado um `consolidation_frequency`. */
export function getValidUpdateFrequencies(
  consolidation: KpiFrequencyValue | null | undefined,
): KpiFrequencyValue[] {
  if (!consolidation) return [...FREQUENCY_ORDER];
  const limit = FREQUENCY_DAYS[consolidation];
  return FREQUENCY_ORDER.filter((f) => FREQUENCY_DAYS[f] <= limit);
}

// === Período de consolidação ===

export interface ConsolidationPeriod {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Calcula o período de consolidação para uma data e cadência.
 * MUST espelhar a semântica de `kpi_calculate_period_v2` (Fase 1.5):
 *   - daily      → dia
 *   - weekly     → segunda-domingo (ISO)
 *   - biweekly   → janela de 14 dias ancorada na primeira segunda-feira do ano
 *   - monthly    → mês calendário
 *   - quarterly  → Q1/Q2/Q3/Q4 calendário
 *   - semiannual → H1 (jan-jun) / H2 (jul-dez)
 *   - annual     → ano calendário
 */
export function getConsolidationPeriod(
  freq: KpiFrequencyValue,
  date: Date,
): ConsolidationPeriod {
  switch (freq) {
    case 'daily': {
      const start = startOfDay(date);
      return {
        start,
        end: endOfDay(date),
        label: format(start, 'yyyy-MM-dd'),
      };
    }
    case 'weekly': {
      // ISO: segunda como início da semana
      const start = startOfWeek(date, { weekStartsOn: 1 });
      const end = endOfWeek(date, { weekStartsOn: 1 });
      return {
        start,
        end,
        label: `${format(start, 'yyyy-MM-dd')}/${format(end, 'yyyy-MM-dd')}`,
      };
    }
    case 'biweekly': {
      // Âncora: primeira segunda-feira do ano da data fornecida
      const yearStart = startOfYear(date);
      const firstMonday = startOfWeek(yearStart, { weekStartsOn: 1 });
      // Se a primeira segunda for em dezembro do ano anterior, avança
      const anchor =
        getYear(firstMonday) < getYear(date)
          ? addDays(firstMonday, 7)
          : firstMonday;
      const daysSinceAnchor = differenceInDays(startOfDay(date), anchor);
      const periodIndex = Math.floor(daysSinceAnchor / 14);
      const start = addDays(anchor, periodIndex * 14);
      const end = endOfDay(addDays(start, 13));
      return {
        start,
        end,
        label: `${format(start, 'yyyy-MM-dd')}/${format(end, 'yyyy-MM-dd')}`,
      };
    }
    case 'monthly': {
      const start = startOfMonth(date);
      return {
        start,
        end: endOfMonth(date),
        label: format(start, 'yyyy-MM'),
      };
    }
    case 'quarterly': {
      const start = startOfQuarter(date);
      const q = Math.floor(getMonth(start) / 3) + 1;
      return {
        start,
        end: endOfQuarter(date),
        label: `${getYear(start)}-Q${q}`,
      };
    }
    case 'semiannual': {
      const year = getYear(date);
      const month = getMonth(date); // 0-11
      const isH1 = month <= 5;
      const start = isH1
        ? startOfMonth(setMonth(setDate(date, 1), 0))
        : startOfMonth(setMonth(setDate(date, 1), 6));
      const end = isH1
        ? endOfMonth(setMonth(setDate(date, 1), 5))
        : endOfMonth(setMonth(setDate(date, 1), 11));
      return {
        start,
        end,
        label: `${year}-${isH1 ? 'H1' : 'H2'}`,
      };
    }
    case 'annual': {
      const start = startOfYear(date);
      return {
        start,
        end: endOfYear(date),
        label: String(getYear(start)),
      };
    }
  }
}

/**
 * Rótulo human-readable do período de consolidação para uso em
 * gráficos (eixo X + tooltip). Recebe a `reference_date` de um
 * `kpi_value` e retorna `short` (eixo) e `long` (tooltip),
 * já normalizados ao início do período via `getConsolidationPeriod`.
 *
 * Exemplos (pt-BR):
 *   monthly    → { short: 'mai/26',  long: 'maio 2026' }
 *   quarterly  → { short: 'Q2/26',   long: 'Trim. 2 2026' }
 *   semiannual → { short: 'S1/26',   long: 'S1 2026' }
 *   annual     → { short: '2026',    long: '2026' }
 *   weekly     → { short: '06/05',   long: '06/05 – 12/05 2026' }
 *   biweekly   → idem weekly
 *   daily      → { short: '15/05',   long: '15 mai 2026' }
 */
export function formatConsolidationPeriodLabel(
  freq: KpiFrequencyValue,
  date: Date,
  locale: Locale = ptBR,
): { short: string; long: string } {
  const period = getConsolidationPeriod(freq, date);
  const start = period.start;
  const end = period.end;
  switch (freq) {
    case 'daily':
      return {
        short: format(start, 'dd/MM', { locale }),
        long: format(start, 'dd MMM yyyy', { locale }),
      };
    case 'weekly':
    case 'biweekly':
      return {
        short: format(start, 'dd/MM', { locale }),
        long: `${format(start, 'dd/MM', { locale })} – ${format(end, 'dd/MM yyyy', { locale })}`,
      };
    case 'monthly':
      return {
        short: format(start, 'MMM/yy', { locale }),
        long: format(start, 'MMMM yyyy', { locale }),
      };
    case 'quarterly': {
      const q = Math.floor(getMonth(start) / 3) + 1;
      const yy = format(start, 'yy', { locale });
      return {
        short: `Q${q}/${yy}`,
        long: `Trim. ${q} ${getYear(start)}`,
      };
    }
    case 'semiannual': {
      const h = getMonth(start) <= 5 ? 1 : 2;
      const yy = format(start, 'yy', { locale });
      return {
        short: `S${h}/${yy}`,
        long: `S${h} ${getYear(start)}`,
      };
    }
    case 'annual': {
      const y = String(getYear(start));
      return { short: y, long: y };
    }
  }
}

// === Sugestão de input_type ===

/**
 * Sugere `consolidated` quando a data de input cai dentro do
 * período de consolidação corrente E o KPI tem `update_frequency`
 * igual a `consolidation_frequency` (sem janela intermediária).
 * Caso contrário sugere `partial` (valor atingido até a data,
 * antes do período fechar — não é estimativa de futuro).
 *
 * Espelha a regra implícita do trigger DB: inputs antes do
 * fechamento de período são parciais.
 */
export function suggestInputType(
  kpi: Pick<KpiMetric, 'consolidation_frequency' | 'update_frequency' | 'frequency'>,
  inputDate: Date = new Date(),
): KpiInputType {
  const cons =
    kpi.consolidation_frequency ?? legacyFrequencyToValue(kpi.frequency);
  const upd =
    kpi.update_frequency ?? legacyFrequencyToValue(kpi.frequency);

  if (!cons) return 'consolidated'; // sem cadência definida → trata como consolidado
  if (!upd || upd === cons) return 'consolidated';

  // update mais frequente que consolidation: input em período aberto = parcial
  const period = getConsolidationPeriod(cons, inputDate);
  // Se input cai dentro do período corrente e ele ainda não fechou
  // (end > now), é parcial
  const now = new Date();
  return period.end > now ? 'partial' : 'consolidated';
}

// === Gate de "precisa de atualização" (SSOT) ===

/**
 * Regra A — KPI está com input atrasado em relação à `update_frequency`.
 *
 * Substitui as cópias locais que existiam em `useKpisForWizard.ts` e
 * `useKpisForWizardV2.ts`. Semântica:
 *   - `update_frequency` ausente (KPI manual não revisado) → `false`
 *     (não entra no fluxo de cobrança)
 *   - sem `lastReferenceDate` → `true` (nunca atualizado)
 *   - diff(now, lastReferenceDate) ≥ UPDATE_OVERDUE_THRESHOLDS[freq] → `true`
 */
export function isKpiUpdateOverdue(
  updateFrequency: KpiFrequencyValue | null | undefined,
  lastReferenceDate: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!updateFrequency) return false;
  if (!lastReferenceDate) return true;

  const last =
    lastReferenceDate instanceof Date
      ? lastReferenceDate
      : new Date(lastReferenceDate);
  if (Number.isNaN(last.getTime())) return true;

  const diffDays = Math.floor(
    (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays >= UPDATE_OVERDUE_THRESHOLDS[updateFrequency];
}

/**
 * Regra B — Lista todos os períodos de `consolidation_frequency` já
 * fechados (`period.end < now`) que NÃO possuem valor com
 * `input_type='consolidated'` correspondente.
 *
 * Implementação iterativa para trás a partir do último período fechado:
 *  1. Se o `period_label` corrente está no Set de consolidados → adiciona
 *     ao Set de "vistos consolidados" e tenta o anterior MESMO assim
 *     (precisamos detectar lacunas mais antigas).
 *  2. Para a cada `maxLookback` períodos OU quando o período corrente
 *     começar antes de `kpiCreatedAt` (KPI nem existia naquela época).
 *
 * Retorna labels em ordem cronológica decrescente (mais recente primeiro).
 */
export function getMissingConsolidationPeriods(
  consolidationFrequency: KpiFrequencyValue | null | undefined,
  consolidatedPeriodLabels: Iterable<string>,
  bounds: {
    kpiCreatedAt: Date;
    now?: Date;
    /** Limite de períodos para trás. Default: 24 (2 anos mensais, 6 anos trim.). */
    maxLookback?: number;
  },
): string[] {
  if (!consolidationFrequency) return [];

  const now = bounds.now ?? new Date();
  const maxLookback = bounds.maxLookback ?? 24;
  const consolidatedSet = new Set(consolidatedPeriodLabels);

  const missing: string[] = [];
  // Janela de salto em milissegundos — uma cadência completa.
  const stepMs = FREQUENCY_DAYS[consolidationFrequency] * 24 * 60 * 60 * 1000;

  // Começa no período corrente; se ainda não fechou (period.end >= now),
  // anda 1 cadência para trás antes de iniciar.
  let cursor = new Date(now.getTime());
  let firstPeriod = getConsolidationPeriod(consolidationFrequency, cursor);
  if (firstPeriod.end > now) {
    cursor = new Date(cursor.getTime() - stepMs);
  }

  for (let i = 0; i < maxLookback; i++) {
    const period = getConsolidationPeriod(consolidationFrequency, cursor);
    // Para se o período começa antes do KPI existir.
    if (period.end < bounds.kpiCreatedAt) break;

    if (!consolidatedSet.has(period.label)) {
      missing.push(period.label);
    }

    // Salta para um instante seguramente dentro do período anterior.
    cursor = new Date(period.start.getTime() - stepMs);
  }

  return missing;
}

/**
 * Wrapper booleano de `getMissingConsolidationPeriods`.
 */
export function isKpiConsolidationPending(
  consolidationFrequency: KpiFrequencyValue | null | undefined,
  consolidatedPeriodLabels: Iterable<string>,
  bounds: { kpiCreatedAt: Date; now?: Date; maxLookback?: number },
): boolean {
  return (
    getMissingConsolidationPeriods(
      consolidationFrequency,
      consolidatedPeriodLabels,
      bounds,
    ).length > 0
  );
}

// === Helpers de UI ===

import { FREQUENCY_VALUE_LABELS } from '../types';

export function getFrequencyLabel(value: KpiFrequencyValue): string {
  return FREQUENCY_VALUE_LABELS[value];
}
