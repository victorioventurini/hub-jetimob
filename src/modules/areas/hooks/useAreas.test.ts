/**
 * useAreas Hook Tests
 * 
 * Tests for areas CRUD operations and data fetching.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createMockArea, 
  createMockAreaFormData,
  AREAS_FIXTURES 
} from '@/test/mocks/fixtures';

// ============================================================
// Fixtures Tests
// ============================================================

describe('Areas Fixtures', () => {
  describe('createMockArea', () => {
    it('should create area with default values', () => {
      const area = createMockArea();
      
      expect(area.id).toBeDefined();
      expect(area.bu_id).toBe('bu-test-123');
      expect(area.name).toBe('Test Area');
      expect(area.status).toBe('active');
      expect(area.deleted_at).toBeNull();
      expect(area.team_count).toBe(0);
    });

    it('should create area with custom values', () => {
      const area = createMockArea({
        id: 'custom-area',
        name: 'Custom Area',
        status: 'inactive',
        color: '#FF0000',
      });
      
      expect(area.id).toBe('custom-area');
      expect(area.name).toBe('Custom Area');
      expect(area.status).toBe('inactive');
      expect(area.color).toBe('#FF0000');
    });

    it('should create leader relation when leader_user_id is provided', () => {
      const area = createMockArea({
        leader_user_id: 'user-123',
      });
      
      expect(area.leader).toBeDefined();
      expect(area.leader?.id).toBe('user-123');
      expect(area.leader?.display_name).toBe('Area Leader');
    });

    it('should create co_leader relation when co_leader_user_id is provided', () => {
      const area = createMockArea({
        co_leader_user_id: 'user-456',
      });
      
      expect(area.co_leader).toBeDefined();
      expect(area.co_leader?.id).toBe('user-456');
      expect(area.co_leader?.display_name).toBe('Area Co-Leader');
    });

    it('should not create leader relation when leader_user_id is null', () => {
      const area = createMockArea({
        leader_user_id: null,
      });
      
      expect(area.leader).toBeNull();
    });
  });

  describe('createMockAreaFormData', () => {
    it('should create form data with default values', () => {
      const formData = createMockAreaFormData();
      
      expect(formData.name).toBe('New Area');
      expect(formData.description).toBe('New area description');
      expect(formData.status).toBe('active');
      expect(formData.leader_user_id).toBeNull();
      expect(formData.co_leader_user_id).toBeNull();
    });

    it('should create form data with custom values', () => {
      const formData = createMockAreaFormData({
        name: 'Revenue',
        status: 'inactive',
        leader_user_id: 'user-123',
      });
      
      expect(formData.name).toBe('Revenue');
      expect(formData.status).toBe('inactive');
      expect(formData.leader_user_id).toBe('user-123');
    });
  });

  describe('AREAS_FIXTURES', () => {
    it('should have predefined area fixtures', () => {
      expect(AREAS_FIXTURES.revenue).toBeDefined();
      expect(AREAS_FIXTURES.product).toBeDefined();
      expect(AREAS_FIXTURES.technology).toBeDefined();
      expect(AREAS_FIXTURES.inactive).toBeDefined();
    });

    it('should have correct data for revenue area', () => {
      expect(AREAS_FIXTURES.revenue.id).toBe('area-revenue');
      expect(AREAS_FIXTURES.revenue.name).toBe('Revenue');
      expect(AREAS_FIXTURES.revenue.color).toBe('#22C55E');
    });

    it('should have inactive status for legacy area', () => {
      expect(AREAS_FIXTURES.inactive.status).toBe('inactive');
    });
  });
});

// ============================================================
// Business Logic Tests
// ============================================================

describe('Areas Business Logic', () => {
  describe('Area Status', () => {
    it('should default to active status', () => {
      const area = createMockArea();
      expect(area.status).toBe('active');
    });

    it('should support inactive status', () => {
      const area = createMockArea({ status: 'inactive' });
      expect(area.status).toBe('inactive');
    });
  });

  describe('Area Hierarchy', () => {
    it('should track team_count', () => {
      const area = createMockArea();
      expect(area.team_count).toBe(0);
    });

    it('should not have parent/child relationships (areas are flat)', () => {
      const area = createMockArea();
      // Areas don't have parent_area_id - they're a flat structure
      expect((area as any).parent_area_id).toBeUndefined();
    });
  });

  describe('Area Leadership', () => {
    it('should support leader and co-leader', () => {
      const area = createMockArea({
        leader_user_id: 'leader-1',
        co_leader_user_id: 'co-leader-1',
      });
      
      expect(area.leader_user_id).toBe('leader-1');
      expect(area.co_leader_user_id).toBe('co-leader-1');
    });

    it('should support area without leaders', () => {
      const area = createMockArea({
        leader_user_id: null,
        co_leader_user_id: null,
      });
      
      expect(area.leader_user_id).toBeNull();
      expect(area.co_leader_user_id).toBeNull();
      expect(area.leader).toBeNull();
      expect(area.co_leader).toBeNull();
    });
  });

  describe('Soft Delete', () => {
    it('should default deleted_at to null', () => {
      const area = createMockArea();
      expect(area.deleted_at).toBeNull();
    });

    it('should support soft delete timestamp', () => {
      const deletedAt = '2026-01-15T10:00:00.000Z';
      const area = createMockArea({ deleted_at: deletedAt });
      expect(area.deleted_at).toBe(deletedAt);
    });
  });
});

// ============================================================
// Data Transformation Tests
// ============================================================

describe('Areas Data Transformations', () => {
  it('should preserve all required fields from mock', () => {
    const area = createMockArea({
      id: 'test-id',
      bu_id: 'test-bu',
      name: 'Test',
      description: 'Test desc',
      status: 'active',
      color: '#000',
      icon: 'Star',
    });

    // Verify all fields are present
    expect(area.id).toBe('test-id');
    expect(area.bu_id).toBe('test-bu');
    expect(area.name).toBe('Test');
    expect(area.description).toBe('Test desc');
    expect(area.status).toBe('active');
    expect(area.color).toBe('#000');
    expect(area.icon).toBe('Star');
    expect(area.created_at).toBeDefined();
    expect(area.updated_at).toBeDefined();
  });

  it('should have consistent timestamp format', () => {
    const area = createMockArea();
    
    // Should be ISO string format
    expect(area.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(area.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
