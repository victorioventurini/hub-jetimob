/**
 * Testes do SSOT de versão estrutural por WizardPersona.
 *
 * Garante que:
 * - Todas as personas estão mapeadas (não há rito órfão).
 * - Personas das Ondas 1 e 2 já estão na versão ativa.
 * - Onda 3 permanece em v1 até decisão de Q-end (governança TCR).
 * - Helper `getCurrentStructureVersion` cobre fallback defensivo.
 */

import { describe, it, expect } from 'vitest';
import type { WizardPersona } from '@/modules/okrs/types/wizard';
import {
  STRUCTURE_VERSION_BY_WIZARD_TYPE,
  getCurrentStructureVersion,
} from '../structureVersions';

const ALL_PERSONAS: WizardPersona[] = [
  'collaborator',
  'leader-prep',
  'team-checkin',
  'managers-checkin',
  'clevel-checkin',
  'team-okr-creation',
  'team-kr-creation',
  'mbr',
  'mbr-pre',
  'mbr-first',
  'mbr-pre-first',
  'qbr-pre',
  'qbr-pre-clevel',
  'qbr-meeting',
  'qbr-post',
];

describe('STRUCTURE_VERSION_BY_WIZARD_TYPE', () => {
  it('mapeia todas as WizardPersona conhecidas (sem rito órfão)', () => {
    for (const persona of ALL_PERSONAS) {
      expect(STRUCTURE_VERSION_BY_WIZARD_TYPE[persona]).toBeDefined();
    }
  });

  it('Onda 1 (collaborator, leader-prep) está em v2', () => {
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['collaborator']).toBe('v2');
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['leader-prep']).toBe('v2');
  });

  it('Onda 2 (team-checkin, mbr-pre, qbr-pre) está em v3', () => {
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['team-checkin']).toBe('v3');
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['mbr-pre']).toBe('v3');
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['qbr-pre']).toBe('v3');
  });

  it('Onda 3 (mbr, qbr-meeting, qbr-post) está em v4 após Q-end flip', () => {
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['mbr']).toBe('v4');
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['qbr-meeting']).toBe('v4');
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['qbr-post']).toBe('v4');
  });

  it('Ritos não impactados pela padronização permanecem em v1', () => {
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['clevel-checkin']).toBe('v1');
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['team-okr-creation']).toBe('v1');
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['team-kr-creation']).toBe('v1');
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['qbr-pre-clevel']).toBe('v1');
  });

  it('Ritos históricos / descontinuados preservam v1', () => {
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['managers-checkin']).toBe('v1');
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['mbr-first']).toBe('v1');
    expect(STRUCTURE_VERSION_BY_WIZARD_TYPE['mbr-pre-first']).toBe('v1');
  });
});

describe('getCurrentStructureVersion', () => {
  it('retorna a versão configurada para uma persona conhecida', () => {
    expect(getCurrentStructureVersion('collaborator')).toBe('v2');
    expect(getCurrentStructureVersion('mbr-pre')).toBe('v3');
    expect(getCurrentStructureVersion('mbr')).toBe('v4');
  });

  it('faz fallback defensivo para v1 quando persona é desconhecida', () => {
    // Casting intencional: simula uso futuro com persona ainda não mapeada.
    expect(getCurrentStructureVersion('unknown-persona' as WizardPersona)).toBe('v1');
  });
});
