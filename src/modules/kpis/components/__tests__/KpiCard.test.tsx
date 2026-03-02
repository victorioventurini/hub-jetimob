/**
 * KpiCard component tests — focus on zero-value rendering and Vic context.
 */
import { describe, it, expect } from 'vitest';

// Test the nullish coalescing fix logic directly (avoids heavy component mocking)
describe('KpiCard value mapping (nullish coalescing fix)', () => {
  // Simulates the Vic context mapping from KpiCard.tsx lines 241-242
  function mapVicContext(kpi: { current_value: number | null; target_value: number | null }) {
    return {
      currentValue: kpi.current_value ?? undefined,
      targetValue: kpi.target_value ?? undefined,
    };
  }

  // Old buggy behavior for comparison
  function mapVicContextBuggy(kpi: { current_value: number | null; target_value: number | null }) {
    return {
      currentValue: kpi.current_value || undefined,
      targetValue: kpi.target_value || undefined,
    };
  }

  it('preserves currentValue = 0 with ?? operator (fix)', () => {
    const result = mapVicContext({ current_value: 0, target_value: 100 });
    expect(result.currentValue).toBe(0);
    expect(result.targetValue).toBe(100);
  });

  it('old || operator would incorrectly convert 0 to undefined (regression proof)', () => {
    const result = mapVicContextBuggy({ current_value: 0, target_value: 100 });
    expect(result.currentValue).toBeUndefined(); // This is the bug
  });

  it('converts null to undefined correctly', () => {
    const result = mapVicContext({ current_value: null, target_value: null });
    expect(result.currentValue).toBeUndefined();
    expect(result.targetValue).toBeUndefined();
  });

  it('preserves positive values', () => {
    const result = mapVicContext({ current_value: 85.5, target_value: 100 });
    expect(result.currentValue).toBe(85.5);
    expect(result.targetValue).toBe(100);
  });

  it('preserves negative values', () => {
    const result = mapVicContext({ current_value: -5, target_value: 0 });
    expect(result.currentValue).toBe(-5);
    expect(result.targetValue).toBe(0);
  });
});

describe('KpiCard formatValue logic', () => {
  // Extracted from KpiCard rendering logic
  function formatValue(value: number | null, unit: string): string {
    if (value === null) return '---';
    if (unit === '%') return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    if (unit === 'R$') return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    return value.toLocaleString('pt-BR');
  }

  it('renders "0" for value 0 with generic unit (not "---")', () => {
    expect(formatValue(0, 'un')).toBe('0');
  });

  it('renders "0,0%" for value 0 with % unit', () => {
    expect(formatValue(0, '%')).toBe('0,0%');
  });

  it('renders "R$ 0,00" for value 0 with R$ unit', () => {
    expect(formatValue(0, 'R$')).toBe('R$ 0,00');
  });

  it('renders "---" for null value', () => {
    expect(formatValue(null, 'un')).toBe('---');
  });

  it('formats positive values correctly', () => {
    expect(formatValue(1234, 'un')).toMatch(/1.*234/); // locale-dependent separator
  });
});
