import { describe, it, expect } from 'vitest';
import {
  parseBrNumber,
  formatBrNumber,
  formatWithMask,
  getMaskConfigForUnit,
} from '../numberFormat';

describe('parseBrNumber', () => {
  it('parses pt-BR formatted strings', () => {
    expect(parseBrNumber('1.234,56')).toBe(1234.56);
    expect(parseBrNumber('150.000,00')).toBe(150000);
    expect(parseBrNumber('0,5')).toBe(0.5);
    expect(parseBrNumber('-1.000,25')).toBe(-1000.25);
  });

  it('tolerates en-US paste', () => {
    expect(parseBrNumber('1234.56')).toBe(1234.56);
    expect(parseBrNumber('1500')).toBe(1500);
  });

  it('strips prefix/suffix characters', () => {
    expect(parseBrNumber('R$ 1.500,00')).toBe(1500);
    expect(parseBrNumber('75,5 %')).toBe(75.5);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseBrNumber('')).toBeNull();
    expect(parseBrNumber(null)).toBeNull();
    expect(parseBrNumber(undefined)).toBeNull();
    expect(parseBrNumber('abc')).toBeNull();
    expect(parseBrNumber(',')).toBeNull();
    expect(parseBrNumber('-')).toBeNull();
  });

  it('passes through numbers', () => {
    expect(parseBrNumber(42)).toBe(42);
    expect(parseBrNumber(0)).toBe(0);
  });
});

describe('formatBrNumber', () => {
  it('formats with fixed decimals', () => {
    expect(formatBrNumber(1500, { decimals: 2, maxDecimals: 2 })).toBe('1.500,00');
    expect(formatBrNumber(0.5, { decimals: 2, maxDecimals: 2 })).toBe('0,50');
  });

  it('respects max decimals', () => {
    expect(formatBrNumber(1500, { decimals: 0, maxDecimals: 2 })).toBe('1.500');
    expect(formatBrNumber(1500.5, { decimals: 0, maxDecimals: 2 })).toBe('1.500,5');
  });

  it('returns empty string for null/NaN', () => {
    expect(formatBrNumber(null, { decimals: 2, maxDecimals: 2 })).toBe('');
    expect(formatBrNumber(NaN, { decimals: 2, maxDecimals: 2 })).toBe('');
  });
});

describe('getMaskConfigForUnit', () => {
  it('maps R$ to currency', () => {
    const cfg = getMaskConfigForUnit('R$');
    expect(cfg.style).toBe('currency');
    expect(cfg.prefix).toBe('R$');
    expect(cfg.decimals).toBe(2);
  });

  it('maps % to percent suffix', () => {
    const cfg = getMaskConfigForUnit('%');
    expect(cfg.style).toBe('percent');
    expect(cfg.suffix).toBe('%');
  });

  it('uses unit text as suffix for arbitrary units', () => {
    const cfg = getMaskConfigForUnit('Clientes');
    expect(cfg.style).toBe('decimal');
    expect(cfg.suffix).toBe('Clientes');
  });

  it('handles empty unit', () => {
    const cfg = getMaskConfigForUnit('');
    expect(cfg.style).toBe('decimal');
    expect(cfg.suffix).toBeUndefined();
  });
});

describe('formatWithMask', () => {
  it('formats currency with prefix', () => {
    expect(formatWithMask(150000, getMaskConfigForUnit('R$'))).toBe('R$ 150.000,00');
  });

  it('formats percent with suffix', () => {
    expect(formatWithMask(75.5, getMaskConfigForUnit('%'))).toBe('75,5 %');
  });

  it('formats decimal with unit suffix', () => {
    expect(formatWithMask(1500, getMaskConfigForUnit('Clientes'))).toBe('1.500 Clientes');
  });
});
