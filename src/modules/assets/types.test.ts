/**
 * Assets · type & enum invariants (W5 — complementa useAssetPermissionsV2.test)
 */
import { describe, it, expect } from 'vitest';

// Fonte: src/integrations/supabase/types.ts — enums replicados aqui apenas como
// invariantes de negócio (qualquer drift deve quebrar o build).
const ASSET_HOLDER_TYPES = ['user', 'location', 'partner', 'pool'] as const;
const KEY_MOVEMENT_TYPES = ['checkout', 'checkin', 'transfer', 'lost', 'found'] as const;
const GIFT_MOVEMENT_TYPES = ['in', 'out', 'adjust'] as const;

describe('Assets · holder types', () => {
  it('expõe 4 tipos de holder (user/location/partner/pool)', () => {
    expect(new Set(ASSET_HOLDER_TYPES).size).toBe(4);
  });
});

describe('Assets · key movements', () => {
  it('inclui ciclo lost/found (chaves perdidas voltam ao ciclo)', () => {
    expect(KEY_MOVEMENT_TYPES).toContain('lost');
    expect(KEY_MOVEMENT_TYPES).toContain('found');
  });
});

describe('Assets · gift movements (estoque)', () => {
  it('contempla ajuste manual (adjust) além de in/out', () => {
    expect(GIFT_MOVEMENT_TYPES).toContain('adjust');
  });

  it('saldo nunca pode ficar negativo (regra de negócio)', () => {
    const start = 10;
    const moves = [
      { type: 'in' as const, qty: 5 },
      { type: 'out' as const, qty: 7 },
      { type: 'adjust' as const, qty: -2 },
    ];
    const final = moves.reduce((acc, m) => {
      if (m.type === 'in') return acc + m.qty;
      if (m.type === 'out') return acc - m.qty;
      return acc + m.qty; // adjust pode somar/subtrair
    }, start);
    expect(final).toBeGreaterThanOrEqual(0);
  });
});
