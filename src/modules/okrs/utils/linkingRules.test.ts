/**
 * OKR Linking Rules Tests
 * 
 * Tests for OKR hierarchy and linking validation functions.
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
  OKR_LIMITS,
} from './linkingRules';

describe('validateObjectiveToObjective', () => {
  describe('allowed links', () => {
    it('should allow Team → Org objective linking', () => {
      const result = validateObjectiveToObjective('team', 'org');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });
  });

  describe('forbidden links', () => {
    it('should forbid Org → Team objective linking', () => {
      const result = validateObjectiveToObjective('org', 'team');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('WRONG_DIRECTION');
      expect(result.errorMessage).toContain('direção correta');
    });

    it('should forbid same-level linking (org → org)', () => {
      const result = validateObjectiveToObjective('org', 'org');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('SAME_LEVEL');
      expect(result.errorMessage).toContain('mesmo nível');
    });

    it('should forbid same-level linking (team → team)', () => {
      const result = validateObjectiveToObjective('team', 'team');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('SAME_LEVEL');
    });

    it('should forbid same-level linking (user → user)', () => {
      const result = validateObjectiveToObjective('user', 'user');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('SAME_LEVEL');
    });
  });
});

describe('validateKrToObjective', () => {
  describe('allowed links', () => {
    it('should allow Team KR → Org Objective', () => {
      const result = validateKrToObjective('team', 'team-1', 'org', null);
      expect(result.isValid).toBe(true);
    });

    it('should allow Team KR → same Team Objective', () => {
      const result = validateKrToObjective('team', 'team-1', 'team', 'team-1');
      expect(result.isValid).toBe(true);
      expect(result.warningMessage).toBeUndefined();
    });
  });

  describe('forbidden links', () => {
    it('should forbid KR → User Objective', () => {
      const result = validateKrToObjective('team', 'team-1', 'user', null);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('KR_TO_USER_OBJECTIVE');
    });
  });

  describe('warnings', () => {
    it('should warn when Team KR → different Team Objective', () => {
      const result = validateKrToObjective('team', 'team-1', 'team', 'team-2');
      expect(result.isValid).toBe(true);
      expect(result.warningMessage).toContain('outro time');
    });
  });
});

describe('validateKrToKr', () => {
  describe('allowed links', () => {
    it('should allow Team KR (contribution) → Org KR', () => {
      const result = validateKrToKr('contribution', 'team', 'org');
      expect(result.isValid).toBe(true);
    });
  });

  describe('forbidden links', () => {
    it('should forbid Team KR (foundational) → Org KR', () => {
      const result = validateKrToKr('foundational', 'team', 'org');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('FOUNDATIONAL_TO_ORG');
      expect(result.errorMessage).toContain('fundacionais');
    });

    it('should forbid Team KR (enabler) → Org KR', () => {
      const result = validateKrToKr('enabler', 'team', 'org');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('ENABLER_TO_ORG');
      expect(result.errorMessage).toContain('habilitadores');
    });

    it('should forbid same-level KR linking (team → team)', () => {
      const result = validateKrToKr('contribution', 'team', 'team');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('SAME_LEVEL_KR');
    });

    it('should forbid same-level KR linking (org → org)', () => {
      const result = validateKrToKr('contribution', 'org', 'org');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('SAME_LEVEL_KR');
    });

    it('should forbid Org KR → Team KR (wrong direction)', () => {
      const result = validateKrToKr('contribution', 'org', 'team');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('WRONG_DIRECTION_KR');
    });
  });
});

describe('OKR Limits', () => {
  describe('OKR_LIMITS constants', () => {
    it('should have MAX_OBJECTIVES_PER_TEAM = 3', () => {
      expect(OKR_LIMITS.MAX_OBJECTIVES_PER_TEAM).toBe(3);
    });

    it('should have MAX_KRS_PER_OBJECTIVE = 3', () => {
      expect(OKR_LIMITS.MAX_KRS_PER_OBJECTIVE).toBe(3);
    });

    it('should have MAX_CONTRIBUTIONS_PER_KR = 3', () => {
      expect(OKR_LIMITS.MAX_CONTRIBUTIONS_PER_KR).toBe(3);
    });
  });

  describe('validateObjectivesLimit', () => {
    it('should be within limit when count is 0', () => {
      const result = validateObjectivesLimit(0);
      expect(result.isWithinLimit).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.maxCount).toBe(3);
      expect(result.warningMessage).toBeUndefined();
    });

    it('should be within limit when count is 2', () => {
      const result = validateObjectivesLimit(2);
      expect(result.isWithinLimit).toBe(true);
    });

    it('should NOT be within limit when count is 3', () => {
      const result = validateObjectivesLimit(3);
      expect(result.isWithinLimit).toBe(false);
      expect(result.warningMessage).toContain('Limite atingido');
      expect(result.warningMessage).toContain('3/3');
    });

    it('should NOT be within limit when count is 4', () => {
      const result = validateObjectivesLimit(4);
      expect(result.isWithinLimit).toBe(false);
    });

    it('should always include educational message', () => {
      const result = validateObjectivesLimit(0);
      expect(result.educationalMessage).toContain('metodologia OKR');
      expect(result.educationalMessage).toContain('foco');
    });
  });

  describe('validateKrsLimit', () => {
    it('should be within limit when count is 2', () => {
      const result = validateKrsLimit(2);
      expect(result.isWithinLimit).toBe(true);
    });

    it('should NOT be within limit when count is 3', () => {
      const result = validateKrsLimit(3);
      expect(result.isWithinLimit).toBe(false);
      expect(result.warningMessage).toContain('3/3');
    });

    it('should include educational message about objective scope', () => {
      const result = validateKrsLimit(0);
      expect(result.educationalMessage).toContain('objetivo pode estar amplo');
    });
  });

  describe('validateContributionsLimit', () => {
    it('should be within limit when count is 2', () => {
      const result = validateContributionsLimit(2);
      expect(result.isWithinLimit).toBe(true);
    });

    it('should NOT be within limit when count is 3', () => {
      const result = validateContributionsLimit(3);
      expect(result.isWithinLimit).toBe(false);
      expect(result.warningMessage).toContain('3/3');
    });

    it('should include educational message about prioritization', () => {
      const result = validateContributionsLimit(0);
      expect(result.educationalMessage).toContain('priorização');
    });
  });
});

describe('getKrTypeExplanation', () => {
  it('should explain contribution type', () => {
    const explanation = getKrTypeExplanation('contribution');
    expect(explanation).toContain('diretamente');
    expect(explanation).toContain('KR organizacional');
  });

  it('should explain enabler type', () => {
    const explanation = getKrTypeExplanation('enabler');
    expect(explanation).toContain('Habilita');
    expect(explanation).toContain('outros KRs');
  });

  it('should explain foundational type', () => {
    const explanation = getKrTypeExplanation('foundational');
    expect(explanation).toContain('pré-requisito');
    expect(explanation).toContain('fundação');
  });
});

describe('getLinkingRuleExplanation', () => {
  describe('objective to objective', () => {
    it('should explain Team → Org objective link', () => {
      const explanation = getLinkingRuleExplanation('objective', 'objective', 'team', 'org');
      expect(explanation).toContain('alinhamento estratégico');
    });

    it('should explain forbidden objective links', () => {
      const explanation = getLinkingRuleExplanation('objective', 'objective', 'org', 'team');
      expect(explanation).toContain('hierarquia');
      expect(explanation).toContain('Time → Organização');
    });
  });

  describe('kr to kr', () => {
    it('should explain Team → Org KR link', () => {
      const explanation = getLinkingRuleExplanation('kr', 'kr', 'team', 'org');
      expect(explanation).toContain('contribuição');
      expect(explanation).toContain('habilitadores');
    });

    it('should explain forbidden KR links', () => {
      const explanation = getLinkingRuleExplanation('kr', 'kr', 'team', 'team');
      expect(explanation).toContain('ciclos');
    });
  });

  describe('default explanation', () => {
    it('should provide default explanation for unknown combinations', () => {
      const explanation = getLinkingRuleExplanation('objective', 'kr', 'team', 'org');
      expect(explanation).toContain('hierarquia clara');
    });
  });
});
