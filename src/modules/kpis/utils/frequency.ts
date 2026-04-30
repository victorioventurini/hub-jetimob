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

// === Helpers de UI ===

import { FREQUENCY_VALUE_LABELS } from '../types';

export function getFrequencyLabel(value: KpiFrequencyValue): string {
  return FREQUENCY_VALUE_LABELS[value];
}
