/**
 * Wave 1 — Tests for phone utilities (Brazilian phone numbers).
 */
import { describe, it, expect } from 'vitest';
import {
  normalizePhone,
  formatPhoneDisplay,
  formatPhoneInput,
  isValidPhone,
  getWhatsAppUrl,
  getPhoneDigits,
} from './phone';

describe('normalizePhone', () => {
  it('normaliza com DDI já presente', () => {
    expect(normalizePhone('+55 (51) 99999-9999')).toBe('5551999999999');
  });

  it('adiciona DDI 55 quando ausente (mobile 11 digitos)', () => {
    expect(normalizePhone('51999999999')).toBe('5551999999999');
  });

  it('adiciona DDI 55 quando ausente (landline 10 digitos)', () => {
    expect(normalizePhone('5133333333')).toBe('555133333333');
  });

  it('retorna null para inválidos', () => {
    expect(normalizePhone('999999999')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
});

describe('formatPhoneDisplay', () => {
  it('formata mobile com DDI', () => {
    expect(formatPhoneDisplay('5551999999999')).toBe('+55 (51) 99999-9999');
  });

  it('formata landline com DDI', () => {
    expect(formatPhoneDisplay('555133334444')).toBe('+55 (51) 3333-4444');
  });

  it('formata mobile sem DDI', () => {
    expect(formatPhoneDisplay('51999999999')).toBe('(51) 99999-9999');
  });

  it('formata landline sem DDI', () => {
    expect(formatPhoneDisplay('5133334444')).toBe('(51) 3333-4444');
  });

  it('retorna vazio para null', () => {
    expect(formatPhoneDisplay(null)).toBe('');
  });
});

describe('formatPhoneInput', () => {
  it('progressivo: 2 digitos', () => {
    expect(formatPhoneInput('55')).toBe('+55');
  });

  it('progressivo: 4 digitos', () => {
    expect(formatPhoneInput('5551')).toBe('+55 (51');
  });

  it('completo mobile', () => {
    expect(formatPhoneInput('5551999999999')).toBe('+55 (51) 99999-9999');
  });

  it('vazio retorna vazio', () => {
    expect(formatPhoneInput('')).toBe('');
  });
});

describe('isValidPhone', () => {
  it.each([
    ['+55 (51) 99999-9999', true],
    ['51999999999', true],
    ['5551999999999', true],
    ['5133334444', true],
    ['999999999', false],
    [null, false],
    [undefined, false],
    ['', false],
  ])('isValidPhone(%s) === %s', (input, expected) => {
    expect(isValidPhone(input)).toBe(expected);
  });
});

describe('getWhatsAppUrl', () => {
  it('gera URL com DDI presente', () => {
    expect(getWhatsAppUrl('5551999999999')).toBe('https://wa.me/5551999999999');
  });

  it('adiciona DDI 55 quando ausente', () => {
    expect(getWhatsAppUrl('51999999999')).toBe('https://wa.me/5551999999999');
  });

  it('retorna null para inválido', () => {
    expect(getWhatsAppUrl('123')).toBeNull();
    expect(getWhatsAppUrl(null)).toBeNull();
  });
});

describe('getPhoneDigits', () => {
  it('extrai apenas dígitos', () => {
    expect(getPhoneDigits('+55 (51) 99999-9999')).toBe('5551999999999');
  });

  it('vazio para null', () => {
    expect(getPhoneDigits(null)).toBe('');
  });
});
