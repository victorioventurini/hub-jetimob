/**
 * Visibility Evaluator — função pura que decide se uma seção é exibida.
 */

import type { VisibilityRuleId } from '../types';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

export interface VisibilityContext {
  carryOverDecisions?: TeamCheckinDecision[];
  crossAreaDecisions?: TeamCheckinDecision[];
  /** Se a BU tem o módulo de Projetos ativo */
  projectsModuleEnabled?: boolean;
  /** Se houve QBR concluído no quarter anterior */
  qbrCompletedInLastQuarter?: boolean;
}

export function isVisible(rule: VisibilityRuleId, ctx: VisibilityContext): boolean {
  switch (rule) {
    case 'always':
      return true;
    case 'hasCarryOver':
      return (ctx.carryOverDecisions?.length ?? 0) > 0;
    case 'hasCrossArea':
      return (ctx.crossAreaDecisions?.length ?? 0) > 0;
    case 'projectsModuleEnabled':
      return ctx.projectsModuleEnabled === true;
    case 'qbrCompletedInLastQuarter':
      return ctx.qbrCompletedInLastQuarter === true;
    default:
      return true;
  }
}
