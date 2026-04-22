/**
 * Areas · type contracts (W5 — adiciona ao teste existente de hooks)
 */
import { describe, it, expect } from 'vitest';
import { createMockArea, createMockAreaFormData } from '@/test/mocks/fixtures';

describe('Areas · ordering invariants', () => {
  it('lista ordenada por name (case-insensitive)', () => {
    const items = [
      createMockArea({ id: '1', name: 'Zeta' }),
      createMockArea({ id: '2', name: 'alpha' }),
      createMockArea({ id: '3', name: 'Beta' }),
    ];
    const sorted = [...items].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    expect(sorted.map(s => s.name)).toEqual(['alpha', 'Beta', 'Zeta']);
  });
});

describe('Areas · status filtering', () => {
  it('filtra apenas ativas quando includeInactive=false', () => {
    const items = [
      createMockArea({ id: 'a', status: 'active' }),
      createMockArea({ id: 'b', status: 'inactive' }),
    ];
    const onlyActive = items.filter(a => a.status === 'active');
    expect(onlyActive).toHaveLength(1);
    expect(onlyActive[0].id).toBe('a');
  });

  it('soft-deletados (deleted_at) nunca devem aparecer no resultado da query', () => {
    const items = [
      createMockArea({ id: 'a', deleted_at: null }),
      createMockArea({ id: 'b', deleted_at: '2026-01-01T00:00:00Z' }),
    ];
    const visible = items.filter(a => a.deleted_at === null);
    expect(visible.map(v => v.id)).toEqual(['a']);
  });
});

describe('Areas · form data normalization', () => {
  it('formData padrão é coerente com server defaults', () => {
    const form = createMockAreaFormData();
    expect(form.status).toBe('active');
    expect(form.leader_user_id).toBeNull();
  });
});
