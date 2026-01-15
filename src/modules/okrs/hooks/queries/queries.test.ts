/**
 * OKR Queries Tests
 * 
 * Tests for query field definitions and data transformation utilities
 * used across OKR query hooks.
 */

import { describe, it, expect } from 'vitest';
import { OKR_FIELDS, OKR_JOINED_FIELDS } from './useOkrQueries';

// ============================================================
// OKR_FIELDS Tests
// ============================================================

describe('OKR_FIELDS', () => {
  describe('structure validation', () => {
    it('should have orgObjective field definition', () => {
      expect(OKR_FIELDS.orgObjective).toBeDefined();
      expect(typeof OKR_FIELDS.orgObjective).toBe('string');
    });

    it('should have orgKr field definition', () => {
      expect(OKR_FIELDS.orgKr).toBeDefined();
      expect(typeof OKR_FIELDS.orgKr).toBe('string');
    });

    it('should have orgObjectiveWithKrs field definition', () => {
      expect(OKR_FIELDS.orgObjectiveWithKrs).toBeDefined();
      expect(typeof OKR_FIELDS.orgObjectiveWithKrs).toBe('string');
    });

    it('should have teamObjective field definition', () => {
      expect(OKR_FIELDS.teamObjective).toBeDefined();
      expect(typeof OKR_FIELDS.teamObjective).toBe('string');
    });

    it('should have teamObjectiveWithKrs field definition', () => {
      expect(OKR_FIELDS.teamObjectiveWithKrs).toBeDefined();
      expect(typeof OKR_FIELDS.teamObjectiveWithKrs).toBe('string');
    });

    it('should have teamKr field definition', () => {
      expect(OKR_FIELDS.teamKr).toBeDefined();
      expect(typeof OKR_FIELDS.teamKr).toBe('string');
    });

    it('should have checkin field definition', () => {
      expect(OKR_FIELDS.checkin).toBeDefined();
      expect(typeof OKR_FIELDS.checkin).toBe('string');
    });
  });

  describe('field content validation', () => {
    it('should include id field in all definitions', () => {
      expect(OKR_FIELDS.orgObjective).toContain('id');
      expect(OKR_FIELDS.orgKr).toContain('id');
      expect(OKR_FIELDS.teamObjective).toContain('id');
      expect(OKR_FIELDS.teamKr).toContain('id');
      expect(OKR_FIELDS.checkin).toContain('id');
    });

    it('should include title field in objective and KR definitions', () => {
      expect(OKR_FIELDS.orgObjective).toContain('title');
      expect(OKR_FIELDS.orgKr).toContain('title');
      expect(OKR_FIELDS.teamObjective).toContain('title');
      expect(OKR_FIELDS.teamKr).toContain('title');
    });

    it('should include status field in relevant definitions', () => {
      expect(OKR_FIELDS.orgObjective).toContain('status');
      expect(OKR_FIELDS.orgKr).toContain('status');
      expect(OKR_FIELDS.teamObjective).toContain('status');
      expect(OKR_FIELDS.teamKr).toContain('status');
    });

    it('should include owner relation in KR definitions with nested queries', () => {
      expect(OKR_FIELDS.orgKr).toContain('owner');
      expect(OKR_FIELDS.orgObjectiveWithKrs).toContain('owner');
      expect(OKR_FIELDS.teamObjectiveWithKrs).toContain('owner');
    });

    it('should include metric fields in KR definitions', () => {
      expect(OKR_FIELDS.orgKr).toContain('baseline');
      expect(OKR_FIELDS.orgKr).toContain('current_value');
      expect(OKR_FIELDS.orgKr).toContain('target');
      expect(OKR_FIELDS.teamKr).toContain('baseline');
      expect(OKR_FIELDS.teamKr).toContain('current_value');
      expect(OKR_FIELDS.teamKr).toContain('target');
    });

    it('should include direction field in KR definitions', () => {
      expect(OKR_FIELDS.orgKr).toContain('direction');
      expect(OKR_FIELDS.teamKr).toContain('direction');
    });

    it('should include timestamp fields', () => {
      expect(OKR_FIELDS.orgObjective).toContain('created_at');
      expect(OKR_FIELDS.orgObjective).toContain('updated_at');
    });

    it('should NOT contain select(*) patterns', () => {
      // Per project rules: avoid select('*')
      Object.values(OKR_FIELDS).forEach((field) => {
        expect(field).not.toContain('*');
      });
    });

    it('should include bu_id for BU scoping', () => {
      expect(OKR_FIELDS.orgObjective).toContain('bu_id');
      expect(OKR_FIELDS.orgKr).toContain('bu_id');
      expect(OKR_FIELDS.teamObjective).toContain('bu_id');
      expect(OKR_FIELDS.teamKr).toContain('bu_id');
    });
  });

  describe('relation definitions', () => {
    it('should include owner relation with proper FK hint in org KR', () => {
      expect(OKR_FIELDS.orgKr).toContain('owner:profiles');
      expect(OKR_FIELDS.orgKr).toContain('display_name');
    });

    it('should include team relation in team objective with KRs', () => {
      expect(OKR_FIELDS.teamObjectiveWithKrs).toContain('team:teams');
    });

    it('should include key_results nested relation', () => {
      expect(OKR_FIELDS.orgObjectiveWithKrs).toContain('key_results');
      expect(OKR_FIELDS.teamObjectiveWithKrs).toContain('key_results');
    });
  });

  describe('soft delete support', () => {
    it('should include deleted_at for soft delete', () => {
      expect(OKR_FIELDS.orgObjective).toContain('deleted_at');
      expect(OKR_FIELDS.orgKr).toContain('deleted_at');
      expect(OKR_FIELDS.teamObjective).toContain('deleted_at');
      expect(OKR_FIELDS.teamKr).toContain('deleted_at');
    });

    it('should include cancelled_at for cancelled KRs', () => {
      expect(OKR_FIELDS.orgKr).toContain('cancelled_at');
      expect(OKR_FIELDS.teamKr).toContain('cancelled_at');
    });
  });
});

// ============================================================
// OKR_JOINED_FIELDS Tests
// ============================================================

describe('OKR_JOINED_FIELDS', () => {
  it('should have teamObjectiveWithTeam field definition', () => {
    expect(OKR_JOINED_FIELDS.teamObjectiveWithTeam).toBeDefined();
    expect(typeof OKR_JOINED_FIELDS.teamObjectiveWithTeam).toBe('string');
  });

  it('should have teamKrWithRelations field definition', () => {
    expect(OKR_JOINED_FIELDS.teamKrWithRelations).toBeDefined();
    expect(typeof OKR_JOINED_FIELDS.teamKrWithRelations).toBe('string');
  });

  it('should include team relation in teamObjectiveWithTeam', () => {
    expect(OKR_JOINED_FIELDS.teamObjectiveWithTeam).toContain('team:teams');
  });

  it('should include multiple relations in teamKrWithRelations', () => {
    expect(OKR_JOINED_FIELDS.teamKrWithRelations).toContain('team:teams');
    expect(OKR_JOINED_FIELDS.teamKrWithRelations).toContain('owner:profiles');
    expect(OKR_JOINED_FIELDS.teamKrWithRelations).toContain('team_objective:okr_team_objectives');
  });
});

// ============================================================
// Team Key Result Specific Fields Tests
// ============================================================

describe('Team Key Result specific fields', () => {
  it('should include co_responsibles array', () => {
    expect(OKR_FIELDS.teamKr).toContain('co_responsibles');
  });

  it('should include linked_org_kr_id for contribution tracking', () => {
    expect(OKR_FIELDS.teamKr).toContain('linked_org_kr_id');
  });

  it('should include type field for KR categorization', () => {
    expect(OKR_FIELDS.teamKr).toContain('type');
  });

  it('should include last_checkin_at for tracking', () => {
    expect(OKR_FIELDS.teamKr).toContain('last_checkin_at');
  });

  it('should include evidence_url for documentation', () => {
    expect(OKR_FIELDS.teamKr).toContain('evidence_url');
  });

  it('should include parent_kr_id for hierarchy', () => {
    expect(OKR_FIELDS.teamKr).toContain('parent_kr_id');
  });

  it('should include metric_id for KPI linking', () => {
    expect(OKR_FIELDS.teamKr).toContain('metric_id');
  });
});

// ============================================================
// Checkin Specific Fields Tests
// ============================================================

describe('Checkin specific fields', () => {
  it('should include value tracking fields', () => {
    expect(OKR_FIELDS.checkin).toContain('previous_value');
    expect(OKR_FIELDS.checkin).toContain('current_value');
  });

  it('should include confidence field', () => {
    expect(OKR_FIELDS.checkin).toContain('confidence');
  });

  it('should include feedback fields', () => {
    expect(OKR_FIELDS.checkin).toContain('blockers');
    expect(OKR_FIELDS.checkin).toContain('comments');
  });

  it('should include kr_id and kr_type for polymorphic relation', () => {
    expect(OKR_FIELDS.checkin).toContain('kr_id');
    expect(OKR_FIELDS.checkin).toContain('kr_type');
  });

  it('should include user_id for attribution', () => {
    expect(OKR_FIELDS.checkin).toContain('user_id');
  });

  it('should include date field', () => {
    expect(OKR_FIELDS.checkin).toContain('date');
  });
});

// ============================================================
// Team Objective Specific Fields Tests
// ============================================================

describe('Team Objective specific fields', () => {
  it('should include is_shared flag for shared objectives', () => {
    expect(OKR_FIELDS.teamObjective).toContain('is_shared');
  });

  it('should include responsibility_model for ownership model', () => {
    expect(OKR_FIELDS.teamObjective).toContain('responsibility_model');
  });

  it('should include org_objective_id for alignment', () => {
    expect(OKR_FIELDS.teamObjective).toContain('org_objective_id');
  });
});

// ============================================================
// Type Safety Tests
// ============================================================

describe('Type Safety', () => {
  it('should define fields as const strings', () => {
    // Verify fields are string literals (not computed)
    Object.values(OKR_FIELDS).forEach((field) => {
      expect(typeof field).toBe('string');
      expect(field.length).toBeGreaterThan(0);
    });
  });

  it('should have OKR_FIELDS object with expected keys', () => {
    const expectedKeys = [
      'orgObjective',
      'orgObjectiveWithKrs',
      'orgKr',
      'teamObjective',
      'teamObjectiveWithKrs',
      'teamKr',
      'checkin',
    ];

    expectedKeys.forEach((key) => {
      expect(OKR_FIELDS).toHaveProperty(key);
    });
  });

  it('should have OKR_JOINED_FIELDS object with expected keys', () => {
    const expectedKeys = [
      'teamObjectiveWithTeam',
      'teamKrWithRelations',
    ];

    expectedKeys.forEach((key) => {
      expect(OKR_JOINED_FIELDS).toHaveProperty(key);
    });
  });
});
