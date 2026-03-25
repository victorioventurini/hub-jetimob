/**
 * Tests for analyzePace, calculateExpectedProgress, calculateCycleElapsed,
 * and getPaceInterpretationText.
 * 
 * Validates the canonical pace interpretation logic:
 * - Progress evaluated by cycle rhythm, not distance to target
 * - No punitive language in early cycle
 * - Tolerance-based classification
 * 
 * @see docs/guides/PROGRESS_INTERPRETATION_CANON.md
 */

import { describe, it, expect } from 'vitest';
import {
  analyzePace,
  calculateExpectedProgress,
  calculateCycleElapsed,
  getPaceInterpretationText,
  type CycleContext,
  type PaceAnalysis,
} from '../progressCalculation';

// ============================================================
// Helpers
// ============================================================

function createQuarterCycle(startStr: string, endStr: string): CycleContext {
  return {
    startDate: new Date(startStr),
    endDate: new Date(endStr),
    type: 'quarter',
  };
}

const Q1_2026 = createQuarterCycle('2026-01-01', '2026-03-31');

function midCycleDate(cycle: CycleContext, fraction: number): Date {
  const start = cycle.startDate.getTime();
  const end = cycle.endDate.getTime();
  return new Date(start + (end - start) * fraction);
}

// ============================================================
// calculateExpectedProgress
// ============================================================

describe('calculateExpectedProgress', () => {
  it('retorna 0 antes do início do ciclo', () => {
    expect(calculateExpectedProgress(Q1_2026, new Date('2025-12-15'))).toBe(0);
  });

  it('retorna 100 após o fim do ciclo', () => {
    expect(calculateExpectedProgress(Q1_2026, new Date('2026-04-15'))).toBe(100);
  });

  it('retorna ~50 no meio do ciclo', () => {
    const mid = midCycleDate(Q1_2026, 0.5);
    const result = calculateExpectedProgress(Q1_2026, mid);
    expect(result).toBeGreaterThanOrEqual(49);
    expect(result).toBeLessThanOrEqual(51);
  });

  it('retorna 0 exatamente no início do ciclo', () => {
    expect(calculateExpectedProgress(Q1_2026, new Date('2026-01-01'))).toBe(0);
  });

  it('usa data atual como default quando referenceDate omitido', () => {
    const result = calculateExpectedProgress(Q1_2026);
    expect(typeof result).toBe('number');
  });
});

// ============================================================
// calculateCycleElapsed
// ============================================================

describe('calculateCycleElapsed', () => {
  it('é equivalente a calculateExpectedProgress', () => {
    const date = midCycleDate(Q1_2026, 0.3);
    expect(calculateCycleElapsed(Q1_2026, date)).toBe(calculateExpectedProgress(Q1_2026, date));
  });
});

// ============================================================
// analyzePace
// ============================================================

describe('analyzePace', () => {
  describe('completed', () => {
    it('retorna completed quando progress >= 100', () => {
      const result = analyzePace({
        actualProgress: 100,
        cycle: Q1_2026,
        referenceDate: midCycleDate(Q1_2026, 0.5),
      });
      expect(result.status).toBe('completed');
    });

    it('retorna completed quando progress = 156 (no-clamp)', () => {
      const result = analyzePace({
        actualProgress: 156,
        cycle: Q1_2026,
        referenceDate: midCycleDate(Q1_2026, 0.5),
      });
      expect(result.status).toBe('completed');
      expect(result.actualProgress).toBe(156);
    });
  });

  describe('not_started', () => {
    it('retorna not_started quando progress = 0 e ciclo > 10% transcorrido', () => {
      const result = analyzePace({
        actualProgress: 0,
        cycle: Q1_2026,
        referenceDate: midCycleDate(Q1_2026, 0.5),
      });
      expect(result.status).toBe('not_started');
    });

    it('não retorna not_started quando progress = 0 e ciclo <= 10%', () => {
      const result = analyzePace({
        actualProgress: 0,
        cycle: Q1_2026,
        referenceDate: midCycleDate(Q1_2026, 0.08),
      });
      // Early cycle → on_pace (no judgment)
      expect(result.status).toBe('on_pace');
    });
  });

  describe('início do ciclo (<=15%)', () => {
    it('retorna on_pace nos primeiros 15% do ciclo, independente do progresso', () => {
      const result = analyzePace({
        actualProgress: 5,
        cycle: Q1_2026,
        referenceDate: midCycleDate(Q1_2026, 0.10),
      });
      expect(result.status).toBe('on_pace');
      expect(result.label).toBe('Início do ciclo');
    });

    it('retorna on_pace com progresso 0 no início do ciclo (<= 10%)', () => {
      const result = analyzePace({
        actualProgress: 0,
        cycle: Q1_2026,
        referenceDate: midCycleDate(Q1_2026, 0.05),
      });
      expect(result.status).toBe('on_pace');
    });
  });

  describe('above_pace', () => {
    it('retorna above_pace quando gap >= tolerância (+10%)', () => {
      const result = analyzePace({
        actualProgress: 70,
        cycle: Q1_2026,
        referenceDate: midCycleDate(Q1_2026, 0.5), // expected ~50%
      });
      expect(result.status).toBe('above_pace');
      expect(result.gap).toBeGreaterThanOrEqual(10);
    });
  });

  describe('below_pace', () => {
    it('retorna below_pace quando gap <= -tolerância (-10%)', () => {
      const result = analyzePace({
        actualProgress: 30,
        cycle: Q1_2026,
        referenceDate: midCycleDate(Q1_2026, 0.5), // expected ~50%
      });
      expect(result.status).toBe('below_pace');
      expect(result.gap).toBeLessThanOrEqual(-10);
    });
  });

  describe('on_pace', () => {
    it('retorna on_pace quando gap entre -10% e +10%', () => {
      const ref = midCycleDate(Q1_2026, 0.5); // expected ~50%
      const result = analyzePace({
        actualProgress: 48,
        cycle: Q1_2026,
        referenceDate: ref,
      });
      expect(result.status).toBe('on_pace');
    });
  });

  describe('tolerância customizada', () => {
    it('usa tolerância customizada de 5%', () => {
      const result = analyzePace({
        actualProgress: 44,
        cycle: Q1_2026,
        referenceDate: midCycleDate(Q1_2026, 0.5), // expected ~50%
        tolerancePercent: 5,
      });
      expect(result.status).toBe('below_pace');
    });

    it('tolerância de 20% classifica como on_pace com gap de 15%', () => {
      const result = analyzePace({
        actualProgress: 35,
        cycle: Q1_2026,
        referenceDate: midCycleDate(Q1_2026, 0.5), // expected ~50%
        tolerancePercent: 20,
      });
      expect(result.status).toBe('on_pace');
    });
  });

  describe('campos de retorno', () => {
    it('retorna todos os campos do PaceAnalysis', () => {
      const result = analyzePace({
        actualProgress: 50,
        cycle: Q1_2026,
        referenceDate: midCycleDate(Q1_2026, 0.5),
      });
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('expectedProgress');
      expect(result).toHaveProperty('actualProgress');
      expect(result).toHaveProperty('gap');
      expect(result).toHaveProperty('cycleElapsed');
      expect(result).toHaveProperty('interpretation');
    });

    it('gap = actualProgress - expectedProgress', () => {
      const result = analyzePace({
        actualProgress: 70,
        cycle: Q1_2026,
        referenceDate: midCycleDate(Q1_2026, 0.5),
      });
      expect(result.gap).toBe(result.actualProgress - result.expectedProgress);
    });
  });

  describe('tipos de ciclo', () => {
    it('interpretation inclui "trimestral" para ciclo quarter', () => {
      const result = analyzePace({
        actualProgress: 70,
        cycle: Q1_2026,
        referenceDate: midCycleDate(Q1_2026, 0.5),
      });
      expect(result.interpretation).toContain('trimestral');
    });

    it('interpretation inclui "mensal" para ciclo month', () => {
      const monthly: CycleContext = {
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-31'),
        type: 'month',
      };
      const result = analyzePace({
        actualProgress: 70,
        cycle: monthly,
        referenceDate: new Date('2026-03-15'),
      });
      expect(result.interpretation).toContain('mensal');
    });
  });
});

// ============================================================
// getPaceInterpretationText
// ============================================================

describe('getPaceInterpretationText', () => {
  it('completed: inclui checkmark e porcentagem', () => {
    const text = getPaceInterpretationText({
      status: 'completed',
      label: 'Meta atingida',
      expectedProgress: 50,
      actualProgress: 120,
      gap: 70,
      cycleElapsed: 50,
      interpretation: '',
    });
    expect(text).toContain('✓');
    expect(text).toContain('120%');
  });

  it('above_pace: inclui seta para cima', () => {
    const text = getPaceInterpretationText({
      status: 'above_pace',
      label: '',
      expectedProgress: 50,
      actualProgress: 70,
      gap: 20,
      cycleElapsed: 50,
      interpretation: '',
    });
    expect(text).toContain('↑');
    expect(text).toContain('acima');
  });

  it('on_pace: inclui seta horizontal', () => {
    const text = getPaceInterpretationText({
      status: 'on_pace',
      label: '',
      expectedProgress: 50,
      actualProgress: 50,
      gap: 0,
      cycleElapsed: 50,
      interpretation: '',
    });
    expect(text).toContain('→');
    expect(text).toContain('dentro');
  });

  it('below_pace: inclui seta para baixo e linguagem de ritmo (não "atrasado")', () => {
    const text = getPaceInterpretationText({
      status: 'below_pace',
      label: '',
      expectedProgress: 50,
      actualProgress: 30,
      gap: -20,
      cycleElapsed: 50,
      interpretation: '',
    });
    expect(text).toContain('↓');
    expect(text).toContain('ritmo');
    expect(text).not.toContain('atrasado');
    expect(text).not.toContain('fracasso');
  });

  it('not_started: inclui círculo e percentual do ciclo transcorrido', () => {
    const text = getPaceInterpretationText({
      status: 'not_started',
      label: '',
      expectedProgress: 50,
      actualProgress: 0,
      gap: -50,
      cycleElapsed: 50,
      interpretation: '',
    });
    expect(text).toContain('○');
    expect(text).toContain('50%');
  });
});
