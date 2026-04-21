/**
 * Testes do catálogo `VISIBILITY_RULES`.
 *
 * Validam:
 *  - Toda regra (persona × versão × step) referencia step existente em
 *    `STEP_DEFINITIONS` (com exceção documentada para sub-pseudo-steps).
 *  - SLUGS de regra são conhecidos pelo `visibilityEvaluator`.
 *  - Fallback canônico de `getVisibilityRule` é `'always'` (fail-open).
 *  - Regras canônicas do TCR estão presentes (carry-over, cross-area,
 *    projects-module, qbr-completed).
 */

import { describe, it, expect } from 'vitest';
import {
  VISIBILITY_RULES,
  getVisibilityRule,
} from '../stepVisibilityRules';
import { STEP_DEFINITIONS } from '../stepDefinitions';
import type { VisibilityRuleId } from '../../types';
import type { WizardPersona } from '@/modules/okrs/types/wizard';
import type { StructureVersion } from '@/modules/okrs/constants/ritualLabels';

const KNOWN_RULE_IDS: VisibilityRuleId[] = [
  'always',
  'hasCarryOver',
  'hasCrossArea',
  'projectsModuleEnabled',
  'qbrCompletedInLastQuarter',
];

/**
 * Pseudo-steps autorizados — usados para agrupar seções fora do SSOT
 * estrutural (ex.: blocos consolidados que não correspondem a um stepId
 * navegável). Mantenha esta lista curta e justificada.
 */
const ALLOWED_PSEUDO_STEPS = new Set<string>([
  'strategic-projects', // MBR — bloco condicional ao módulo de projetos
]);

type Entry = {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  sectionId: string;
  rule: VisibilityRuleId;
};

const ENTRIES: Entry[] = Object.entries(VISIBILITY_RULES).flatMap(
  ([persona, byVersion]) =>
    Object.entries(byVersion ?? {}).flatMap(([version, byStep]) =>
      Object.entries(byStep ?? {}).flatMap(([stepId, sections]) =>
        Object.entries(sections).map(([sectionId, sec]) => ({
          persona: persona as WizardPersona,
          version: version as StructureVersion,
          stepId,
          sectionId,
          rule: sec.rule,
        })),
      ),
    ),
);

describe('VISIBILITY_RULES — coerência declarativa', () => {
  it('catálogo possui regras declaradas (smoke)', () => {
    expect(ENTRIES.length).toBeGreaterThan(0);
  });

  it.each(ENTRIES)(
    '$persona@$version → $stepId/$sectionId: stepId existe em STEP_DEFINITIONS ou é pseudo autorizado',
    ({ persona, version, stepId }) => {
      const defs = STEP_DEFINITIONS[persona]?.[version] ?? [];
      const exists = defs.some((d) => d.id === stepId);
      const isPseudo = ALLOWED_PSEUDO_STEPS.has(stepId);
      expect(exists || isPseudo).toBe(true);
    },
  );

  it.each(ENTRIES)(
    '$persona@$version → $stepId/$sectionId: SLUG de regra é reconhecido',
    ({ rule }) => {
      expect(KNOWN_RULE_IDS).toContain(rule);
    },
  );
});

describe('VISIBILITY_RULES — regras canônicas (TCR)', () => {
  it('team-checkin@v3 decisions: carry-over depende de hasCarryOver', () => {
    expect(
      getVisibilityRule(
        'team-checkin' as WizardPersona,
        'v3',
        'decisions',
        'carry-over',
      ),
    ).toBe('hasCarryOver');
  });

  it('team-checkin@v3 decisions: cross-area depende de hasCrossArea', () => {
    expect(
      getVisibilityRule(
        'team-checkin' as WizardPersona,
        'v3',
        'decisions',
        'cross-area',
      ),
    ).toBe('hasCrossArea');
  });

  it('mbr@v4: strategic-projects depende do módulo de projetos', () => {
    expect(
      getVisibilityRule('mbr' as WizardPersona, 'v4', 'strategic-projects', 'root'),
    ).toBe('projectsModuleEnabled');
  });

  it('qbr-post@v4 closing: minutes depende de qbrCompletedInLastQuarter', () => {
    expect(
      getVisibilityRule('qbr-post' as WizardPersona, 'v4', 'closing', 'minutes'),
    ).toBe('qbrCompletedInLastQuarter');
  });
});

describe('getVisibilityRule — fallback fail-open', () => {
  it('persona desconhecida → always', () => {
    expect(
      getVisibilityRule('xxx' as WizardPersona, 'v1', 'foo', 'bar'),
    ).toBe('always');
  });

  it('versão desconhecida → always', () => {
    expect(
      getVisibilityRule('mbr' as WizardPersona, 'v99' as StructureVersion, 'decisions', 'carry-over'),
    ).toBe('always');
  });

  it('step desconhecido → always', () => {
    expect(
      getVisibilityRule('mbr' as WizardPersona, 'v4', 'inexistente', 'x'),
    ).toBe('always');
  });

  it('section desconhecida em step existente → always', () => {
    expect(
      getVisibilityRule('mbr' as WizardPersona, 'v4', 'decisions', 'inexistente'),
    ).toBe('always');
  });
});
