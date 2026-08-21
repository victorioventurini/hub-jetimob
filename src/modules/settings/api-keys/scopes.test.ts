import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BU_API_MODULES,
  allScopes,
  isValidScope,
  scopesFromLevels,
  levelsFromScopes,
  describeScopes,
} from './scopes';

describe('bu api scopes', () => {
  it('write implica read', () => {
    expect(scopesFromLevels({ kpis: 'write' })).toEqual(['kpis:read', 'kpis:write']);
    expect(scopesFromLevels({ users: 'write' })).toEqual(['users:read']);
    expect(scopesFromLevels({ okrs: 'none' })).toEqual([]);
  });

  it('converte escopos de volta em níveis', () => {
    expect(levelsFromScopes(['kpis:read', 'kpis:write']).kpis).toBe('write');
    expect(levelsFromScopes(['okrs:read']).okrs).toBe('read');
    expect(levelsFromScopes([]).tickets).toBe('none');
  });

  it('valida escopos', () => {
    expect(isValidScope('kpis:write')).toBe(true);
    expect(isValidScope('users:write')).toBe(false);
    expect(isValidScope('foo:read')).toBe(false);
  });

  it('descreve escopos em português', () => {
    expect(describeScopes(['kpis:read', 'kpis:write'])).toContain('leitura e escrita');
    expect(describeScopes([])).toBe('Nenhum módulo liberado');
  });

  it('permanece em sincronia com o catálogo do backend', () => {
    const edgeSource = readFileSync(
      resolve(process.cwd(), 'supabase/functions/_shared/bu-api-scopes.ts'),
      'utf-8',
    );
    for (const mod of BU_API_MODULES) {
      expect(edgeSource).toContain(`key: '${mod.key}'`);
      expect(edgeSource).toContain(`supportsWrite: ${mod.supportsWrite}`);
    }
    // Nenhum módulo extra no backend
    const edgeKeys = [...edgeSource.matchAll(/^\s{4}key: '([a-z_]+)',$/gm)].map((m) => m[1]);
    expect(edgeKeys.sort()).toEqual(BU_API_MODULES.map((m) => m.key).sort());
    expect(allScopes().length).toBeGreaterThan(0);
  });
});
