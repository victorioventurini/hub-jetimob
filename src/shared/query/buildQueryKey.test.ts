/**
 * Tests for buildQueryKey utilities (pure functions)
 */
import { describe, it, expect } from 'vitest';
import { 
  buildQueryKey, 
  buildListQueryKey, 
  buildDetailQueryKey, 
  getModuleQueryKey, 
  getListQueryKey 
} from './buildQueryKey';

describe('buildQueryKey', () => {
  it('should build key without params', () => {
    expect(buildQueryKey('tickets', 'list')).toEqual(['tickets', 'list']);
  });

  it('should build key with params', () => {
    const result = buildQueryKey('tickets', 'list', { buId: 'bu-1', page: 1 });
    expect(result).toEqual(['tickets', 'list', { buId: 'bu-1', page: 1 }]);
  });

  it('should sort params keys for stability', () => {
    const result1 = buildQueryKey('mod', 'list', { z: 1, a: 2, m: 3 });
    const result2 = buildQueryKey('mod', 'list', { a: 2, m: 3, z: 1 });
    expect(result1).toEqual(result2);
  });

  it('should handle empty params object', () => {
    expect(buildQueryKey('mod', 'list', {})).toEqual(['mod', 'list']);
  });

  it('should sort nested objects recursively', () => {
    const result = buildQueryKey('mod', 'list', { 
      filters: { z: true, a: false } 
    });
    const expected = buildQueryKey('mod', 'list', { 
      filters: { a: false, z: true } 
    });
    expect(result).toEqual(expected);
  });
});

describe('buildListQueryKey', () => {
  it('should strip null/undefined/empty values', () => {
    const result = buildListQueryKey('tickets', {
      buId: 'bu-1',
      q: '',
      status: undefined,
      page: 1,
    });
    // Only buId and page should remain
    expect(result).toEqual(['tickets', 'list', { buId: 'bu-1', page: 1 }]);
  });

  it('should keep valid values', () => {
    const result = buildListQueryKey('tickets', {
      buId: 'bu-1',
      q: 'search',
      status: 'open',
      page: 2,
      pageSize: 25,
    });
    expect(result[0]).toBe('tickets');
    expect(result[1]).toBe('list');
    const params = result[2] as Record<string, unknown>;
    expect(params.q).toBe('search');
    expect(params.status).toBe('open');
  });

  it('should keep zero as valid value', () => {
    const result = buildListQueryKey('mod', { page: 0 });
    const params = result[2] as Record<string, unknown>;
    expect(params.page).toBe(0);
  });
});

describe('buildDetailQueryKey', () => {
  it('should build detail key with id', () => {
    expect(buildDetailQueryKey('tickets', 'ticket-1')).toEqual([
      'tickets', 'detail', { id: 'ticket-1' }
    ]);
  });

  it('should return null detail for null id', () => {
    expect(buildDetailQueryKey('tickets', null)).toEqual([
      'tickets', 'detail', null
    ]);
  });

  it('should return null detail for undefined id', () => {
    expect(buildDetailQueryKey('tickets', undefined)).toEqual([
      'tickets', 'detail', null
    ]);
  });

  it('should merge additional params', () => {
    const result = buildDetailQueryKey('tickets', 'ticket-1', { include: 'messages' });
    const params = result[2] as Record<string, unknown>;
    expect(params.id).toBe('ticket-1');
    expect(params.include).toBe('messages');
  });
});

describe('getModuleQueryKey', () => {
  it('should return module-level key', () => {
    expect(getModuleQueryKey('tickets')).toEqual(['tickets']);
  });
});

describe('getListQueryKey', () => {
  it('should return list-level key', () => {
    expect(getListQueryKey('tickets')).toEqual(['tickets', 'list']);
  });
});
