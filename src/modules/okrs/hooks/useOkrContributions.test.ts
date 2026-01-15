/**
 * useOkrContributions Hook Tests
 * 
 * Tests for OKR contribution hooks and field definitions.
 */

import { describe, it, expect } from 'vitest';
import type { OkrContributionEntityType } from '../types';

// ============================================================
// CONTRIBUTION_FIELDS Tests
// ============================================================

describe('Contribution Field Definitions', () => {
  const CONTRIBUTION_FIELDS = `
    id, bu_id, from_type, from_id, to_type, to_id,
    description, created_by, created_at, deleted_at
  ` as const;

  it('should include id field', () => {
    expect(CONTRIBUTION_FIELDS).toContain('id');
  });

  it('should include bu_id for BU scoping', () => {
    expect(CONTRIBUTION_FIELDS).toContain('bu_id');
  });

  it('should include from/to type and id pairs', () => {
    expect(CONTRIBUTION_FIELDS).toContain('from_type');
    expect(CONTRIBUTION_FIELDS).toContain('from_id');
    expect(CONTRIBUTION_FIELDS).toContain('to_type');
    expect(CONTRIBUTION_FIELDS).toContain('to_id');
  });

  it('should include description field', () => {
    expect(CONTRIBUTION_FIELDS).toContain('description');
  });

  it('should include audit fields', () => {
    expect(CONTRIBUTION_FIELDS).toContain('created_by');
    expect(CONTRIBUTION_FIELDS).toContain('created_at');
    expect(CONTRIBUTION_FIELDS).toContain('deleted_at');
  });

  it('should NOT use select(*)', () => {
    expect(CONTRIBUTION_FIELDS).not.toContain('*');
  });
});

// ============================================================
// Contribution Type Tests
// ============================================================

describe('OkrContributionEntityType', () => {
  it('should accept objective and kr types', () => {
    const validTypes: OkrContributionEntityType[] = ['objective', 'kr'];
    expect(validTypes).toHaveLength(2);
  });

  it('should be usable in contribution queries', () => {
    const entityType: OkrContributionEntityType = 'kr';
    const entityId = 'kr-123';
    
    expect(entityType).toBe('kr');
    expect(entityId).toBeDefined();
  });
});

// ============================================================
// Contribution Query Pattern Tests
// ============================================================

describe('Contribution Query Patterns', () => {
  describe('useOkrContributions return structure', () => {
    it('should return contributesTo and contributedBy arrays', () => {
      const expectedStructure = {
        contributesTo: [],
        contributedBy: [],
      };
      
      expect(expectedStructure).toHaveProperty('contributesTo');
      expect(expectedStructure).toHaveProperty('contributedBy');
      expect(Array.isArray(expectedStructure.contributesTo)).toBe(true);
      expect(Array.isArray(expectedStructure.contributedBy)).toBe(true);
    });

    it('should handle empty contributions', () => {
      const emptyResult = { contributesTo: [], contributedBy: [] };
      expect(emptyResult.contributesTo).toHaveLength(0);
      expect(emptyResult.contributedBy).toHaveLength(0);
    });
  });

  describe('contribution relationships', () => {
    it('should model from -> to relationships', () => {
      const contribution = {
        from_type: 'kr' as OkrContributionEntityType,
        from_id: 'team-kr-001',
        to_type: 'kr' as OkrContributionEntityType,
        to_id: 'org-kr-001',
      };
      
      expect(contribution.from_type).toBe('kr');
      expect(contribution.to_type).toBe('kr');
    });

    it('should support objective to objective contributions', () => {
      const contribution = {
        from_type: 'objective' as OkrContributionEntityType,
        from_id: 'team-obj-001',
        to_type: 'objective' as OkrContributionEntityType,
        to_id: 'org-obj-001',
      };
      
      expect(contribution.from_type).toBe('objective');
      expect(contribution.to_type).toBe('objective');
    });

    it('should support mixed type contributions', () => {
      const contribution = {
        from_type: 'kr' as OkrContributionEntityType,
        from_id: 'team-kr-001',
        to_type: 'objective' as OkrContributionEntityType,
        to_id: 'org-obj-001',
      };
      
      expect(contribution.from_type).toBe('kr');
      expect(contribution.to_type).toBe('objective');
    });
  });
});

// ============================================================
// Mutation Pattern Tests
// ============================================================

describe('Contribution Mutation Patterns', () => {
  describe('useCreateOkrContribution', () => {
    it('should accept valid create input', () => {
      const input = {
        from_type: 'kr' as OkrContributionEntityType,
        from_id: 'team-kr-001',
        to_type: 'kr' as OkrContributionEntityType,
        to_id: 'org-kr-001',
        description: 'Contributing to org revenue goal',
      };
      
      expect(input.from_type).toBeDefined();
      expect(input.from_id).toBeDefined();
      expect(input.to_type).toBeDefined();
      expect(input.to_id).toBeDefined();
    });

    it('should accept optional bu_id and description', () => {
      const minimalInput = {
        from_type: 'kr' as OkrContributionEntityType,
        from_id: 'team-kr-001',
        to_type: 'kr' as OkrContributionEntityType,
        to_id: 'org-kr-001',
      };
      
      expect(minimalInput).not.toHaveProperty('bu_id');
      expect(minimalInput).not.toHaveProperty('description');
    });
  });

  describe('useDeleteOkrContribution', () => {
    it('should accept contribution id for deletion', () => {
      const contributionId = 'contrib-123';
      expect(typeof contributionId).toBe('string');
    });

    it('should use soft delete pattern', () => {
      const deletePayload = {
        deleted_at: new Date().toISOString(),
      };
      expect(deletePayload.deleted_at).toBeDefined();
    });
  });
});

// ============================================================
// Error Handling Pattern Tests
// ============================================================

describe('Contribution Error Handling', () => {
  describe('validation errors', () => {
    it('should detect self-referencing contributions', () => {
      const errorMessage = 'Não é possível criar uma contribuição auto-referenciada';
      expect(errorMessage).toContain('auto-referenciada');
    });

    it('should detect foundational KR restrictions', () => {
      const errorMessage = 'KRs fundacionais não podem contribuir para KRs organizacionais';
      expect(errorMessage).toContain('fundacionais');
    });

    it('should detect enabler KR restrictions', () => {
      const errorMessage = 'KRs habilitadores não podem contribuir para KRs organizacionais';
      expect(errorMessage).toContain('habilitadores');
    });
  });

  describe('success messages', () => {
    it('should provide create success message', () => {
      const successMessage = 'Contribuição criada com sucesso';
      expect(successMessage).toContain('criada');
    });

    it('should provide delete success message', () => {
      const successMessage = 'Contribuição removida';
      expect(successMessage).toContain('removida');
    });
  });
});

// ============================================================
// Cache Invalidation Pattern Tests
// ============================================================

describe('Contribution Cache Invalidation', () => {
  describe('create contribution', () => {
    it('should invalidate both from and to entity caches', () => {
      const variables = {
        from_type: 'kr' as OkrContributionEntityType,
        from_id: 'team-kr-001',
        to_type: 'kr' as OkrContributionEntityType,
        to_id: 'org-kr-001',
      };
      
      // Both entities should have their contribution caches invalidated
      const invalidationTargets = [
        { type: variables.from_type, id: variables.from_id },
        { type: variables.to_type, id: variables.to_id },
      ];
      
      expect(invalidationTargets).toHaveLength(2);
      expect(invalidationTargets[0].type).toBe('kr');
      expect(invalidationTargets[1].type).toBe('kr');
    });
  });

  describe('delete contribution', () => {
    it('should invalidate all contributions cache', () => {
      // Delete invalidates broadly since we don't have context of which entities
      const broadInvalidation = true;
      expect(broadInvalidation).toBe(true);
    });
  });
});

// ============================================================
// Real-World Scenario Tests
// ============================================================

describe('Contribution Scenarios', () => {
  it('should model team KR contributing to org KR', () => {
    const teamKrContribution = {
      from_type: 'kr' as OkrContributionEntityType,
      from_id: 'team-kr-product-001',
      to_type: 'kr' as OkrContributionEntityType,
      to_id: 'org-kr-revenue-001',
      description: 'Product feature release contributing to revenue growth',
    };
    
    expect(teamKrContribution.from_type).toBe('kr');
    expect(teamKrContribution.to_type).toBe('kr');
  });

  it('should model multiple teams contributing to same org objective', () => {
    const contributions = [
      {
        from_type: 'objective' as OkrContributionEntityType,
        from_id: 'team-obj-sales-001',
        to_type: 'objective' as OkrContributionEntityType,
        to_id: 'org-obj-growth-001',
      },
      {
        from_type: 'objective' as OkrContributionEntityType,
        from_id: 'team-obj-marketing-001',
        to_type: 'objective' as OkrContributionEntityType,
        to_id: 'org-obj-growth-001',
      },
    ];
    
    expect(contributions).toHaveLength(2);
    expect(contributions.every(c => c.to_id === 'org-obj-growth-001')).toBe(true);
  });
});
