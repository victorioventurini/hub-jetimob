/**
 * Testes unitários do visibilityEvaluator.
 *
 * Função pura: decide se uma seção é exibida baseado em contexto.
 */

import { describe, it, expect } from 'vitest';
import { isVisible } from '../visibilityEvaluator';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

function dec(id: string): TeamCheckinDecision {
  return {
    id,
    text: `dec-${id}`,
    category: 'decision',
    createdAt: new Date().toISOString(),
    createdBy: 'tester',
  } as unknown as TeamCheckinDecision;
}

describe('isVisible', () => {
  it('always: sempre visível', () => {
    expect(isVisible('always', {})).toBe(true);
  });

  describe('hasCarryOver', () => {
    it('false sem carry-over', () => {
      expect(isVisible('hasCarryOver', {})).toBe(false);
      expect(isVisible('hasCarryOver', { carryOverDecisions: [] })).toBe(false);
    });
    it('true com pelo menos uma decisão de carry-over', () => {
      expect(isVisible('hasCarryOver', { carryOverDecisions: [dec('1')] })).toBe(true);
    });
  });

  describe('hasCrossArea', () => {
    it('false sem cross-area', () => {
      expect(isVisible('hasCrossArea', {})).toBe(false);
    });
    it('true com cross-area', () => {
      expect(isVisible('hasCrossArea', { crossAreaDecisions: [dec('1')] })).toBe(true);
    });
  });

  describe('projectsModuleEnabled', () => {
    it('false quando módulo desabilitado/undefined', () => {
      expect(isVisible('projectsModuleEnabled', {})).toBe(false);
      expect(isVisible('projectsModuleEnabled', { projectsModuleEnabled: false })).toBe(false);
    });
    it('true quando módulo ativo', () => {
      expect(isVisible('projectsModuleEnabled', { projectsModuleEnabled: true })).toBe(true);
    });
  });

  describe('qbrCompletedInLastQuarter', () => {
    it('false quando flag undefined/false', () => {
      expect(isVisible('qbrCompletedInLastQuarter', {})).toBe(false);
    });
    it('true quando QBR foi concluído', () => {
      expect(isVisible('qbrCompletedInLastQuarter', { qbrCompletedInLastQuarter: true })).toBe(true);
    });
  });

  describe('regra desconhecida', () => {
    it('default fail-open (mantém visibilidade)', () => {
      expect(isVisible('xxx-unknown' as never, {})).toBe(true);
    });
  });
});
