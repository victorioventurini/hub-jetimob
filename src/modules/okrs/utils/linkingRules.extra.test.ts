/**
 * Additional tests for linkingRules — covers branches not yet exercised:
 * - validateKrToObjective
 * - validateContributionsLimit
 * - getKrTypeExplanation
 * - getLinkingRuleExplanation
 */
import { describe, it, expect } from 'vitest';
import {
  validateObjectiveToObjective,
  validateKrToObjective,
  validateKrToKr,
  validateObjectivesLimit,
  validateKrsLimit,
  validateContributionsLimit,
  getKrTypeExplanation,
  getLinkingRuleExplanation,
} from './linkingRules';

describe('linkingRules — extra coverage', () => {
  describe('validateObjectiveToObjective', () => {
    it('forbids org → team (wrong direction)', () => {
      const result = validateObjectiveToObjective('org', 'team');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('WRONG_DIRECTION');
    });

    it('forbids same level (team → team)', () => {
      const result = validateObjectiveToObjective('team', 'team');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('SAME_LEVEL');
    });

    it('allows team → org', () => {
      expect(validateObjectiveToObjective('team', 'org').isValid).toBe(true);
    });
  });

  describe('validateKrToObjective', () => {
    it('forbids KR → user objective', () => {
      const result = validateKrToObjective('team', 't1', 'user', null);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('KR_TO_USER_OBJECTIVE');
    });

    it('allows team KR → org objective', () => {
      const result = validateKrToObjective('team', 't1', 'org', null);
      expect(result.isValid).toBe(true);
      expect(result.warningMessage).toBeUndefined();
    });

    it('warns on team KR → team objective from different team', () => {
      const result = validateKrToObjective('team', 't1', 'team', 't2');
      expect(result.isValid).toBe(true);
      expect(result.warningMessage).toBeDefined();
    });

    it('does not warn on team KR → team objective from same team', () => {
      const result = validateKrToObjective('team', 't1', 'team', 't1');
      expect(result.isValid).toBe(true);
      expect(result.warningMessage).toBeUndefined();
    });
  });

  describe('validateKrToKr', () => {
    it('forbids same level KRs', () => {
      const result = validateKrToKr('contribution', 'team', 'team');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('SAME_LEVEL_KR');
    });

    it('forbids foundational team KR → org KR', () => {
      const result = validateKrToKr('foundational', 'team', 'org');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('FOUNDATIONAL_TO_ORG');
    });

    it('forbids enabler team KR → org KR', () => {
      const result = validateKrToKr('enabler', 'team', 'org');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('ENABLER_TO_ORG');
    });

    it('allows contribution team KR → org KR', () => {
      expect(validateKrToKr('contribution', 'team', 'org').isValid).toBe(true);
    });

    it('forbids org → team direction', () => {
      const result = validateKrToKr('contribution', 'org', 'team');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('WRONG_DIRECTION_KR');
    });
  });

  describe('limit validators', () => {
    it('validateObjectivesLimit returns within-limit when under cap', () => {
      const result = validateObjectivesLimit(0);
      expect(result.isWithinLimit).toBe(true);
      expect(result.warningMessage).toBeUndefined();
      expect(result.educationalMessage).toContain('OKR');
    });

    it('validateObjectivesLimit returns over-limit when at cap', () => {
      const result = validateObjectivesLimit(result_max());
      expect(result.isWithinLimit).toBe(false);
      expect(result.warningMessage).toBeDefined();
    });

    it('validateKrsLimit returns over-limit when at cap', () => {
      const result = validateKrsLimit(999);
      expect(result.isWithinLimit).toBe(false);
      expect(result.warningMessage).toContain('Limite');
    });

    it('validateContributionsLimit returns within-limit when under cap', () => {
      const result = validateContributionsLimit(0);
      expect(result.isWithinLimit).toBe(true);
      expect(result.warningMessage).toBeUndefined();
    });

    it('validateContributionsLimit returns over-limit at high counts', () => {
      const result = validateContributionsLimit(999);
      expect(result.isWithinLimit).toBe(false);
      expect(result.warningMessage).toContain('Limite');
    });
  });

  describe('getKrTypeExplanation', () => {
    it('returns explanation for contribution', () => {
      expect(getKrTypeExplanation('contribution')).toContain('organizacional');
    });
    it('returns explanation for enabler', () => {
      expect(getKrTypeExplanation('enabler')).toContain('Habilita');
    });
    it('returns explanation for foundational', () => {
      expect(getKrTypeExplanation('foundational')).toContain('pré-requisito');
    });
  });

  describe('getLinkingRuleExplanation', () => {
    it('explains team objective → org objective alignment', () => {
      const text = getLinkingRuleExplanation('objective', 'objective', 'team', 'org');
      expect(text).toContain('alinhamento');
    });

    it('explains generic objective hierarchy when not team→org', () => {
      const text = getLinkingRuleExplanation('objective', 'objective', 'org', 'team');
      expect(text).toContain('hierarquia');
    });

    it('explains team KR → org KR contribution', () => {
      const text = getLinkingRuleExplanation('kr', 'kr', 'team', 'org');
      expect(text).toContain('contribuição');
    });

    it('explains generic KR hierarchy when not team→org', () => {
      const text = getLinkingRuleExplanation('kr', 'kr', 'team', 'team');
      expect(text).toContain('ciclos');
    });

    it('returns generic message for other combinations', () => {
      const text = getLinkingRuleExplanation('objective', 'kr', 'team', 'org');
      expect(text).toContain('hierarquia');
    });
  });
});

// Helper to retrieve current MAX_OBJECTIVES_PER_TEAM without re-importing constant directly
function result_max(): number {
  // We probe by walking up until isWithinLimit flips
  for (let i = 1; i < 100; i++) {
    if (!validateObjectivesLimit(i).isWithinLimit) return i;
  }
  return 999;
}
