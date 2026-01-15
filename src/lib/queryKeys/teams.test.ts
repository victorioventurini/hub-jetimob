/**
 * Teams & Squads Query Keys Tests
 * 
 * Tests for teams and squads query keys structure and consistency.
 */

import { describe, it, expect } from 'vitest';
import { teamsKeys, squadsKeys, managersKeys, teamManagementKeys } from './teams';

// ============================================================
// teamsKeys Tests
// ============================================================

describe('teamsKeys', () => {
  describe('all', () => {
    it('should return consistent key with buId', () => {
      const key = teamsKeys.all('bu-123');
      expect(key).toEqual(['teams', 'bu-123']);
    });

    it('should handle null buId', () => {
      const key = teamsKeys.all(null);
      expect(key).toEqual(['teams', null]);
    });
  });

  describe('list', () => {
    it('should return key with buId and default includeInactive', () => {
      const key = teamsKeys.list('bu-123');
      expect(key).toEqual(['teams', 'list', 'bu-123', false]);
    });

    it('should return key with includeInactive true', () => {
      const key = teamsKeys.list('bu-123', true);
      expect(key).toEqual(['teams', 'list', 'bu-123', true]);
    });

    it('should return key with includeInactive false explicitly', () => {
      const key = teamsKeys.list('bu-123', false);
      expect(key).toEqual(['teams', 'list', 'bu-123', false]);
    });

    it('should handle null buId', () => {
      const key = teamsKeys.list(null);
      expect(key).toEqual(['teams', 'list', null, false]);
    });
  });

  describe('detail', () => {
    it('should return key with teamId', () => {
      const key = teamsKeys.detail('team-456');
      expect(key).toEqual(['team', 'team-456']);
    });

    it('should handle undefined teamId', () => {
      const key = teamsKeys.detail(undefined);
      expect(key).toEqual(['team', undefined]);
    });
  });

  describe('members', () => {
    it('should return key with teamId', () => {
      const key = teamsKeys.members('team-456');
      expect(key).toEqual(['teams', 'members', 'team-456']);
    });
  });

  describe('availableLeaders', () => {
    it('should return key with buId', () => {
      const key = teamsKeys.availableLeaders('bu-123');
      expect(key).toEqual(['available-leaders', 'bu-123']);
    });

    it('should handle null buId', () => {
      const key = teamsKeys.availableLeaders(null);
      expect(key).toEqual(['available-leaders', null]);
    });
  });
});

// ============================================================
// squadsKeys Tests
// ============================================================

describe('squadsKeys', () => {
  describe('all', () => {
    it('should return consistent key with buId', () => {
      const key = squadsKeys.all('bu-123');
      expect(key).toEqual(['squads', 'bu-123']);
    });

    it('should handle null buId', () => {
      const key = squadsKeys.all(null);
      expect(key).toEqual(['squads', null]);
    });
  });

  describe('byTeam', () => {
    it('should return key with teamId', () => {
      const key = squadsKeys.byTeam('team-456');
      expect(key).toEqual(['squads', 'byTeam', 'team-456']);
    });
  });

  describe('detail', () => {
    it('should return key with squadId', () => {
      const key = squadsKeys.detail('squad-789');
      expect(key).toEqual(['squads', 'detail', 'squad-789']);
    });
  });
});

// ============================================================
// managersKeys Tests
// ============================================================

describe('managersKeys', () => {
  describe('select', () => {
    it('should return key with buId', () => {
      const key = managersKeys.select('bu-123');
      expect(key).toEqual(['managers-select', 'bu-123']);
    });

    it('should handle null buId', () => {
      const key = managersKeys.select(null);
      expect(key).toEqual(['managers-select', null]);
    });
  });
});

// ============================================================
// teamManagementKeys Tests
// ============================================================

describe('teamManagementKeys', () => {
  describe('manageableTeams', () => {
    it('should return key with buId and userId', () => {
      const key = teamManagementKeys.manageableTeams('bu-123', 'user-456');
      expect(key).toEqual(['manageable-teams', 'bu-123', 'user-456']);
    });

    it('should handle null buId', () => {
      const key = teamManagementKeys.manageableTeams(null, 'user-456');
      expect(key).toEqual(['manageable-teams', null, 'user-456']);
    });

    it('should handle null userId', () => {
      const key = teamManagementKeys.manageableTeams('bu-123', null);
      expect(key).toEqual(['manageable-teams', 'bu-123', null]);
    });

    it('should handle both null', () => {
      const key = teamManagementKeys.manageableTeams(null, null);
      expect(key).toEqual(['manageable-teams', null, null]);
    });
  });
});

// ============================================================
// Key Uniqueness Tests
// ============================================================

describe('Query Key Uniqueness', () => {
  it('should generate unique keys for different entities', () => {
    const teamKey = teamsKeys.detail('entity-123');
    const squadKey = squadsKeys.detail('entity-123');
    
    expect(teamKey).not.toEqual(squadKey);
    expect(teamKey[0]).toBe('team');
    expect(squadKey[0]).toBe('squads');
  });

  it('should generate different keys for list vs detail', () => {
    const listKey = teamsKeys.list('bu-123');
    const detailKey = teamsKeys.detail('bu-123');
    
    expect(listKey).not.toEqual(detailKey);
    expect(listKey[1]).toBe('list');
    expect(detailKey[0]).toBe('team');
  });
});
