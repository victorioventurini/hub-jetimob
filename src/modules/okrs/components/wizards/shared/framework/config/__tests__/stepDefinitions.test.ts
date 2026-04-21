/**
 * Testes do SSOT estrutural `STEP_DEFINITIONS`.
 *
 * Não testa lógica — testa **integridade declarativa**: garante que as
 * composições de steps por (persona × versão) refletem fielmente o plano
 * canônico (`.lovable/plan.md`). Qualquer drift entre plano e código
 * é detectado aqui.
 *
 * Cobre:
 * - Presença das versões ativas (Onda 1 v2, Onda 2 v3, Onda 3 v4 pré-ativada).
 * - Unicidade de `stepId` dentro de cada rito (chave de label e regras).
 * - Ordem canônica `KPIs → KRs → Projetos` (com exceções documentadas).
 * - Steps de consolidação final (`SummaryAndSubmitStep`/`ClosingStep`)
 *   sempre com `suppressInlineDecisions: true`.
 * - `getStepDefinitions` retorna `undefined` para combinações não definidas.
 */

import { describe, it, expect } from 'vitest';
import {
  STEP_DEFINITIONS,
  getStepDefinitions,
} from '../stepDefinitions';
import type { WizardPersona } from '@/modules/okrs/types/wizard';
import type { StructureVersion } from '@/modules/okrs/constants/ritualLabels';

// Pares (persona, versão ATIVA no SSOT — não confundir com mapeamento
// `STRUCTURE_VERSION_BY_WIZARD_TYPE`, que pode apontar para v1 enquanto a
// definição v4 já existe pré-ativada).
const ACTIVE_DEFINITIONS: Array<{ persona: WizardPersona; version: StructureVersion }> = [
  { persona: 'collaborator', version: 'v2' },
  { persona: 'leader-prep', version: 'v2' },
  { persona: 'team-checkin', version: 'v3' },
  { persona: 'mbr-pre', version: 'v3' },
  { persona: 'qbr-pre', version: 'v3' },
  { persona: 'mbr', version: 'v4' },
  { persona: 'qbr-meeting', version: 'v4' },
  { persona: 'qbr-post', version: 'v4' },
];

describe('STEP_DEFINITIONS — integridade SSOT', () => {
  it('contém definição para todos os ritos planejados', () => {
    for (const { persona, version } of ACTIVE_DEFINITIONS) {
      expect(STEP_DEFINITIONS[persona]?.[version]).toBeDefined();
      expect(STEP_DEFINITIONS[persona]![version]!.length).toBeGreaterThan(0);
    }
  });

  it.each(ACTIVE_DEFINITIONS)(
    '$persona@$version tem stepIds únicos',
    ({ persona, version }) => {
      const steps = STEP_DEFINITIONS[persona]![version]!;
      const ids = steps.map((s) => s.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    },
  );

  it.each(ACTIVE_DEFINITIONS)(
    '$persona@$version: KPIs antes de KRs antes de Projetos (ordem canônica)',
    ({ persona, version }) => {
      const steps = STEP_DEFINITIONS[persona]![version]!;

      const kpiIdx = steps.findIndex((s) => s.component === 'KpiGateStep');
      const krIdx = steps.findIndex((s) => s.component === 'KrsStep');
      const projIdx = steps.findIndex(
        (s) => s.component === 'ProjectsAndInitiativesStep',
      );

      // Exceções documentadas:
      // - qbr-meeting / qbr-post: reuniões aprovativas, sem KRs/Projetos
      // - leader-prep: 'KrsStep' é a PAUTA DO LÍDER (mode='leader-actions'),
      //   posicionada após Projetos por design (preparação para reunião)
      if (
        persona === 'qbr-meeting' ||
        persona === 'qbr-post' ||
        persona === 'leader-prep'
      ) {
        return;
      }

      if (kpiIdx >= 0 && krIdx >= 0) {
        expect(kpiIdx).toBeLessThan(krIdx);
      }
      if (krIdx >= 0 && projIdx >= 0) {
        expect(krIdx).toBeLessThan(projIdx);
      }
    },
  );

  it.each(ACTIVE_DEFINITIONS)(
    '$persona@$version: SummaryAndSubmit/Closing sempre suprimem inline decisions',
    ({ persona, version }) => {
      const steps = STEP_DEFINITIONS[persona]![version]!;
      const consolidationSteps = steps.filter(
        (s) => s.component === 'SummaryAndSubmitStep' || s.component === 'ClosingStep',
      );
      // Todos os ritos planejados terminam em consolidação.
      expect(consolidationSteps.length).toBeGreaterThan(0);
      for (const step of consolidationSteps) {
        expect(step.suppressInlineDecisions).toBe(true);
      }
    },
  );

  it.each(ACTIVE_DEFINITIONS)(
    '$persona@$version: último step é sempre de consolidação (Summary ou Closing)',
    ({ persona, version }) => {
      const steps = STEP_DEFINITIONS[persona]![version]!;
      const last = steps[steps.length - 1];
      expect(['SummaryAndSubmitStep', 'ClosingStep']).toContain(last.component);
    },
  );

  // ----- Conformidades pontuais com o plano canônico -----

  it('collaborator v2 inclui ReflectionStep (exceção documentada)', () => {
    const steps = STEP_DEFINITIONS['collaborator']!['v2']!;
    expect(steps.some((s) => s.component === 'ReflectionStep')).toBe(true);
  });

  it('leader-prep v2 usa LeaderInsightsStep + KrsStep mode=leader-actions', () => {
    const steps = STEP_DEFINITIONS['leader-prep']!['v2']!;
    expect(steps.some((s) => s.component === 'LeaderInsightsStep')).toBe(true);
    const krsStep = steps.find((s) => s.component === 'KrsStep');
    expect(krsStep).toBeDefined();
    expect((krsStep!.config as { mode?: string }).mode).toBe('leader-actions');
  });

  it('team-checkin v3: KpiGate exige resolução e KRs exigem revisão', () => {
    const steps = STEP_DEFINITIONS['team-checkin']!['v3']!;
    const kpi = steps.find((s) => s.component === 'KpiGateStep')!;
    const krs = steps.find((s) => s.component === 'KrsStep')!;
    expect((kpi.config as { requireResolution?: boolean }).requireResolution).toBe(true);
    expect((krs.config as { requireReview?: boolean }).requireReview).toBe(true);
  });

  it('mbr-pre v3 e qbr-pre v3 ocultam Iniciativas (apenas Projetos)', () => {
    for (const persona of ['mbr-pre', 'qbr-pre'] as const) {
      const steps = STEP_DEFINITIONS[persona]!['v3']!;
      const proj = steps.find((s) => s.component === 'ProjectsAndInitiativesStep')!;
      const cfg = proj.config as { showProjects: boolean; showInitiatives: boolean };
      expect(cfg.showProjects).toBe(true);
      expect(cfg.showInitiatives).toBe(false);
    }
  });

  it('qbr-pre v3 usa variant=learnings-risks (exceção retrospectiva)', () => {
    const steps = STEP_DEFINITIONS['qbr-pre']!['v3']!;
    const hi = steps.find((s) => s.component === 'HighlightsAndRisksStep')!;
    expect((hi.config as { variant?: string }).variant).toBe('learnings-risks');
  });

  it('mbr v4: ClosingStep inclui ceo-letter (canônico Q-end)', () => {
    const steps = STEP_DEFINITIONS['mbr']!['v4']!;
    const closing = steps.find((s) => s.component === 'ClosingStep')!;
    expect((closing.config as { blocks: string[] }).blocks).toContain('ceo-letter');
  });

  it('mbr v4 strategic-projects exige scope=cross-team com minTeams=2', () => {
    const steps = STEP_DEFINITIONS['mbr']!['v4']!;
    const proj = steps.find((s) => s.component === 'ProjectsAndInitiativesStep')!;
    const cfg = proj.config as { scope: string; minTeamsForCrossTeam?: number };
    expect(cfg.scope).toBe('cross-team');
    expect(cfg.minTeamsForCrossTeam).toBe(2);
  });

  it('qbr-meeting v4 NÃO contém KrsStep nem ProjectsAndInitiativesStep (exceção documentada)', () => {
    const steps = STEP_DEFINITIONS['qbr-meeting']!['v4']!;
    expect(steps.some((s) => s.component === 'KrsStep')).toBe(false);
    expect(steps.some((s) => s.component === 'ProjectsAndInitiativesStep')).toBe(false);
  });

  it('qbr-post v4: ClosingStep contém minutes + ceo-letter, sem next-30-days', () => {
    const steps = STEP_DEFINITIONS['qbr-post']!['v4']!;
    const closing = steps.find((s) => s.component === 'ClosingStep')!;
    const blocks = (closing.config as { blocks: string[] }).blocks;
    expect(blocks).toContain('minutes');
    expect(blocks).toContain('ceo-letter');
    expect(blocks).not.toContain('next-30-days');
  });
});

describe('getStepDefinitions', () => {
  it('retorna a lista para combinações ativas', () => {
    expect(getStepDefinitions('collaborator', 'v2')).toBeDefined();
    expect(getStepDefinitions('mbr', 'v4')).toBeDefined();
  });

  it('retorna undefined para versão não definida (caller decide fallback)', () => {
    expect(getStepDefinitions('collaborator', 'v1')).toBeUndefined();
    expect(getStepDefinitions('mbr', 'v3')).toBeUndefined();
  });

  it('retorna undefined para persona sem definições no framework', () => {
    expect(getStepDefinitions('clevel-checkin', 'v1')).toBeUndefined();
    expect(getStepDefinitions('team-okr-creation', 'v1')).toBeUndefined();
  });
});
