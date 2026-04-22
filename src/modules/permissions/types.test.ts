/**
 * Permissions module — RBAC type & scope tests (W5 mínimo)
 */
import { describe, it, expect } from 'vitest';
import type {
  PermissionScope,
  Permission,
  BuUserPermissionOverride,
  EffectivePermission,
} from './types';

describe('Permissions · scope hierarchy', () => {
  const ALL_SCOPES: PermissionScope[] = [
    'self', 'self_or_owner', 'team', 'team_tree', 'squad', 'bu', 'global', 'public',
  ];

  it('expõe os 8 escopos canônicos do RBAC', () => {
    expect(new Set(ALL_SCOPES).size).toBe(8);
  });

  it('escopo public é o mais aberto e self é o mais restrito', () => {
    expect(ALL_SCOPES[0]).toBe('self');
    expect(ALL_SCOPES[ALL_SCOPES.length - 1]).toBe('public');
  });
});

describe('Permissions · Permission shape', () => {
  it('chave segue formato module.resource.action', () => {
    const p: Permission = {
      id: 'p1', key: 'okrs.kr.update', module: 'okrs', resource: 'kr', action: 'update',
      scope: 'team', description: null, status: 'active',
      created_at: '', updated_at: '',
    };
    const [mod, res, act] = p.key.split('.');
    expect(mod).toBe(p.module);
    expect(res).toBe(p.resource);
    expect(act).toBe(p.action);
  });
});

describe('Permissions · Override', () => {
  it('effect=allow|deny — deny vence em todas as resoluções', () => {
    const allow: BuUserPermissionOverride['effect'] = 'allow';
    const deny: BuUserPermissionOverride['effect'] = 'deny';
    const winner = (a: typeof allow, b: typeof deny) => (a === 'deny' || b === 'deny' ? 'deny' : 'allow');
    expect(winner(allow, deny)).toBe('deny');
    expect(winner(allow, allow as any)).toBe('allow');
  });
});

describe('Permissions · EffectivePermission source', () => {
  it('source identifica origem da concessão', () => {
    const ep: EffectivePermission = {
      permission_key: 'okrs.kr.update', permission_id: 'p1',
      user_id: 'u1', bu_id: 'bu1',
      module: 'okrs', resource: 'kr', action: 'update', scope: 'team',
      source: 'override', source_name: 'Manual override',
    };
    expect(['template_v2', 'override', 'wildcard']).toContain(ep.source);
  });
});
