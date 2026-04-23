/**
 * Wave 2 — Tests for generateCycles (cycle generation utilities).
 */
import { describe, it, expect } from 'vitest';
import {
  generateCyclesForYears,
  filterNewCycles,
  addBusinessDays,
  addBusinessDaysToDate,
} from './generateCycles';

describe('addBusinessDays (string)', () => {
  it('adiciona 1 dia útil pulando fim de semana', () => {
    // 2026-04-24 = sexta -> +1 = segunda 2026-04-27
    expect(addBusinessDays('2026-04-24', 1)).toBe('2026-04-27');
  });

  it('adiciona 5 dias úteis = 1 semana corrida', () => {
    expect(addBusinessDays('2026-04-20', 5)).toBe('2026-04-27'); // seg → seg
  });

  it('subtrai dias úteis (negativo)', () => {
    // segunda 2026-04-27 - 1 = sexta 2026-04-24
    expect(addBusinessDays('2026-04-27', -1)).toBe('2026-04-24');
  });

  it('zero dias = mesma data', () => {
    expect(addBusinessDays('2026-04-23', 0)).toBe('2026-04-23');
  });
});

describe('addBusinessDaysToDate', () => {
  it('opera em Date sem mutar original', () => {
    const start = new Date('2026-04-24T12:00:00');
    const r = addBusinessDaysToDate(start, 1);
    expect(start.getDate()).toBe(24); // imutável
    expect(r.getDay()).not.toBe(0);
    expect(r.getDay()).not.toBe(6);
  });
});

describe('generateCyclesForYears', () => {
  it('gera 5 ciclos por ano (1 anual + 4 quarters)', () => {
    const r = generateCyclesForYears(2026, 1);
    expect(r).toHaveLength(5);
    expect(r.filter(c => c.type === 'year')).toHaveLength(1);
    expect(r.filter(c => c.type === 'quarter')).toHaveLength(4);
  });

  it('gera ciclos para múltiplos anos', () => {
    const r = generateCyclesForYears(2026, 3);
    expect(r).toHaveLength(15); // 3 * 5
  });

  it('ciclo anual tem datas de cobertura full-year', () => {
    const [annual] = generateCyclesForYears(2026, 1);
    expect(annual.start_date).toBe('2026-01-01');
    expect(annual.end_date).toBe('2026-12-31');
    expect(annual.name).toBe('2026-Annual');
    expect(annual._tempParentKey).toBeNull();
  });

  it('quarters vinculam ao annual via _tempParentKey', () => {
    const r = generateCyclesForYears(2026, 1);
    const annual = r.find(c => c.type === 'year')!;
    const quarters = r.filter(c => c.type === 'quarter');
    quarters.forEach(q => {
      expect(q._tempParentKey).toBe(annual._tempKey);
    });
  });

  it('Q1 cobre jan-mar', () => {
    const r = generateCyclesForYears(2026, 1);
    const q1 = r.find(c => c.name === '2026-Q1')!;
    expect(q1.start_date).toBe('2026-01-01');
    expect(q1.end_date).toBe('2026-03-31');
  });

  it('Q4 cobre out-dez', () => {
    const r = generateCyclesForYears(2026, 1);
    const q4 = r.find(c => c.name === '2026-Q4')!;
    expect(q4.start_date).toBe('2026-10-01');
    expect(q4.end_date).toBe('2026-12-31');
  });

  it('Q4 usa dia 7 para planning (recesso de fim de ano)', () => {
    const r = generateCyclesForYears(2026, 1);
    const q4 = r.find(c => c.name === '2026-Q4')!;
    expect(q4.planning_date).toBe('2026-12-07');
  });

  it('Q1-Q3 usam dia 16 para planning', () => {
    const r = generateCyclesForYears(2026, 1);
    expect(r.find(c => c.name === '2026-Q1')!.planning_date).toBe('2026-03-16');
    expect(r.find(c => c.name === '2026-Q2')!.planning_date).toBe('2026-06-16');
    expect(r.find(c => c.name === '2026-Q3')!.planning_date).toBe('2026-09-16');
  });

  it('retro_date é 1ª terça do mês seguinte ao quarter', () => {
    const r = generateCyclesForYears(2026, 1);
    // Q1 → mês seguinte = abril; 1ª terça de abr/2026 = 2026-04-07
    expect(r.find(c => c.name === '2026-Q1')!.retro_date).toBe('2026-04-07');
  });

  it('Q4 retro_date wrap para janeiro do ano seguinte', () => {
    const r = generateCyclesForYears(2026, 1);
    const q4 = r.find(c => c.name === '2026-Q4')!;
    expect(q4.retro_date).toMatch(/^2027-01/);
  });

  it('todos status iniciam como "planning"', () => {
    const r = generateCyclesForYears(2026, 2);
    expect(r.every(c => c.status === 'planning')).toBe(true);
  });
});

describe('filterNewCycles', () => {
  it('remove ciclos cujo ano já existe', () => {
    const generated = generateCyclesForYears(2025, 3); // 2025, 2026, 2027
    const filtered = filterNewCycles(generated, [2026]);
    expect(filtered.find(c => c.name.startsWith('2026'))).toBeUndefined();
    expect(filtered.find(c => c.name.startsWith('2025'))).toBeDefined();
    expect(filtered.find(c => c.name.startsWith('2027'))).toBeDefined();
  });

  it('mantém todos quando nenhum existe', () => {
    const generated = generateCyclesForYears(2026, 1);
    expect(filterNewCycles(generated, [])).toEqual(generated);
  });

  it('mantém ciclos sem prefix de ano (defensivo)', () => {
    const odd = [{ name: 'Custom', type: 'year' } as never];
    expect(filterNewCycles(odd, [2026])).toEqual(odd);
  });
});
