/**
 * Step / Section Visibility Rules — declarativas por (persona × versão).
 *
 * Identifica subseções internas de steps que aparecem condicionalmente.
 * A avaliação é feita em `lib/visibilityEvaluator.ts`.
 *
 * Exemplos de uso:
 * - Subseção "Carry-over" dentro de Decisões só aparece se houver decisões
 *   pendentes do rito anterior.
 * - Subseção "Projetos Estratégicos" no MBR só aparece se a BU tiver
 *   o módulo de projetos ativo.
 */

import type { WizardPersona } from '@/modules/okrs/types/wizard';
import type { StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { SectionVisibility, VisibilityRuleId } from '../types';

type SectionMap = Record<string, SectionVisibility>;
type StepSectionMap = Record<string, SectionMap>;
type VersionMap = Partial<Record<StructureVersion, StepSectionMap>>;

export const VISIBILITY_RULES: Partial<Record<WizardPersona, VersionMap>> = {
  'team-checkin': {
    v3: {
      'decisions': {
        'carry-over': { rule: 'hasCarryOver' },
        'cross-area': { rule: 'hasCrossArea' },
      },
    },
  },
  'mbr': {
    v4: {
      'decisions': {
        'carry-over': { rule: 'hasCarryOver' },
        'cross-area': { rule: 'hasCrossArea' },
      },
      'strategic-projects': {
        'root': { rule: 'projectsModuleEnabled' },
      },
    },
  },
  'qbr-meeting': {
    v4: {
      'decisions': {
        'cross-area': { rule: 'hasCrossArea' },
      },
    },
  },
  'qbr-post': {
    v4: {
      'closing': {
        'minutes': { rule: 'qbrCompletedInLastQuarter' },
      },
    },
  },
};

export function getVisibilityRule(
  persona: WizardPersona,
  version: StructureVersion,
  stepId: string,
  sectionId: string,
): VisibilityRuleId {
  return (
    VISIBILITY_RULES[persona]?.[version]?.[stepId]?.[sectionId]?.rule ?? 'always'
  );
}
