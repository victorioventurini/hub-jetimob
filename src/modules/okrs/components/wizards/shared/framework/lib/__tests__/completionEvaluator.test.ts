/**
 * Testes unitários do completionEvaluator.
 *
 * Função pura, sem dependências de UI ou Supabase. Cobre todas as regras
 * declarativas registradas em `CompletionRuleId` e usadas pelo SSOT
 * `stepCompletionRules.ts`.
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule, type EvaluatorContext } from '../completionEvaluator';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

const ERR = 'gate bloqueado';

function decision(id: string, extra: Partial<TeamCheckinDecision> = {}): TeamCheckinDecision {
  return {
    id,
    text: `dec-${id}`,
    category: 'decision',
    createdAt: new Date().toISOString(),
    createdBy: 'tester',
    ...extra,
  } as unknown as TeamCheckinDecision;
}

describe('evaluateRule', () => {
  describe('always', () => {
    it('passa sem condicionais', () => {
      expect(evaluateRule('always', {}, ERR)).toEqual({ passed: true });
    });
  });

  describe('allMarkedKrsReviewed', () => {
    it('passa quando lista vazia/undefined', () => {
      expect(evaluateRule('allMarkedKrsReviewed', {}, ERR).passed).toBe(true);
      expect(evaluateRule('allMarkedKrsReviewed', { unreviewedMarkedKrIds: [] }, ERR).passed).toBe(true);
    });
    it('falha quando há KR pendente', () => {
      const res = evaluateRule('allMarkedKrsReviewed', { unreviewedMarkedKrIds: ['kr-1'] }, ERR);
      expect(res.passed).toBe(false);
      expect(res.errorMessage).toBe(ERR);
    });
  });

  describe('allActiveTeamsAnalyzed', () => {
    it('passa quando todos analisados', () => {
      expect(evaluateRule('allActiveTeamsAnalyzed', { unanalyzedActiveTeamIds: [] }, ERR).passed).toBe(true);
    });
    it('falha quando há time pendente', () => {
      expect(evaluateRule('allActiveTeamsAnalyzed', { unanalyzedActiveTeamIds: ['t-1'] }, ERR).passed).toBe(false);
    });
  });

  describe('allAtRiskKpisAddressed', () => {
    it('passa sem KPIs em alerta', () => {
      expect(evaluateRule('allAtRiskKpisAddressed', {}, ERR).passed).toBe(true);
    });
    it('falha com KPI em alerta sem decisão', () => {
      expect(
        evaluateRule('allAtRiskKpisAddressed', { unaddressedAtRiskKpiIds: ['kpi-x'] }, ERR).passed,
      ).toBe(false);
    });
  });

  describe('carryOverHandledIfPresent', () => {
    it('passa quando não há carry-over', () => {
      expect(evaluateRule('carryOverHandledIfPresent', { carryOverDecisions: [] }, ERR).passed).toBe(true);
    });

    it('passa quando há decisão nova além do carry-over', () => {
      const co = [decision('co-1')];
      const ctx: EvaluatorContext = {
        carryOverDecisions: co,
        decisions: [decision('co-1'), decision('new-1')],
      };
      expect(evaluateRule('carryOverHandledIfPresent', ctx, ERR).passed).toBe(true);
    });

    it('passa quando todos carry-over estão resolvidos', () => {
      const co = [decision('co-1', { resolved: true } as Partial<TeamCheckinDecision>)];
      const ctx: EvaluatorContext = { carryOverDecisions: co, decisions: co };
      expect(evaluateRule('carryOverHandledIfPresent', ctx, ERR).passed).toBe(true);
    });

    it('falha quando carry-over não resolvido e sem nova decisão', () => {
      const co = [decision('co-1')];
      const ctx: EvaluatorContext = { carryOverDecisions: co, decisions: co };
      const res = evaluateRule('carryOverHandledIfPresent', ctx, ERR);
      expect(res.passed).toBe(false);
      expect(res.errorMessage).toBe(ERR);
    });
  });

  describe('atLeastOneLeaderAction', () => {
    it('passa quando não há KRs visíveis (sem gate)', () => {
      expect(
        evaluateRule('atLeastOneLeaderAction', { totalKrsForLeaderActions: 0 }, ERR).passed,
      ).toBe(true);
    });

    it('falha quando há KRs e nenhuma ação de líder', () => {
      const res = evaluateRule(
        'atLeastOneLeaderAction',
        { totalKrsForLeaderActions: 3, leaderActionCount: 0 },
        ERR,
      );
      expect(res.passed).toBe(false);
    });

    it('passa quando há ao menos uma ação', () => {
      expect(
        evaluateRule(
          'atLeastOneLeaderAction',
          { totalKrsForLeaderActions: 3, leaderActionCount: 1 },
          ERR,
        ).passed,
      ).toBe(true);
    });
  });

  describe('hasAnyDecisionOrSkip', () => {
    it('passa sempre (regra de skip explícito)', () => {
      expect(evaluateRule('hasAnyDecisionOrSkip', {}, ERR).passed).toBe(true);
    });
  });

  describe('regra desconhecida', () => {
    it('passa por default (fail-open documentado)', () => {
      // Cast para simular uma regra futura ainda não implementada
      expect(evaluateRule('xxx-unknown' as never, {}, ERR).passed).toBe(true);
    });
  });
});
