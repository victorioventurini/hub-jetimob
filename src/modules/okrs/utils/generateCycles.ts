/**
 * generateCycles — Geração automática de ciclos anuais + trimestrais
 * 
 * Função pura, sem dependências externas (testável).
 * Gera ciclos com todas as datas pré-preenchidas conforme fórmulas padrão.
 * 
 * Regras de calendarização:
 * - Reuniões MBR e QBR ocorrem na 1ª terça-feira do mês seguinte ao período revisado
 * - Janelas de preparação contam em dias úteis (seg–sex)
 * - Cada quarter tem 2 MBRs (meses 1 e 2) + QBR-pre + QBR no mês 3
 */

export interface GeneratedCycle {
  name: string;
  type: 'year' | 'quarter';
  start_date: string;
  end_date: string;
  planning_date: string;
  review_date: string;
  review_date_first_month: string;
  retro_date: string;
  status: 'planning';
  /** Chave temporária para vincular trimestres ao anual correspondente */
  _tempParentKey: string | null;
  /** Chave que identifica este ciclo para fins de vinculação */
  _tempKey: string;
}

// ============================================================
// DATE HELPERS
// ============================================================

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calcula a 1ª terça-feira de um mês.
 * Terça-feira = dayOfWeek 2 (0=dom, 1=seg, 2=ter, ...)
 */
function firstTuesdayOfMonth(year: number, month: number): string {
  const d = new Date(year, month - 1, 1); // month is 1-indexed
  const dayOfWeek = d.getDay(); // 0=Sun
  // Days until next Tuesday (2)
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
  const day = 1 + daysUntilTuesday;
  return toISODate(year, month, day);
}

/**
 * Adiciona/subtrai N dias úteis (seg–sex) a uma data ISO string.
 * Exportado para reuso em useRitualAvailability.
 */
export function addBusinessDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  let remaining = Math.abs(days);
  const direction = days >= 0 ? 1 : -1;
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + direction);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return d.toISOString().split('T')[0];
}

/**
 * Versão que opera com Date objects (para useRitualAvailability).
 */
export function addBusinessDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  let remaining = Math.abs(days);
  const direction = days >= 0 ? 1 : -1;
  while (remaining > 0) {
    result.setDate(result.getDate() + direction);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return result;
}

// ============================================================
// QUARTER CONFIG
// ============================================================

interface QuarterConfig {
  quarter: number;
  startMonth: number;
  endMonth: number;
}

const QUARTERS: QuarterConfig[] = [
  { quarter: 1, startMonth: 1, endMonth: 3 },
  { quarter: 2, startMonth: 4, endMonth: 6 },
  { quarter: 3, startMonth: 7, endMonth: 9 },
  { quarter: 4, startMonth: 10, endMonth: 12 },
];

/**
 * Retorna o mês seguinte ao mês dado (com wrap para janeiro do próximo ano).
 */
function nextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

// ============================================================
// GENERATION
// ============================================================

/**
 * Gera ciclos para N anos a partir de startYear.
 * 
 * Por ano:
 * - 1 ciclo anual
 * - 4 ciclos trimestrais (Q1–Q4)
 * 
 * Fórmulas trimestrais:
 * - review_date_first_month = 1ª terça do mês 2 do quarter (MBR₁)
 * - review_date = 1ª terça do mês 3 do quarter (MBR₂)
 * - planning_date = dia 16 do mês 3 (Q4: dia 7 para recesso)
 * - retro_date = 1ª terça do mês seguinte ao quarter (QBR meeting)
 */
export function generateCyclesForYears(startYear: number, count: number): GeneratedCycle[] {
  const cycles: GeneratedCycle[] = [];

  for (let offset = 0; offset < count; offset++) {
    const year = startYear + offset;
    const annualKey = `annual-${year}`;

    // Ciclo anual
    cycles.push({
      name: `${year}-Annual`,
      type: 'year',
      start_date: toISODate(year, 1, 1),
      end_date: toISODate(year, 12, 31),
      planning_date: toISODate(year - 1, 11, 1),
      review_date: toISODate(year, 7, 1),
      review_date_first_month: toISODate(year, 7, 1), // annual doesn't use dual MBR
      retro_date: toISODate(year, 12, 1),
      status: 'planning',
      _tempParentKey: null,
      _tempKey: annualKey,
    });

    // Ciclos trimestrais
    for (const q of QUARTERS) {
      const startDate = toISODate(year, q.startMonth, 1);
      const endDay = lastDayOfMonth(year, q.endMonth);
      const endDate = toISODate(year, q.endMonth, endDay);

      // MBR₁: 1ª terça do 2º mês do quarter
      const m2 = nextMonth(year, q.startMonth);
      const reviewFirstMonth = firstTuesdayOfMonth(m2.year, m2.month);

      // MBR₂: 1ª terça do 3º mês do quarter
      const m3 = nextMonth(m2.year, m2.month);
      const reviewDate = firstTuesdayOfMonth(m3.year, m3.month);

      // QBR-pre: dia 16 do 3º mês (Q4: dia 7 para recesso de fim de ano)
      const planningDay = q.quarter === 4 ? 7 : 16;
      const planningDate = toISODate(m3.year, m3.month, planningDay);

      // QBR meeting: 1ª terça do mês seguinte ao quarter
      const mNext = nextMonth(m3.year, m3.month);
      const retroDate = firstTuesdayOfMonth(mNext.year, mNext.month);

      cycles.push({
        name: `${year}-Q${q.quarter}`,
        type: 'quarter',
        start_date: startDate,
        end_date: endDate,
        planning_date: planningDate,
        review_date: reviewDate,
        review_date_first_month: reviewFirstMonth,
        retro_date: retroDate,
        status: 'planning',
        _tempParentKey: annualKey,
        _tempKey: `q${q.quarter}-${year}`,
      });
    }
  }

  return cycles;
}

/**
 * Filtra ciclos gerados, removendo anos que já existem no banco.
 */
export function filterNewCycles(
  generated: GeneratedCycle[],
  existingAnnualYears: number[],
): GeneratedCycle[] {
  const existingSet = new Set(existingAnnualYears);
  
  return generated.filter(c => {
    const yearMatch = c.name.match(/^(\d{4})/);
    if (!yearMatch) return true;
    const year = parseInt(yearMatch[1], 10);
    return !existingSet.has(year);
  });
}
