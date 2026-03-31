/**
 * generateCycles — Geração automática de ciclos anuais + trimestrais
 * 
 * Função pura, sem dependências externas (testável).
 * Gera ciclos com todas as datas pré-preenchidas conforme fórmulas padrão.
 */

export interface GeneratedCycle {
  name: string;
  type: 'year' | 'quarter';
  start_date: string;
  end_date: string;
  planning_date: string;
  review_date: string;
  retro_date: string;
  status: 'planning';
  /** Chave temporária para vincular trimestres ao anual correspondente */
  _tempParentKey: string | null;
  /** Chave que identifica este ciclo para fins de vinculação */
  _tempKey: string;
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

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
 * Gera ciclos para N anos a partir de startYear.
 * 
 * Por ano:
 * - 1 ciclo anual
 * - 4 ciclos trimestrais (Q1–Q4)
 * 
 * Fórmulas:
 * - Anual: planning = 01/11 do ano anterior, review = 01/07, retro = 01/12
 * - Trimestral: planning = start + 63d, review = start + 35d, retro = start + 77d
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

      cycles.push({
        name: `${year}-Q${q.quarter}`,
        type: 'quarter',
        start_date: startDate,
        end_date: endDate,
        planning_date: addDays(startDate, 63),  // semana 10
        review_date: addDays(startDate, 35),     // semana 5
        retro_date: addDays(startDate, 77),      // semana 12
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
 * @param generated Ciclos gerados
 * @param existingAnnualYears Anos que já possuem ciclo anual no banco (ex: [2026])
 */
export function filterNewCycles(
  generated: GeneratedCycle[],
  existingAnnualYears: number[],
): GeneratedCycle[] {
  const existingSet = new Set(existingAnnualYears);
  
  return generated.filter(c => {
    // Extrair ano do nome (ex: "2026-Annual" → 2026, "2026-Q1" → 2026)
    const yearMatch = c.name.match(/^(\d{4})/);
    if (!yearMatch) return true;
    const year = parseInt(yearMatch[1], 10);
    return !existingSet.has(year);
  });
}
