/**
 * Query Keys Tests
 * 
 * Tests for OKRs query keys structure and consistency.
 */

import { describe, it, expect } from 'vitest';
import { okrsKeys, kpisKeys } from './okrs';

// ============================================================
// okrsKeys Tests
// ============================================================

describe('okrsKeys', () => {
  describe('prefix helpers', () => {
    it('should return consistent prefix for orgObjectives', () => {
      const prefix = okrsKeys.orgObjectivesPrefix();
      expect(prefix).toEqual(['okr-org-objectives']);
    });

    it('should return consistent prefix for orgKeyResults', () => {
      const prefix = okrsKeys.orgKeyResultsPrefix();
      expect(prefix).toEqual(['okr-org-key-results']);
    });

    it('should return consistent prefix for teamObjectives', () => {
      const prefix = okrsKeys.teamObjectivesPrefix();
      expect(prefix).toEqual(['okr-team-objectives']);
    });

    it('should return consistent prefix for teamKeyResults', () => {
      const prefix = okrsKeys.teamKeyResultsPrefix();
      expect(prefix).toEqual(['okr-team-key-results']);
    });

    it('should return consistent prefix for dashboardData', () => {
      const prefix = okrsKeys.dashboardDataPrefix();
      expect(prefix).toEqual(['okr-dashboard-data']);
    });
  });

  describe('org level keys', () => {
    it('should create orgObjectives key with buId and year', () => {
      const key = okrsKeys.orgObjectives('bu-123', 2026);
      expect(key).toEqual(['okr-org-objectives', 'bu-123', 2026]);
    });

    it('should handle null buId in orgObjectives', () => {
      const key = okrsKeys.orgObjectives(null, 2026);
      expect(key).toEqual(['okr-org-objectives', null, 2026]);
    });

    it('should create orgObjective key with id', () => {
      const key = okrsKeys.orgObjective('obj-123');
      expect(key).toEqual(['okr-org-objective', 'obj-123']);
    });

    it('should create orgKeyResults key with buId and objectiveId', () => {
      const key = okrsKeys.orgKeyResults('bu-123', 'obj-456');
      expect(key).toEqual(['okr-org-key-results', 'bu-123', 'obj-456']);
    });
  });

  describe('team level keys', () => {
    it('should create teamObjectives key with buId and teamId', () => {
      const key = okrsKeys.teamObjectives('bu-123', 'team-456');
      expect(key).toEqual(['okr-team-objectives', 'bu-123', 'team-456']);
    });

    it('should create teamKeyResults key', () => {
      const key = okrsKeys.teamKeyResults('bu-123', 'team-456');
      expect(key).toEqual(['okr-team-key-results', 'bu-123', 'team-456']);
    });

    it('should create myTeamKeyResults key with userId', () => {
      const key = okrsKeys.myTeamKeyResults('bu-123', 'user-789');
      expect(key).toEqual(['okr-my-team-key-results', 'bu-123', 'user-789']);
    });
  });

  describe('checkin keys', () => {
    it('should create checkins key with krId', () => {
      const key = okrsKeys.checkins('kr-123');
      expect(key).toEqual(['okr-checkins', 'kr-123']);
    });

    it('should create pendingCheckins key with buId and teamId', () => {
      const key = okrsKeys.pendingCheckins('bu-123', 'team-456');
      expect(key).toEqual(['pending-checkins', 'bu-123', 'team-456']);
    });

    it('should create checkinSummary key', () => {
      const key = okrsKeys.checkinSummary('bu-123');
      expect(key).toEqual(['checkin-summary', 'bu-123']);
    });
  });

  describe('initiative keys', () => {
    it('should create initiatives key with krId', () => {
      const key = okrsKeys.initiatives('kr-123');
      expect(key).toEqual(['okr-initiatives', 'kr-123']);
    });

    it('should create initiativeDetail key', () => {
      const key = okrsKeys.initiativeDetail('init-123');
      expect(key).toEqual(['okr-initiative', 'init-123']);
    });

    it('should create initiativesCount key', () => {
      const key = okrsKeys.initiativesCount('kr-123');
      expect(key).toEqual(['okr-initiatives', 'count', 'kr-123']);
    });

    it('should create initiativesByUser key', () => {
      const key = okrsKeys.initiativesByUser('profile-123');
      expect(key).toEqual(['okr-initiatives', 'user', 'profile-123']);
    });

    it('should create initiativesByStatus key', () => {
      const key = okrsKeys.initiativesByStatus('bu-123', 'in_progress');
      expect(key).toEqual(['okr-initiatives', 'status', 'bu-123', 'in_progress']);
    });

    it('should create initiativesAll key', () => {
      const key = okrsKeys.initiativesAll();
      expect(key).toEqual(['okr-initiatives']);
    });
  });

  describe('cycle keys', () => {
    it('should create cyclesList key', () => {
      const key = okrsKeys.cyclesList('bu-123');
      expect(key).toEqual(['cycles-list', 'bu-123']);
    });

    it('should create cycleDetail key', () => {
      const key = okrsKeys.cycleDetail('cycle-123');
      expect(key).toEqual(['okr-cycle', 'cycle-123']);
    });

    it('should handle null cycleId in cycleDetail', () => {
      const key = okrsKeys.cycleDetail(null);
      expect(key).toEqual(['okr-cycle', null]);
    });
  });

  describe('dashboard keys', () => {
    it('should create dashboard key with buId and teamId', () => {
      const key = okrsKeys.dashboard('bu-123', 'team-456');
      expect(key).toEqual(['okr-dashboard', 'bu-123', 'team-456']);
    });

    it('should create dashboardData key with all parameters', () => {
      const key = okrsKeys.dashboardData('bu-123', 2026, 'team', 'team-456');
      expect(key).toEqual(['okr-dashboard-data', 'bu-123', 2026, 'team', 'team-456']);
    });
  });

  describe('wizard keys', () => {
    it('should create wizardSession key', () => {
      const key = okrsKeys.wizardSession('user-123');
      expect(key).toEqual(['okr-wizard-session', 'user-123']);
    });

    it('should create wizardDraft key', () => {
      const key = okrsKeys.wizardDraft('user-123');
      expect(key).toEqual(['okr-wizard-draft', 'user-123']);
    });

    it('should create wizardDraftGeneric key', () => {
      const key = okrsKeys.wizardDraftGeneric('user-123', 'team-okr');
      expect(key).toEqual(['okr-wizard-draft-generic', 'user-123', 'team-okr']);
    });

    it('should create wizardUserKrs key', () => {
      const key = okrsKeys.wizardUserKrs('bu-123', 'cycle-456', 'profile-789', 'pending');
      expect(key).toEqual(['okr-wizard-user-krs', 'bu-123', 'cycle-456', 'profile-789', 'pending']);
    });
  });

  describe('health and insights keys', () => {
    it('should create health key', () => {
      const key = okrsKeys.health('bu-123', 'team', 'obj-456');
      expect(key).toEqual(['okr-health', 'bu-123', 'team', 'obj-456']);
    });

    it('should create insights key with scope', () => {
      const key = okrsKeys.insights('bu-123', 'team', 'team-456');
      expect(key).toEqual(['okr-insights', 'bu-123', 'team', 'team-456']);
    });

    it('should create insights key without scope', () => {
      const key = okrsKeys.insights('bu-123');
      expect(key).toEqual(['okr-insights', 'bu-123']);
    });
  });

  describe('manageable teams keys', () => {
    it('should create manageableTeams key', () => {
      const key = okrsKeys.manageableTeams('bu-123', 'user-456');
      expect(key).toEqual(['okr-manageable-teams', 'bu-123', 'user-456']);
    });

    it('should create myTeamId key', () => {
      const key = okrsKeys.myTeamId('bu-123', 'user-456');
      expect(key).toEqual(['my-team-id', 'bu-123', 'user-456']);
    });
  });
});

// ============================================================
// kpisKeys Tests
// ============================================================

describe('kpisKeys', () => {
  it('should create all key with buId', () => {
    const key = kpisKeys.all('bu-123');
    expect(key).toEqual(['kpis', 'bu-123']);
  });

  it('should create list key with filters', () => {
    const filters = { category: 'sales', status: 'active' };
    const key = kpisKeys.list('bu-123', filters);
    expect(key).toEqual(['kpis', 'list', 'bu-123', filters]);
  });

  it('should create detail key', () => {
    const key = kpisKeys.detail('kpi-123');
    expect(key).toEqual(['kpis', 'detail', 'kpi-123']);
  });

  it('should create values key', () => {
    const key = kpisKeys.values('kpi-123');
    expect(key).toEqual(['kpis', 'values', 'kpi-123']);
  });

  it('should create sources key', () => {
    const key = kpisKeys.sources('bu-123');
    expect(key).toEqual(['kpis', 'sources', 'bu-123']);
  });

  it('should create categories key', () => {
    const key = kpisKeys.categories('bu-123');
    expect(key).toEqual(['kpis', 'categories', 'bu-123']);
  });
});

// ============================================================
// Key Consistency Tests
// ============================================================

describe('query key consistency', () => {
  it('should ensure prefixes are subsets of full keys', () => {
    const orgObjPrefix = okrsKeys.orgObjectivesPrefix();
    const orgObjFull = okrsKeys.orgObjectives('bu-123', 2026);
    
    expect(orgObjFull[0]).toBe(orgObjPrefix[0]);
  });

  it('should ensure team prefix matches team keys', () => {
    const teamObjPrefix = okrsKeys.teamObjectivesPrefix();
    const teamObjFull = okrsKeys.teamObjectives('bu-123', 'team-456');
    
    expect(teamObjFull[0]).toBe(teamObjPrefix[0]);
  });

  it('should ensure dashboard prefix matches dashboard keys', () => {
    const dashPrefix = okrsKeys.dashboardDataPrefix();
    const dashFull = okrsKeys.dashboardData('bu-123', 2026, 'org');
    
    expect(dashFull[0]).toBe(dashPrefix[0]);
  });

  it('should return readonly arrays', () => {
    const key = okrsKeys.orgObjectives('bu-123', 2026);
    // TypeScript should prevent mutations, but we can verify the structure
    expect(Array.isArray(key)).toBe(true);
    expect(key.length).toBe(3);
  });
});
