/**
 * Wave 1 — Tests for name utilities (pure functions).
 */
import { describe, it, expect } from 'vitest';
import { getFirstName, getGreetingName, formatInformalName } from './nameUtils';

describe('getFirstName', () => {
  it('extrai primeiro nome de nome completo', () => {
    expect(getFirstName('Victorio Venturini')).toBe('Victorio');
  });

  it('retorna o próprio nome se for único', () => {
    expect(getFirstName('Maria')).toBe('Maria');
  });

  it('retorna undefined para null/undefined/empty', () => {
    expect(getFirstName(null)).toBeUndefined();
    expect(getFirstName(undefined)).toBeUndefined();
    expect(getFirstName('')).toBeUndefined();
  });

  it('lida com múltiplos espaços e trim', () => {
    expect(getFirstName('  João Silva  ')).toBe('');
    expect(getFirstName('João  Silva')).toBe('João');
  });
});

describe('getGreetingName', () => {
  it('prefere first_name quando disponível', () => {
    expect(getGreetingName('Vic', 'Victorio Venturini')).toBe('Vic');
  });

  it('faz fallback para primeira palavra de display_name', () => {
    expect(getGreetingName(null, 'Maria Silva')).toBe('Maria');
  });

  it('retorna undefined quando ambos vazios', () => {
    expect(getGreetingName(null, null)).toBeUndefined();
    expect(getGreetingName(undefined, undefined)).toBeUndefined();
  });
});

describe('formatInformalName', () => {
  it('retorna primeiro nome', () => {
    expect(formatInformalName('Pedro Souza')).toBe('Pedro');
  });

  it('retorna string vazia para null', () => {
    expect(formatInformalName(null)).toBe('');
    expect(formatInformalName(undefined)).toBe('');
  });
});
