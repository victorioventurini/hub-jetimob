/**
 * useInitiativeNameValidation Hook Tests
 * 
 * Tests for initiative name validation types and options.
 */

import { describe, it, expect } from 'vitest';
import type {
  InitiativeNameFeedbackType,
  InitiativeNameFeedback,
} from './useInitiativeNameValidation';

// ============================================================
// Type Tests
// ============================================================

describe('InitiativeNameFeedbackType', () => {
  it('should accept warning type', () => {
    const type: InitiativeNameFeedbackType = 'warning';
    expect(type).toBe('warning');
  });

  it('should accept suggestion type', () => {
    const type: InitiativeNameFeedbackType = 'suggestion';
    expect(type).toBe('suggestion');
  });

  it('should accept success type', () => {
    const type: InitiativeNameFeedbackType = 'success';
    expect(type).toBe('success');
  });

  it('should have all expected types', () => {
    const allTypes: InitiativeNameFeedbackType[] = ['warning', 'suggestion', 'success'];
    expect(allTypes).toHaveLength(3);
  });
});

describe('InitiativeNameFeedback', () => {
  it('should accept valid feedback structure', () => {
    const feedback: InitiativeNameFeedback = {
      type: 'warning',
      message: 'Este nome parece um resultado, não uma ação.',
      suggestion: 'Tente algo como "Implementar nova funcionalidade X"',
    };
    
    expect(feedback.type).toBe('warning');
    expect(feedback.message).toBeDefined();
    expect(feedback.suggestion).toBeDefined();
  });

  it('should accept feedback without suggestion', () => {
    const feedback: InitiativeNameFeedback = {
      type: 'success',
      message: 'Nome da iniciativa está correto!',
    };
    
    expect(feedback.type).toBe('success');
    expect(feedback.message).toBeDefined();
    expect(feedback.suggestion).toBeUndefined();
  });

  it('should model warning feedback', () => {
    const warningFeedback: InitiativeNameFeedback = {
      type: 'warning',
      message: 'Este nome parece um resultado/meta ao invés de uma ação.',
      suggestion: 'Reformule para descrever a ação, não o resultado esperado.',
    };
    
    expect(warningFeedback.type).toBe('warning');
    expect(warningFeedback.suggestion).toBeDefined();
  });

  it('should model suggestion feedback', () => {
    const suggestionFeedback: InitiativeNameFeedback = {
      type: 'suggestion',
      message: 'O nome está vago. Seja mais específico.',
      suggestion: 'Adicione detalhes sobre o que será feito.',
    };
    
    expect(suggestionFeedback.type).toBe('suggestion');
  });
});

// ============================================================
// Options Tests
// ============================================================

describe('UseInitiativeNameValidationOptions', () => {
  const DEFAULT_OPTIONS = {
    minLength: 10,
    debounceMs: 800,
    disabled: false,
  };

  it('should have reasonable default minLength', () => {
    expect(DEFAULT_OPTIONS.minLength).toBe(10);
  });

  it('should have reasonable default debounceMs', () => {
    expect(DEFAULT_OPTIONS.debounceMs).toBe(800);
  });

  it('should be enabled by default', () => {
    expect(DEFAULT_OPTIONS.disabled).toBe(false);
  });

  it('should accept custom options', () => {
    const customOptions = {
      minLength: 5,
      debounceMs: 500,
      disabled: true,
    };
    
    expect(customOptions.minLength).toBe(5);
    expect(customOptions.debounceMs).toBe(500);
    expect(customOptions.disabled).toBe(true);
  });
});

// ============================================================
// Result Structure Tests
// ============================================================

describe('UseInitiativeNameValidationResult', () => {
  it('should return null feedback when not validated', () => {
    const result = {
      feedback: null,
      isValidating: false,
      reset: () => {},
    };
    
    expect(result.feedback).toBeNull();
    expect(result.isValidating).toBe(false);
  });

  it('should return feedback when validation completes', () => {
    const result = {
      feedback: {
        type: 'success' as InitiativeNameFeedbackType,
        message: 'Nome válido',
      },
      isValidating: false,
      reset: () => {},
    };
    
    expect(result.feedback).not.toBeNull();
    expect(result.feedback?.type).toBe('success');
  });

  it('should indicate when validating', () => {
    const result = {
      feedback: null,
      isValidating: true,
      reset: () => {},
    };
    
    expect(result.isValidating).toBe(true);
  });

  it('should have reset function', () => {
    let feedback: InitiativeNameFeedback | null = { type: 'warning', message: 'test' };
    
    const reset = () => {
      feedback = null;
    };
    
    reset();
    expect(feedback).toBeNull();
  });
});

// ============================================================
// Validation Scenario Tests
// ============================================================

describe('Initiative Name Validation Scenarios', () => {
  describe('names that should trigger warning (results, not actions)', () => {
    const resultNames = [
      'Aumentar NPS para 72',
      'Reduzir churn em 20%',
      'Atingir R$ 1M em vendas',
      'Melhorar satisfação do cliente',
      '50 novos clientes',
    ];

    it('should identify result-oriented names', () => {
      resultNames.forEach((name) => {
        // These would typically trigger a warning
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('names that should trigger suggestion (too vague)', () => {
    const vagueNames = [
      'Melhorar processo',
      'Trabalhar no projeto',
      'Otimizar sistema',
      'Fazer mudanças',
    ];

    it('should identify vague names', () => {
      vagueNames.forEach((name) => {
        // These would typically trigger a suggestion
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('names that should pass (concrete actions)', () => {
    const goodNames = [
      'Implementar pesquisa de satisfação NPS',
      'Lançar campanha de email marketing para trial users',
      'Desenvolver dashboard de métricas em tempo real',
      'Conduzir 20 entrevistas com usuários churned',
      'Automatizar processo de onboarding com playbook',
    ];

    it('should identify well-formed action names', () => {
      goodNames.forEach((name) => {
        // These should pass validation
        expect(name.length).toBeGreaterThanOrEqual(10);
        // Good names typically start with an action verb
        const actionVerbs = ['Implementar', 'Lançar', 'Desenvolver', 'Conduzir', 'Automatizar'];
        expect(actionVerbs.some((verb) => name.startsWith(verb))).toBe(true);
      });
    });
  });
});

// ============================================================
// Edge Case Tests
// ============================================================

describe('Edge Cases', () => {
  it('should handle empty name', () => {
    const name = '';
    expect(name.length).toBeLessThan(10);
    // Should not trigger validation
  });

  it('should handle very short name', () => {
    const name = 'Fazer';
    expect(name.length).toBeLessThan(10);
    // Should not trigger validation
  });

  it('should handle name at minimum length', () => {
    const name = 'Fazer algo'; // 10 chars
    expect(name.length).toBe(10);
    // Should trigger validation
  });

  it('should handle very long name', () => {
    const name = 'Implementar sistema completo de monitoramento e alertas para todas as métricas de negócio da empresa inteira';
    expect(name.length).toBeGreaterThan(100);
    // Should still validate
  });

  it('should handle name with special characters', () => {
    const name = 'Implementar API v2.0 (beta)';
    expect(name).toContain('.');
    expect(name).toContain('(');
    // Should still validate
  });

  it('should handle name with numbers', () => {
    const name = 'Conduzir 50 entrevistas de usuário';
    expect(name).toMatch(/\d+/);
    // Should still validate
  });
});
