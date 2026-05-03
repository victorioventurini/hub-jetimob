/**
 * Completion Evaluator — função pura que avalia regras declarativas.
 *
 * Recebe um `EvaluatorContext` (dados que o container do rito monta) e
 * a regra (`CompletionRuleId`); retorna se passou e a mensagem de erro.
 *
 * Sem dependências de UI. Totalmente testável.
 */

import type { CompletionRuleId } from '../types';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

export interface EvaluatorContext {
  /** KRs marcados que ainda não foram revisados */
  unreviewedMarkedKrIds?: string[];
  /** Times com OKRs ativos que ainda não foram analisados */
  unanalyzedActiveTeamIds?: string[];
  /** KPIs em alerta sem decisão associada */
  unaddressedAtRiskKpiIds?: string[];
  /** KPIs obrigatórios (overdue/critical/guardrail) sem plano de ação */
  unaddressedMandatoryKpiIds?: string[];
  /** Decisões carry-over que precisam ser endereçadas */
  carryOverDecisions?: TeamCheckinDecision[];
  /** Quaisquer decisões registradas no rito */
  decisions?: TeamCheckinDecision[];
  /** Quantidade de KRs com leaderAction marcada (modo leader-actions) */
  leaderActionCount?: number;
  /** Total de KRs visíveis no step de leader-actions */
  totalKrsForLeaderActions?: number;
}

export interface EvaluationResult {
  passed: boolean;
  errorMessage?: string;
}

export function evaluateRule(
  rule: CompletionRuleId,
  ctx: EvaluatorContext,
  errorMessage?: string,
): EvaluationResult {
  switch (rule) {
    case 'always':
      return { passed: true };

    case 'allMarkedKrsReviewed': {
      const pending = ctx.unreviewedMarkedKrIds ?? [];
      return pending.length === 0
        ? { passed: true }
        : { passed: false, errorMessage };
    }

    case 'allActiveTeamsAnalyzed': {
      const pending = ctx.unanalyzedActiveTeamIds ?? [];
      return pending.length === 0
        ? { passed: true }
        : { passed: false, errorMessage };
    }

    case 'allAtRiskKpisAddressed': {
      const pending = ctx.unaddressedAtRiskKpiIds ?? [];
      return pending.length === 0
        ? { passed: true }
        : { passed: false, errorMessage };
    }

    case 'allMandatoryKpisAddressed': {
      const pending = ctx.unaddressedMandatoryKpiIds ?? [];
      return pending.length === 0
        ? { passed: true }
        : { passed: false, errorMessage };
    }

    case 'carryOverHandledIfPresent': {
      const co = ctx.carryOverDecisions ?? [];
      if (co.length === 0) return { passed: true };
      // Considera "endereçado" quando há ao menos uma decisão nova no rito
      // OU quando todos os carry-over têm `resolved=true` (campo opcional).
      const anyNew = (ctx.decisions ?? []).some(
        (d) => !co.find((c) => c.id === d.id),
      );
      const allResolved = co.every(
        (c) => (c as TeamCheckinDecision & { resolved?: boolean }).resolved === true,
      );
      return anyNew || allResolved
        ? { passed: true }
        : { passed: false, errorMessage };
    }

    case 'atLeastOneLeaderAction': {
      // Se não há KRs visíveis, não há gate (passa direto).
      if ((ctx.totalKrsForLeaderActions ?? 0) === 0) return { passed: true };
      const count = ctx.leaderActionCount ?? 0;
      return count > 0 ? { passed: true } : { passed: false, errorMessage };
    }

    case 'hasAnyDecisionOrSkip':
      return { passed: true };

    default:
      return { passed: true };
  }
}
