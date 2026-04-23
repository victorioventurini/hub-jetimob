/**
 * Wave 1 — Tests for error humanization.
 */
import { describe, it, expect, vi } from 'vitest';
import { getHumanizedError, handleError } from './errorMessages';

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

describe('getHumanizedError', () => {
  it('humaniza erro de rede', () => {
    const r = getHumanizedError('Network request failed');
    expect(r.message).toMatch(/sem conexão/i);
    expect(r.fullMessage).toContain('.');
  });

  it('humaniza unauthorized/401', () => {
    const r = getHumanizedError('401 Unauthorized');
    expect(r.message).toMatch(/sessão expirou/i);
  });

  it('humaniza forbidden/403', () => {
    const r = getHumanizedError('403 Forbidden');
    expect(r.message).toMatch(/permissão/i);
  });

  it('humaniza foreign key violation', () => {
    const r = getHumanizedError('foreign key violation: x');
    expect(r.message).toMatch(/vinculado/i);
  });

  it('humaniza duplicate key', () => {
    const r = getHumanizedError('duplicate key value violates unique constraint');
    expect(r.message).toMatch(/já existe/i);
  });

  it('humaniza row-level security', () => {
    const r = getHumanizedError('new row violates row-level security policy');
    expect(r.message).toMatch(/salvar|acesso/i);
  });

  it('humaniza not found', () => {
    const r = getHumanizedError('404 not found');
    expect(r.message).toMatch(/não encontramos/i);
  });

  it('lida com Error instance', () => {
    const r = getHumanizedError(new Error('timeout'));
    expect(r.message).toMatch(/demorou/i);
  });

  it('lida com objetos arbitrários', () => {
    const r = getHumanizedError({ random: 'object' });
    expect(r.message).toBe('Algo deu errado');
  });

  it('default para erros desconhecidos', () => {
    const r = getHumanizedError('xyz unknown error abc');
    expect(r.message).toBe('Algo deu errado');
    expect(r.action).toBeDefined();
  });
});

describe('handleError', () => {
  it('chama sem lançar', async () => {
    const { toast } = await import('sonner');
    handleError(new Error('timeout'), { log: false });
    expect(toast.error).toHaveBeenCalled();
  });

  it('com contexto custom', () => {
    expect(() => handleError('xyz', { log: false, context: 'TestModule' })).not.toThrow();
  });
});
