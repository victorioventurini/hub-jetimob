/**
 * Step Completion Rules — gates declarativos por (persona × versão).
 *
 * Define quando um step pode ser considerado concluído (gate de avanço)
 * e quando o rito como um todo pode ser submetido (gate de submissão).
 *
 * Regras são SLUGS — a implementação vive em `lib/completionEvaluator.ts`.
 * Componentes não conhecem as regras: apenas reportam estado ao evaluator.
 */

import type { WizardPersona } from '@/modules/okrs/types/wizard';
import type { StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { RitualCompletionRules } from '../types';

type RulesByVersion = Partial<Record<StructureVersion, RitualCompletionRules>>;

export const COMPLETION_RULES: Partial<Record<WizardPersona, RulesByVersion>> = {
  // ============= Onda 1 =============
  'collaborator': {
    v2: {
      steps: {},
      submission: {
        requiredSteps: ['opening', 'krs', 'reflection', 'summary'],
        optionalSteps: ['kpis', 'projects-initiatives', 'pending-decisions'],
      },
    },
  },
  'leader-prep': {
    v2: {
      steps: {},
      submission: {
        requiredSteps: ['balance', 'kpis', 'krs-attention', 'agenda', 'summary'],
        optionalSteps: ['projects-initiatives', 'highlights-risks'],
      },
    },
  },

  // ============= Onda 2 =============
  'team-checkin': {
    v3: {
      steps: {
        'krs-attention': {
          required: 'allMarkedKrsReviewed',
          errorMessage: 'Todos os KRs marcados precisam ser revisados antes de avançar.',
        },
        'decisions': {
          required: 'carryOverHandledIfPresent',
          errorMessage: 'Decisões pendentes do check-in anterior precisam ser endereçadas.',
        },
      },
      submission: {
        requiredSteps: ['opening', 'kpi-gate', 'krs-attention', 'decisions', 'closing'],
        optionalSteps: ['projects-initiatives', 'highlights-risks'],
      },
    },
  },
  'mbr-pre': {
    v3: {
      steps: {},
      submission: {
        requiredSteps: ['balance', 'kpis', 'krs', 'next-steps', 'summary'],
        optionalSteps: ['projects', 'highlights-risks'],
      },
    },
  },
  'qbr-pre': {
    v3: {
      steps: {},
      submission: {
        requiredSteps: ['balance', 'kpis-cycle', 'krs-cycle', 'learnings-risks', 'summary'],
        optionalSteps: ['projects-cycle'],
      },
    },
  },

  // ============= Onda 3 =============
  'mbr': {
    v4: {
      steps: {
        'kpi-gate': {
          required: 'allAtRiskKpisAddressed',
          errorMessage: 'KPIs em alerta precisam de decisão ou justificativa de bloqueio.',
        },
        'team-analysis': {
          required: 'allActiveTeamsAnalyzed',
          errorMessage: 'Todos os times com OKRs ativos devem ser revisados.',
        },
      },
      submission: {
        requiredSteps: [
          'opening-executive',
          'kpi-gate',
          'teams-overview',
          'team-analysis',
          'decisions',
          'closing',
        ],
        optionalSteps: ['strategic-projects'],
      },
    },
  },
  'qbr-meeting': {
    v4: {
      steps: {},
      submission: {
        requiredSteps: ['opening-executive', 'decisions', 'closing'],
      },
    },
  },
  'qbr-post': {
    v4: {
      steps: {},
      submission: {
        // Steps LEGADO ('promotion', 'commitments', 'cadence') ficam fora do
        // gate do framework — validados pelos containers específicos.
        requiredSteps: ['decisions-adjustments', 'closing'],
      },
    },
  },
};

export function getCompletionRules(
  persona: WizardPersona,
  version: StructureVersion,
): RitualCompletionRules | undefined {
  return COMPLETION_RULES[persona]?.[version];
}
