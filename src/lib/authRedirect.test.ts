import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeAuthNext } from './authRedirect';

describe('normalizeAuthNext', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://next.jetimob.com' },
      writable: true,
    });
  });

  it('retorna "/" para null/undefined/empty', () => {
    expect(normalizeAuthNext(null)).toBe('/');
    expect(normalizeAuthNext(undefined)).toBe('/');
    expect(normalizeAuthNext('')).toBe('/');
  });

  it('rejeita paths que não começam com /', () => {
    expect(normalizeAuthNext('https://evil.com')).toBe('/');
    expect(normalizeAuthNext('javascript:alert(1)')).toBe('/');
  });

  it('rejeita protocol-relative // (open redirect)', () => {
    expect(normalizeAuthNext('//evil.com/path')).toBe('/');
  });

  it('aceita paths internos válidos', () => {
    expect(normalizeAuthNext('/dashboard')).toBe('/dashboard');
    expect(normalizeAuthNext('/okrs/123')).toBe('/okrs/123');
  });

  it('preserva query e hash', () => {
    expect(normalizeAuthNext('/teams?id=1#section')).toBe('/teams?id=1#section');
  });

  it('desaninha next dentro de /auth/callback', () => {
    expect(normalizeAuthNext('/auth/callback?next=/dashboard')).toBe('/dashboard');
  });

  it('desaninha next dentro de /auth/confirm', () => {
    expect(normalizeAuthNext('/auth/confirm?next=/okrs')).toBe('/okrs');
  });

  it('desaninha recursivamente', () => {
    expect(
      normalizeAuthNext('/auth/callback?next=/auth/confirm?next=/teams')
    ).toBe('/teams');
  });

  it('rejeita next aninhado malicioso', () => {
    expect(normalizeAuthNext('/auth/callback?next=https://evil.com')).toBe('/');
    expect(normalizeAuthNext('/auth/callback?next=//evil.com')).toBe('/');
  });
});
