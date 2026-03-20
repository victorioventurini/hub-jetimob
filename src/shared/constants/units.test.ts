/**
 * Tests for unit constants and helper functions
 */
import { describe, it, expect } from 'vitest';
import { 
  getUnitLabel, 
  formatValueWithUnit, 
  isKnownUnit,
  ALL_UNITS,
  UNIT_CATEGORIES,
} from './units';

describe('UNIT_CATEGORIES', () => {
  it('should have 6 categories', () => {
    expect(UNIT_CATEGORIES).toHaveLength(6);
  });

  it('should include financial units', () => {
    const financial = UNIT_CATEGORIES.find(c => c.label === 'Financeiro');
    expect(financial).toBeDefined();
    expect(financial!.options.some(o => o.value === 'R$')).toBe(true);
  });
});

describe('ALL_UNITS', () => {
  it('should be a flat list of all unit options', () => {
    const totalOptions = UNIT_CATEGORIES.reduce((sum, cat) => sum + cat.options.length, 0);
    expect(ALL_UNITS).toHaveLength(totalOptions);
  });
});

describe('getUnitLabel', () => {
  it('should return label for known unit', () => {
    expect(getUnitLabel('R$')).toBe('R$');
    expect(getUnitLabel('%')).toBe('%');
    expect(getUnitLabel('Pontos')).toBe('Pontos (NPS, eNPS)');
  });

  it('should return raw value for unknown unit', () => {
    expect(getUnitLabel('bananas')).toBe('bananas');
  });
});

describe('formatValueWithUnit', () => {
  it('should return fallback for null value', () => {
    expect(formatValueWithUnit(null, '%')).toBe('—');
  });

  it('should return fallback for undefined value', () => {
    expect(formatValueWithUnit(undefined, 'R$')).toBe('—');
  });

  it('should format percentage as suffix', () => {
    expect(formatValueWithUnit(85.3, '%')).toBe('85,3 %');
  });

  it('should format currency as prefix', () => {
    expect(formatValueWithUnit(1500, 'R$')).toBe('R$ 1.500');
  });

  it('should format R$ mil as prefix', () => {
    expect(formatValueWithUnit(42, 'R$ mil')).toBe('R$ mil 42');
  });

  it('should format non-prefix unit as suffix', () => {
    expect(formatValueWithUnit(80, 'Pontos')).toBe('80 Pontos');
  });

  it('should format 0 correctly (not falsy)', () => {
    expect(formatValueWithUnit(0, '%')).toBe('0 %');
  });

  it('should skip prefix when showPrefix is false', () => {
    const result = formatValueWithUnit(1000, 'R$', false);
    expect(result).toBe('1.000 R$');
  });
});

describe('isKnownUnit', () => {
  it('should return true for known units', () => {
    expect(isKnownUnit('R$')).toBe(true);
    expect(isKnownUnit('%')).toBe(true);
    expect(isKnownUnit('Dias')).toBe(true);
  });

  it('should return false for custom unit', () => {
    expect(isKnownUnit('custom')).toBe(false);
  });

  it('should return false for unknown string', () => {
    expect(isKnownUnit('xyz_unit')).toBe(false);
  });
});
