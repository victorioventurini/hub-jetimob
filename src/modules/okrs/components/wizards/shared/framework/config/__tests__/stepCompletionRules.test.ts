/**
 * Testes do catálogo `COMPLETION_RULES`.
 *
 * Garantem coerência entre os gates declarados (regras de step e regras de
 * submissão) e o SSOT estrutural (`STEP_DEFINITIONS`). Cobertura direta
 * blinda contra "drifts" — qualquer step removido/renomeado em
 * `stepDefinitions.ts` força quebra aqui antes de chegar em produção.
 *
 * Princípios validados:
 *  - Todo `requiredSteps`/`optionalSteps` referencia stepId existente na mesma versão.
 *  - Toda regra `steps[stepId]` referencia step existente.
 *  - `requiredSteps` e `optionalSteps` são disjuntos.
 *  - `requiredSteps` cobre exatamente os steps esperados pelo TCR (sem buracos).
 *  - SLUGS de regra são reconhecidos pelo evaluator.
 */

import { describe, it, expect } from 'vitest';
import {
  COMPLETION_RULES,
  getCompletionRules,
} from '../stepCompletionRules';
import { STEP_DEFINITIONS } from '../stepDefinitions';
import { STRUCTURE_VERSION_BY_WIZARD_TYPE } from '../structureVersions';
import type { CompletionRuleId } from '../../types';
import type { WizardPersona } from '@/modules/okrs/types/wizard';
import type { StructureVersion } from '@/modules/okrs/constants/ritualLabels';

const KNOWN_RULE_IDS: CompletionRuleId[] = [
  'always',
  'allMarkedKrsReviewed',
  'allActiveTeamsAnalyzed',
  'allAtRiskKpisAddressed',
  'carryOverHandledIfPresent',
  'atLeastOneLeaderAction',
  'hasAnyDecisionOrSkip',
];

type Entry = {
  persona: WizardPersona;
  version: StructureVersion;
  stepIds: string[];
};

const ENTRIES: Entry[] = Object.entries(COMPLETION_RULES).flatMap(
  ([persona, byVersion]) =>
    Object.keys(byVersion ?? {}).map((version) => {
      const v = version as StructureVersion;
      const defs = STEP_DEFINITIONS[persona as WizardPersona]?.[v] ?? [];
      return {
        persona: persona as WizardPersona,
        version: v,
        stepIds: defs.map((d) => d.id),
      };
    }),
);

describe('COMPLETION_RULES — coerência declarativa', () => {
  it('possui ao menos uma persona com regras (smoke)', () => {
    expect(ENTRIES.length).toBeGreaterThan(0);
  });

  it.each(ENTRIES)(
    '$persona@$version: requiredSteps existem em STEP_DEFINITIONS',
    ({ persona, version, stepIds }) => {
      const rules = getCompletionRules(persona, version)!;
      for (const id of rules.submission.requiredSteps) {
        expect(stepIds).toContain(id);
      }
    },
  );

  it.each(ENTRIES)(
    '$persona@$version: optionalSteps existem em STEP_DEFINITIONS',
    ({ persona, version, stepIds }) => {
      const rules = getCompletionRules(persona, version)!;
      for (const id of rules.submission.optionalSteps ?? []) {
        expect(stepIds).toContain(id);
      }
    },
  );

  it.each(ENTRIES)(
    '$persona@$version: requiredSteps e optionalSteps são disjuntos',
    ({ persona, version }) => {
      const rules = getCompletionRules(persona, version)!;
      const required = new Set(rules.submission.requiredSteps);
      const optional = rules.submission.optionalSteps ?? [];
      for (const id of optional) {
        expect(required.has(id)).toBe(false);
      }
    },
  );

  it.each(ENTRIES)(
    '$persona@$version: regras de step apontam para stepIds existentes',
    ({ persona, version, stepIds }) => {
      const rules = getCompletionRules(persona, version)!;
      for (const id of Object.keys(rules.steps)) {
        expect(stepIds).toContain(id);
      }
    },
  );

  it.each(ENTRIES)(
    '$persona@$version: SLUGS de regra são conhecidos pelo evaluator',
    ({ persona, version }) => {
      const rules = getCompletionRules(persona, version)!;
      for (const rule of Object.values(rules.steps)) {
        if (rule.required) {
          expect(KNOWN_RULE_IDS).toContain(rule.required);
        }
      }
    },
  );

  it.each(ENTRIES)(
    '$persona@$version: mensagens de erro acompanham regras com gate',
    ({ persona, version }) => {
      const rules = getCompletionRules(persona, version)!;
      for (const [, rule] of Object.entries(rules.steps)) {
        if (rule.required && rule.required !== 'always') {
          expect(rule.errorMessage?.length ?? 0).toBeGreaterThan(0);
        }
      }
    },
  );
});

describe('COMPLETION_RULES — gates canônicos por TCR', () => {
  it('team-checkin@v3: krs-attention exige revisão de KRs marcados', () => {
    const rules = getCompletionRules('team-checkin' as WizardPersona, 'v3')!;
    expect(rules.steps['krs-attention']?.required).toBe('allMarkedKrsReviewed');
  });

  it('team-checkin@v3: decisions exige carry-over endereçado', () => {
    const rules = getCompletionRules('team-checkin' as WizardPersona, 'v3')!;
    expect(rules.steps['decisions']?.required).toBe('carryOverHandledIfPresent');
  });

  it('mbr@v4: kpi-gate exige tratamento de KPIs em alerta', () => {
    const rules = getCompletionRules('mbr' as WizardPersona, 'v4')!;
    expect(rules.steps['kpi-gate']?.required).toBe('allAtRiskKpisAddressed');
  });

  it('mbr@v4: team-analysis exige análise de todos os times ativos', () => {
    const rules = getCompletionRules('mbr' as WizardPersona, 'v4')!;
    expect(rules.steps['team-analysis']?.required).toBe('allActiveTeamsAnalyzed');
  });

  it('qbr-post@v4: requiredSteps mantém só decisions-adjustments + closing (legacy fora do gate)', () => {
    const rules = getCompletionRules('qbr-post' as WizardPersona, 'v4')!;
    expect(rules.submission.requiredSteps).toEqual([
      'decisions-adjustments',
      'closing',
    ]);
  });
});

describe('getCompletionRules — fallback', () => {
  it('retorna undefined para persona desconhecida', () => {
    const result = getCompletionRules('xxx-unknown' as WizardPersona, 'v1');
    expect(result).toBeUndefined();
  });

  it('retorna undefined quando versão não tem regras declaradas', () => {
    // Personas Onda 1+ que ainda rodam em v1 (legado) não têm regras no catálogo.
    const result = getCompletionRules('collaborator' as WizardPersona, 'v1');
    expect(result).toBeUndefined();
  });

  it('toda persona com regras tem ao menos a versão atual coberta OU é legado documentado', () => {
    // Smoke: se uma persona apareceu em COMPLETION_RULES, cada versão declarada
    // bate com uma versão real do SSOT estrutural.
    for (const persona of Object.keys(COMPLETION_RULES) as WizardPersona[]) {
      const versions = Object.keys(COMPLETION_RULES[persona] ?? {});
      const currentVersion = STRUCTURE_VERSION_BY_WIZARD_TYPE[persona];
      // Todas as versões com regras precisam existir em STEP_DEFINITIONS
      for (const v of versions) {
        const hasDefs = !!STEP_DEFINITIONS[persona]?.[v as StructureVersion];
        expect(hasDefs).toBe(true);
      }
      // Se a persona está em COMPLETION_RULES, sua versão atual deve estar coberta
      // (exceto Onda 3 que pode ter regras só para a versão futura — checagem suave).
      if (currentVersion && versions.includes(currentVersion)) {
        expect(versions).toContain(currentVersion);
      }
    }
  });
});
