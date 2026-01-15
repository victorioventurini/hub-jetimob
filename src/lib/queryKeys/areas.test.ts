/**
 * Areas Query Keys Tests
 * 
 * Tests for areas query keys structure and consistency.
 */

import { describe, it, expect } from 'vitest';
import { areasKeys } from './areas';

// ============================================================
// areasKeys Tests
// ============================================================

describe('areasKeys', () => {
  describe('all', () => {
    it('should return consistent prefix with buId', () => {
      const key = areasKeys.all('bu-123');
      expect(key).toEqual(['areas', 'bu-123']);
    });

    it('should handle null buId', () => {
      const key = areasKeys.all(null);
      expect(key).toEqual(['areas', null]);
    });
  });

  describe('list', () => {
    it('should return key with buId and default includeInactive', () => {
      const key = areasKeys.list('bu-123');
      expect(key).toEqual(['areas', 'list', 'bu-123', false]);
    });

    it('should return key with includeInactive true', () => {
      const key = areasKeys.list('bu-123', true);
      expect(key).toEqual(['areas', 'list', 'bu-123', true]);
    });

    it('should return key with includeInactive false explicitly', () => {
      const key = areasKeys.list('bu-123', false);
      expect(key).toEqual(['areas', 'list', 'bu-123', false]);
    });

    it('should handle null buId', () => {
      const key = areasKeys.list(null);
      expect(key).toEqual(['areas', 'list', null, false]);
    });

    it('should handle null buId with includeInactive', () => {
      const key = areasKeys.list(null, true);
      expect(key).toEqual(['areas', 'list', null, true]);
    });
  });

  describe('detail', () => {
    it('should return key with areaId', () => {
      const key = areasKeys.detail('area-456');
      expect(key).toEqual(['areas', 'detail', 'area-456']);
    });

    it('should handle undefined areaId', () => {
      const key = areasKeys.detail(undefined);
      expect(key).toEqual(['areas', 'detail', undefined]);
    });
  });

  describe('teams', () => {
    it('should return key with areaId for teams relationship', () => {
      const key = areasKeys.teams('area-456');
      expect(key).toEqual(['areas', 'teams', 'area-456']);
    });
  });
});

// ============================================================
// Key Consistency Tests
// ============================================================

describe('Areas Key Consistency', () => {
  it('should have consistent prefix for all keys', () => {
    const allKey = areasKeys.all('bu-123');
    const listKey = areasKeys.list('bu-123');
    const detailKey = areasKeys.detail('area-456');
    const teamsKey = areasKeys.teams('area-456');
    
    expect(allKey[0]).toBe('areas');
    expect(listKey[0]).toBe('areas');
    expect(detailKey[0]).toBe('areas');
    expect(teamsKey[0]).toBe('areas');
  });

  it('should generate unique keys for different operations', () => {
    const listKey = areasKeys.list('bu-123');
    const detailKey = areasKeys.detail('bu-123');
    const teamsKey = areasKeys.teams('bu-123');
    
    expect(listKey).not.toEqual(detailKey);
    expect(listKey).not.toEqual(teamsKey);
    expect(detailKey).not.toEqual(teamsKey);
  });

  it('should distinguish between same ID in different contexts', () => {
    const id = 'entity-123';
    const detailKey = areasKeys.detail(id);
    const teamsKey = areasKeys.teams(id);
    
    expect(detailKey[1]).toBe('detail');
    expect(teamsKey[1]).toBe('teams');
  });
});

// ============================================================
// Type Safety Tests
// ============================================================

describe('Areas Key Type Safety', () => {
  it('should return readonly tuples', () => {
    const key = areasKeys.list('bu-123', true);
    
    // TypeScript ensures these are readonly
    expect(key.length).toBe(4);
    expect(Array.isArray(key)).toBe(true);
  });

  it('should preserve exact types in key structure', () => {
    const keyWithTrue = areasKeys.list('bu-123', true);
    const keyWithFalse = areasKeys.list('bu-123', false);
    
    expect(keyWithTrue[3]).toBe(true);
    expect(keyWithFalse[3]).toBe(false);
    expect(typeof keyWithTrue[3]).toBe('boolean');
  });
});
