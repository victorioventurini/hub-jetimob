/**
 * useTeams Hook Tests
 * 
 * Tests for teams CRUD operations and area_id integration.
 */

import { describe, it, expect } from 'vitest';
import { 
  createMockTeam, 
  createMockTeamFormData,
  TEAMS_FIXTURES 
} from '@/test/mocks/fixtures';

// ============================================================
// Fixtures Tests
// ============================================================

describe('Teams Fixtures', () => {
  describe('createMockTeam', () => {
    it('should create team with default values', () => {
      const team = createMockTeam();
      
      expect(team.id).toBeDefined();
      expect(team.bu_id).toBe('bu-test-123');
      expect(team.name).toBe('Test Team');
      expect(team.status).toBe('active');
      expect(team.deleted_at).toBeNull();
      expect(team.member_count).toBe(0);
      expect(team.area_id).toBeNull();
    });

    it('should create team with custom values', () => {
      const team = createMockTeam({
        id: 'custom-team',
        name: 'Custom Team',
        status: 'inactive',
        area_id: 'area-123',
      });
      
      expect(team.id).toBe('custom-team');
      expect(team.name).toBe('Custom Team');
      expect(team.status).toBe('inactive');
      expect(team.area_id).toBe('area-123');
    });

    it('should create leader relation when leader_user_id is provided', () => {
      const team = createMockTeam({
        leader_user_id: 'user-123',
      });
      
      expect(team.leader).toBeDefined();
      expect(team.leader?.id).toBe('user-123');
      expect(team.leader?.display_name).toBe('Team Leader');
    });

    it('should not create leader relation when leader_user_id is null', () => {
      const team = createMockTeam({
        leader_user_id: null,
      });
      
      expect(team.leader).toBeNull();
    });

    it('should support parent_team_id for hierarchy', () => {
      const team = createMockTeam({
        parent_team_id: 'parent-team-123',
      });
      
      expect(team.parent_team_id).toBe('parent-team-123');
    });

    it('should include checkin configuration fields', () => {
      const team = createMockTeam();
      
      expect(team.checkin_frequency).toBe('weekly');
      expect(team.checkin_day).toBe(1);
      expect(team.checkin_deadline_hour).toBe(18);
    });

    it('should allow custom checkin configuration', () => {
      const team = createMockTeam({
        checkin_frequency: 'biweekly',
        checkin_day: 5,
        checkin_deadline_hour: 12,
      });
      
      expect(team.checkin_frequency).toBe('biweekly');
      expect(team.checkin_day).toBe(5);
      expect(team.checkin_deadline_hour).toBe(12);
    });
  });

  describe('createMockTeamFormData', () => {
    it('should create form data with default values', () => {
      const formData = createMockTeamFormData();
      
      expect(formData.name).toBe('New Team');
      expect(formData.description).toBe('New team description');
      expect(formData.status).toBe('active');
      expect(formData.leader_user_id).toBeNull();
      expect(formData.parent_team_id).toBeNull();
      expect(formData.area_id).toBeNull();
    });

    it('should create form data with custom values including area_id', () => {
      const formData = createMockTeamFormData({
        name: 'Engineering',
        status: 'active',
        leader_user_id: 'user-123',
        area_id: 'area-technology',
      });
      
      expect(formData.name).toBe('Engineering');
      expect(formData.leader_user_id).toBe('user-123');
      expect(formData.area_id).toBe('area-technology');
    });
  });

  describe('TEAMS_FIXTURES', () => {
    it('should have predefined team fixtures', () => {
      expect(TEAMS_FIXTURES.engineering).toBeDefined();
      expect(TEAMS_FIXTURES.sales).toBeDefined();
      expect(TEAMS_FIXTURES.design).toBeDefined();
      expect(TEAMS_FIXTURES.frontend).toBeDefined();
      expect(TEAMS_FIXTURES.inactive).toBeDefined();
    });

    it('should have correct area associations', () => {
      expect(TEAMS_FIXTURES.engineering.area_id).toBe('area-technology');
      expect(TEAMS_FIXTURES.sales.area_id).toBe('area-revenue');
      expect(TEAMS_FIXTURES.design.area_id).toBe('area-product');
    });

    it('should have correct hierarchy for frontend team', () => {
      expect(TEAMS_FIXTURES.frontend.parent_team_id).toBe('team-engineering');
      expect(TEAMS_FIXTURES.frontend.area_id).toBe('area-technology');
    });

    it('should have inactive status for legacy team', () => {
      expect(TEAMS_FIXTURES.inactive.status).toBe('inactive');
    });

    it('should have member counts', () => {
      expect(TEAMS_FIXTURES.engineering.member_count).toBe(12);
      expect(TEAMS_FIXTURES.sales.member_count).toBe(8);
      expect(TEAMS_FIXTURES.design.member_count).toBe(5);
    });
  });
});

// ============================================================
// Area Integration Tests
// ============================================================

describe('Teams Area Integration', () => {
  describe('area_id field', () => {
    it('should be nullable (teams can exist without areas)', () => {
      const team = createMockTeam({ area_id: null });
      expect(team.area_id).toBeNull();
    });

    it('should accept valid area_id', () => {
      const team = createMockTeam({ area_id: 'area-technology' });
      expect(team.area_id).toBe('area-technology');
    });

    it('should be included in form data', () => {
      const formData = createMockTeamFormData({ area_id: 'area-revenue' });
      expect(formData.area_id).toBe('area-revenue');
    });
  });

  describe('Team-Area relationship', () => {
    it('should allow multiple teams in same area', () => {
      const team1 = createMockTeam({ id: 'team-1', area_id: 'area-tech' });
      const team2 = createMockTeam({ id: 'team-2', area_id: 'area-tech' });
      
      expect(team1.area_id).toBe(team2.area_id);
      expect(team1.id).not.toBe(team2.id);
    });

    it('should allow sub-teams to have same area as parent', () => {
      const parentTeam = createMockTeam({ 
        id: 'parent', 
        area_id: 'area-tech',
        parent_team_id: null,
      });
      const childTeam = createMockTeam({ 
        id: 'child', 
        area_id: 'area-tech',
        parent_team_id: 'parent',
      });
      
      expect(parentTeam.area_id).toBe(childTeam.area_id);
      expect(childTeam.parent_team_id).toBe(parentTeam.id);
    });
  });
});

// ============================================================
// Business Logic Tests
// ============================================================

describe('Teams Business Logic', () => {
  describe('Team Status', () => {
    it('should default to active status', () => {
      const team = createMockTeam();
      expect(team.status).toBe('active');
    });

    it('should support inactive status', () => {
      const team = createMockTeam({ status: 'inactive' });
      expect(team.status).toBe('inactive');
    });
  });

  describe('Team Hierarchy', () => {
    it('should support parent_team_id for sub-teams', () => {
      const team = createMockTeam({ parent_team_id: 'parent-123' });
      expect(team.parent_team_id).toBe('parent-123');
    });

    it('should default to null parent (root team)', () => {
      const team = createMockTeam();
      expect(team.parent_team_id).toBeNull();
    });

    it('should initialize empty child_teams array', () => {
      const team = createMockTeam();
      expect(team.child_teams).toEqual([]);
    });
  });

  describe('Soft Delete', () => {
    it('should default deleted_at to null', () => {
      const team = createMockTeam();
      expect(team.deleted_at).toBeNull();
    });

    it('should support soft delete timestamp', () => {
      const deletedAt = '2026-01-15T10:00:00.000Z';
      const team = createMockTeam({ deleted_at: deletedAt });
      expect(team.deleted_at).toBe(deletedAt);
    });
  });
});

// ============================================================
// Data Transformation Tests
// ============================================================

describe('Teams Data Transformations', () => {
  it('should preserve all required fields from mock', () => {
    const team = createMockTeam({
      id: 'test-id',
      bu_id: 'test-bu',
      name: 'Test',
      description: 'Test desc',
      status: 'active',
      area_id: 'area-123',
      parent_team_id: 'parent-123',
      leader_user_id: 'leader-123',
    });

    // Verify all fields are present
    expect(team.id).toBe('test-id');
    expect(team.bu_id).toBe('test-bu');
    expect(team.name).toBe('Test');
    expect(team.description).toBe('Test desc');
    expect(team.status).toBe('active');
    expect(team.area_id).toBe('area-123');
    expect(team.parent_team_id).toBe('parent-123');
    expect(team.leader_user_id).toBe('leader-123');
    expect(team.created_at).toBeDefined();
    expect(team.updated_at).toBeDefined();
  });

  it('should have consistent timestamp format', () => {
    const team = createMockTeam();
    
    // Should be ISO string format
    expect(team.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(team.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
