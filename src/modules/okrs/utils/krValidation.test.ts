/**
 * KR Validation Tests
 * 
 * Tests for Key Result validation functions.
 */

import { describe, it, expect } from 'vitest';
import {
  validateKrTitle,
  validateKrValues,
  validateTeamKr,
  validateOrgKr,
  validateKrMetrics,
  canKrTypeContributeToOrg,
  getKrTypeContributionExplanation,
  getRandomPlaceholder,
  ORG_KR_PLACEHOLDERS,
  TEAM_KR_PLACEHOLDERS,
} from './krValidation';

describe('validateKrTitle', () => {
  describe('activity word detection', () => {
    it('should warn when title starts with activity word "criar"', () => {
      const result = validateKrTitle('Criar dashboard de vendas');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings.some(w => w.includes('parece uma atividade'))).toBe(true);
    });

    it('should warn when title starts with activity word "implementar"', () => {
      const result = validateKrTitle('Implementar nova feature');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('implementar'))).toBe(true);
    });

    it('should warn when title starts with activity word "desenvolver"', () => {
      const result = validateKrTitle('Desenvolver API de integração');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('desenvolver'))).toBe(true);
    });

    it('should not warn when activity word appears in the middle', () => {
      const result = validateKrTitle('Aumentar vendas ao criar mais leads');
      expect(result.warnings.some(w => w.includes('criar'))).toBe(false);
    });
  });

  describe('measurable indicator detection', () => {
    it('should not warn when title has measurable word "aumentar"', () => {
      const result = validateKrTitle('Aumentar vendas em 20%');
      expect(result.warnings.filter(w => w.includes('verbo de resultado'))).toHaveLength(0);
    });

    it('should not warn when title has measurable word "reduzir"', () => {
      const result = validateKrTitle('Reduzir churn para 2%');
      expect(result.warnings.filter(w => w.includes('verbo de resultado'))).toHaveLength(0);
    });

    it('should not warn when title contains a number', () => {
      const result = validateKrTitle('Atingir NPS de 75 pontos');
      expect(result.warnings.filter(w => w.includes('verbo de resultado'))).toHaveLength(0);
    });

    it('should warn when title has no measurable indicator', () => {
      const result = validateKrTitle('Melhorar a experiência do cliente');
      // "melhorar" is in MEASURABLE_WORDS, so it should not warn
      expect(result.warnings.filter(w => w.includes('verbo de resultado'))).toHaveLength(0);
    });

    it('should warn when title is vague without numbers', () => {
      const result = validateKrTitle('Ter sucesso no projeto');
      expect(result.warnings.some(w => w.includes('verbo de resultado') || w.includes('número'))).toBe(true);
    });
  });

  describe('combined validation', () => {
    it('should always return isValid=true for title validation', () => {
      // Title validation only produces warnings, never errors
      const result1 = validateKrTitle('Criar algo');
      const result2 = validateKrTitle('Vago');
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should handle empty string', () => {
      const result = validateKrTitle('');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle whitespace-only string', () => {
      const result = validateKrTitle('   ');
      expect(result.isValid).toBe(true);
    });
  });
});

describe('validateKrValues', () => {
  describe('baseline equals target', () => {
    it('should error when baseline equals target', () => {
      const result = validateKrValues(100, 100, 'up');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('não pode ser igual');
    });

    it('should error for zero values that are equal', () => {
      const result = validateKrValues(0, 0, 'up');
      expect(result.isValid).toBe(false);
    });
  });

  describe('direction coherence', () => {
    it('should warn when direction is up but target < baseline', () => {
      const result = validateKrValues(100, 50, 'up');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('direção é crescente');
    });

    it('should warn when direction is down but target > baseline', () => {
      const result = validateKrValues(50, 100, 'down');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('direção é decrescente');
    });

    it('should not warn when direction is up and target > baseline', () => {
      const result = validateKrValues(0, 100, 'up');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should not warn when direction is down and target < baseline', () => {
      const result = validateKrValues(100, 50, 'down');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle negative values', () => {
      const result = validateKrValues(-100, -50, 'up');
      expect(result.isValid).toBe(true);
    });

    it('should handle decimal values', () => {
      const result = validateKrValues(1.5, 3.5, 'up');
      expect(result.isValid).toBe(true);
    });
  });
});

describe('canKrTypeContributeToOrg', () => {
  it('should return true for contribution type', () => {
    expect(canKrTypeContributeToOrg('contribution')).toBe(true);
  });

  it('should return false for enabler type', () => {
    expect(canKrTypeContributeToOrg('enabler')).toBe(false);
  });

  it('should return false for foundational type', () => {
    expect(canKrTypeContributeToOrg('foundational')).toBe(false);
  });
});

describe('getKrTypeContributionExplanation', () => {
  it('should return correct explanation for contribution', () => {
    const explanation = getKrTypeContributionExplanation('contribution');
    expect(explanation).toContain('vinculados a KRs organizacionais');
  });

  it('should return correct explanation for enabler', () => {
    const explanation = getKrTypeContributionExplanation('enabler');
    expect(explanation).toContain('não contribuem diretamente');
  });

  it('should return correct explanation for foundational', () => {
    const explanation = getKrTypeContributionExplanation('foundational');
    expect(explanation).toContain('não contribuem para KRs organizacionais');
  });
});

describe('validateTeamKr', () => {
  const validTitle = 'Aumentar conversão em 20%';
  const baseline = 10;
  const target = 30;
  const direction = 'up' as const;

  it('should return valid for correct inputs with org objective', () => {
    const result = validateTeamKr(validTitle, baseline, target, direction, true);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should error when no org objective is linked', () => {
    const result = validateTeamKr(validTitle, baseline, target, direction, false);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('objetivo organizacional'))).toBe(true);
  });

  it('should error when contribution type is linked to org KR but type is foundational', () => {
    const result = validateTeamKr(
      validTitle,
      baseline,
      target,
      direction,
      true,
      'foundational',
      'org-kr-123'
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('foundational'))).toBe(true);
  });

  it('should error when enabler type is linked to org KR', () => {
    const result = validateTeamKr(
      validTitle,
      baseline,
      target,
      direction,
      true,
      'enabler',
      'org-kr-123'
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('enabler'))).toBe(true);
  });

  it('should be valid when contribution type is linked to org KR', () => {
    const result = validateTeamKr(
      validTitle,
      baseline,
      target,
      direction,
      true,
      'contribution',
      'org-kr-123'
    );
    expect(result.isValid).toBe(true);
  });

  it('should combine title and value validation errors', () => {
    const result = validateTeamKr('Criar algo', 100, 100, 'up', true);
    // baseline === target → error
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('não pode ser igual'))).toBe(true);
    // Activity word → warning
    expect(result.warnings.some(w => w.includes('criar'))).toBe(true);
  });
});

describe('validateOrgKr', () => {
  it('should return valid for correct inputs', () => {
    const result = validateOrgKr('Aumentar MRR em 30%', 100000, 130000, 'up');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should combine title and value validations', () => {
    const result = validateOrgKr('Fazer algo', 100, 100, 'up');
    expect(result.isValid).toBe(false); // baseline === target
    expect(result.warnings.length).toBeGreaterThan(0); // activity word
  });
});

describe('validateKrMetrics', () => {
  it('should warn when no primary KPI is set', () => {
    const result = validateKrMetrics(null, []);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('KPI primário');
  });

  it('should be valid with primary KPI and no guardrails', () => {
    const result = validateKrMetrics('kpi-1', []);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should be valid with primary KPI and different guardrails', () => {
    const result = validateKrMetrics('kpi-1', ['kpi-2', 'kpi-3']);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should error when primary KPI is also a guardrail', () => {
    const result = validateKrMetrics('kpi-1', ['kpi-1', 'kpi-2']);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('primário não pode ser também um guardrail'))).toBe(true);
  });

  it('should error when guardrail KPIs have duplicates', () => {
    const result = validateKrMetrics('kpi-1', ['kpi-2', 'kpi-2', 'kpi-3']);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('mesmo KPI guardrail'))).toBe(true);
  });
});

describe('getRandomPlaceholder', () => {
  it('should return a placeholder from ORG_KR_PLACEHOLDERS for org KRs', () => {
    const placeholder = getRandomPlaceholder(true);
    expect(ORG_KR_PLACEHOLDERS).toContain(placeholder);
  });

  it('should return a placeholder from TEAM_KR_PLACEHOLDERS for team KRs', () => {
    const placeholder = getRandomPlaceholder(false);
    expect(TEAM_KR_PLACEHOLDERS).toContain(placeholder);
  });
});
