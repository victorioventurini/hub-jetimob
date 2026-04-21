/**
 * Testes do SSOT de labels (`RITUAL_LABELS` + `RITUAL_STEP_LABELS`).
 *
 * Blindam:
 *  - `getRitualLabel` retorna label canônico ou fallback ao slug.
 *  - `getStepLabel` retorna `{ title, shortLabel }` mínimo para slug
 *    desconhecido (sentinel) — evita renderização vazia em sessões legadas.
 *  - Toda persona ativa do framework (`STRUCTURE_VERSION_BY_WIZARD_TYPE` !=
 *    `v1`) possui labels para **todos** os stepIds declarados no SSOT
 *    estrutural (`STEP_DEFINITIONS`). Drift de label vs step quebra UI.
 */

import { describe, it, expect } from 'vitest';
import {
  RITUAL_LABELS,
  RITUAL_STEP_LABELS,
  getRitualLabel,
  getStepLabel,
} from '../ritualLabels';
import type { StructureVersion } from '../ritualLabels';
import { STEP_DEFINITIONS } from '@/modules/okrs/components/wizards/shared/framework/config/stepDefinitions';
import { STRUCTURE_VERSION_BY_WIZARD_TYPE } from '@/modules/okrs/components/wizards/shared/framework/config/structureVersions';
import type { WizardPersona } from '@/modules/okrs/types/wizard';

describe('getRitualLabel', () => {
  it('retorna label canônico para personas conhecidas', () => {
    expect(getRitualLabel('collaborator')).toBe('Check-in Individual');
    expect(getRitualLabel('mbr')).toBe('MBR');
    expect(getRitualLabel('qbr-meeting')).toBe('QBR');
  });

  it('retorna slug como fallback para persona desconhecida', () => {
    expect(getRitualLabel('persona-x' as WizardPersona)).toBe('persona-x');
  });

  it('preserva labels de personas históricas/descontinuadas', () => {
    expect(getRitualLabel('managers-checkin')).toContain('descontinuado');
    expect(getRitualLabel('mbr-first')).toContain('histórico');
  });
});

describe('getStepLabel', () => {
  it('retorna label tipado para step conhecido em versão v2+', () => {
    const label = getStepLabel('collaborator', 'opening', 'v2');
    expect(label.title).toBe('Abertura');
    expect(label.shortLabel).toBe('Abertura');
    expect(label.subtitle).toBeDefined();
  });

  it('retorna sentinel para step desconhecido (não vazio)', () => {
    const label = getStepLabel('collaborator', 'inexistente', 'v2');
    expect(label.title).toBe('inexistente');
    expect(label.shortLabel).toBe('inexistente');
  });

  it('retorna sentinel para versão sem mapa', () => {
    const label = getStepLabel('collaborator', 'opening', 'v99' as StructureVersion);
    expect(label.title).toBe('opening');
  });

  it('retorna sentinel para persona desconhecida', () => {
    const label = getStepLabel('xxx' as WizardPersona, 'opening', 'v2');
    expect(label.title).toBe('opening');
  });
});

describe('RITUAL_STEP_LABELS — coerência cruzada com STEP_DEFINITIONS', () => {
  // Personas com versão ativa no framework (≠ v1) precisam ter cobertura
  // 1:1 entre labels e definições estruturais.
  const ACTIVE_PERSONAS = (
    Object.entries(STRUCTURE_VERSION_BY_WIZARD_TYPE) as Array<
      [WizardPersona, StructureVersion]
    >
  ).filter(([, version]) => version !== 'v1');

  it('catálogo de versões ativas não está vazio (smoke)', () => {
    expect(ACTIVE_PERSONAS.length).toBeGreaterThan(0);
  });

  it.each(ACTIVE_PERSONAS)(
    '%s@%s: todo stepId em STEP_DEFINITIONS tem label em RITUAL_STEP_LABELS',
    (persona, version) => {
      const defs = STEP_DEFINITIONS[persona]?.[version] ?? [];
      const labels = RITUAL_STEP_LABELS[persona]?.[version] ?? {};

      for (const def of defs) {
        const label = labels[def.id];
        expect(
          label,
          `Falta label para ${persona}@${version}.${def.id}`,
        ).toBeDefined();
        expect(label!.title.length).toBeGreaterThan(0);
      }
    },
  );
});

describe('RITUAL_LABELS — completude por persona', () => {
  it('toda persona ativa do framework está mapeada em RITUAL_LABELS', () => {
    for (const persona of Object.keys(
      STRUCTURE_VERSION_BY_WIZARD_TYPE,
    ) as WizardPersona[]) {
      expect(
        RITUAL_LABELS[persona],
        `Persona ${persona} sem label canônico`,
      ).toBeDefined();
      expect(RITUAL_LABELS[persona].length).toBeGreaterThan(0);
    }
  });
});
