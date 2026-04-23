/**
 * Wave 2 — Tests for URL schemas & config factories.
 */
import { describe, it, expect } from 'vitest';
import {
  zodSchemas,
  searchConfig,
  tabConfig,
  statusConfig,
  pageConfig,
  pageSizeConfig,
  sortConfig,
  sortDirConfig,
  yearConfig,
  idConfig,
  booleanConfig,
  paginationSchema,
  listingSchema,
  createNamespacedSchema,
  combineSchemas,
} from './schemas';

describe('zodSchemas', () => {
  it('page mínimo 1', () => {
    expect(zodSchemas.page.safeParse(1).success).toBe(true);
    expect(zodSchemas.page.safeParse(0).success).toBe(false);
  });
  it('pageSize 1-100', () => {
    expect(zodSchemas.pageSize.safeParse(50).success).toBe(true);
    expect(zodSchemas.pageSize.safeParse(101).success).toBe(false);
  });
  it('sortDirection', () => {
    expect(zodSchemas.sortDirection.safeParse('asc').success).toBe(true);
    expect(zodSchemas.sortDirection.safeParse('xyz').success).toBe(false);
  });
  it('year range', () => {
    expect(zodSchemas.year.safeParse(2026).success).toBe(true);
    expect(zodSchemas.year.safeParse(1800).success).toBe(false);
  });
  it('uuid', () => {
    expect(zodSchemas.uuid.safeParse('a-b-c').success).toBe(false);
  });
});

describe('searchConfig', () => {
  it('default vazio com debounce', () => {
    const c = searchConfig();
    expect(c.key).toBe('q');
    expect(c.defaultValue).toBe('');
    expect(c.debounceMs).toBe(300);
  });
  it('aceita key e debounce custom', () => {
    const c = searchConfig('search', 500);
    expect(c.key).toBe('search');
    expect(c.debounceMs).toBe(500);
  });
});

describe('tabConfig', () => {
  it('preserva default', () => {
    const c = tabConfig('overview');
    expect(c.defaultValue).toBe('overview');
    expect(c.parse('details')).toBe('details');
    expect(c.serialize('x' as never)).toBe('x');
  });
});

describe('statusConfig', () => {
  it('serializa "all" como null', () => {
    const c = statusConfig<'all' | 'active'>('all');
    expect(c.serialize('all' as never)).toBeNull();
    expect(c.serialize('active' as never)).toBe('active');
  });
});

describe('pageConfig', () => {
  it('parse com fallback', () => {
    const c = pageConfig(1);
    expect(c.parse('5')).toBe(5);
    expect(c.parse('abc')).toBe(1);
  });
});

describe('pageSizeConfig', () => {
  it('clamp 1-100', () => {
    const c = pageSizeConfig(25);
    expect(c.parse('50')).toBe(50);
    expect(c.parse('500')).toBe(100);
    expect(c.parse('0')).toBe(1);
  });
});

describe('sortConfig & sortDirConfig', () => {
  it('sort default empty', () => {
    expect(sortConfig().defaultValue).toBe('');
  });
  it('sortDir valida enum', () => {
    const c = sortDirConfig('desc');
    expect(c.parse('asc')).toBe('asc');
    expect(c.parse('xyz')).toBe('desc');
  });
});

describe('yearConfig', () => {
  it('default = ano atual', () => {
    const current = new Date().getFullYear();
    expect(yearConfig().defaultValue).toBe(current);
  });
});

describe('idConfig & booleanConfig', () => {
  it('idConfig', () => {
    const c = idConfig('teamId', 'abc');
    expect(c.key).toBe('teamId');
    expect(c.defaultValue).toBe('abc');
  });
  it('booleanConfig', () => {
    const c = booleanConfig('open');
    expect(c.parse('true')).toBe(true);
    expect(c.serialize(false)).toBe('false');
  });
});

describe('paginationSchema & listingSchema', () => {
  it('possui keys esperados', () => {
    expect(paginationSchema.page.key).toBe('page');
    expect(listingSchema.q.key).toBe('q');
    expect(listingSchema.sort).toBeDefined();
  });
});

describe('createNamespacedSchema', () => {
  it('prefixa keys com namespace', () => {
    const ns = createNamespacedSchema('tickets', listingSchema);
    expect(ns.q.key).toBe('tickets.q');
    expect(ns.page.key).toBe('tickets.page');
    // não muta original
    expect(listingSchema.q.key).toBe('q');
  });
});

describe('combineSchemas', () => {
  it('mescla múltiplos schemas', () => {
    const r = combineSchemas(paginationSchema, { extra: idConfig('extra') });
    expect((r as any).page).toBeDefined();
    expect((r as any).extra.key).toBe('extra');
  });
});
