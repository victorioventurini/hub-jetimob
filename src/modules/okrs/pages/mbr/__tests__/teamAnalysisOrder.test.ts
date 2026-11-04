/**
 * Ordem canônica de análise dos times no MBR (definida por Uriel Canfield):
 * Tecnologia → Produto → Design → BizOps → Customer Success → Marketing →
 * Comercial → Gente e Cultura.
 */
import { describe, expect, it } from 'vitest';
import {
  TEAM_ANALYSIS_ORDER,
  compareTeamNamesByAnalysisOrder,
  isTeamSnapshotOrderCanonical,
  sortTeamSnapshotsByAnalysisOrder,
  teamAnalysisRank,
} from '../constants';

const snap = (teamId: string, teamName: string) => ({ teamId, teamName });

describe('ordem canônica de análise dos times no MBR', () => {
  it('usa exatamente a sequência pedida', () => {
    expect([...TEAM_ANALYSIS_ORDER]).toEqual([
      'Tecnologia',
      'Produto',
      'Design',
      'BizOps',
      'Customer Success',
      'Marketing',
      'Comercial',
      'Gente e Cultura',
    ]);
  });

  it('ordena times fora de sequência', () => {
    const shuffled = [
      snap('4', 'Marketing'),
      snap('1', 'Comercial'),
      snap('2', 'Tecnologia'),
      snap('3', 'BizOps'),
    ];
    expect(sortTeamSnapshotsByAnalysisOrder(shuffled).map((t) => t.teamName)).toEqual([
      'Tecnologia',
      'BizOps',
      'Marketing',
      'Comercial',
    ]);
  });

  it('casa "Gente & Cultura" com "Gente e Cultura" e a coloca por último', () => {
    expect(teamAnalysisRank('Gente & Cultura')).toBe(TEAM_ANALYSIS_ORDER.length - 1);
    expect(compareTeamNamesByAnalysisOrder('Gente & Cultura', 'Comercial')).toBeGreaterThan(0);
    expect(compareTeamNamesByAnalysisOrder('Comercial', 'Gente & Cultura')).toBeLessThan(0);
  });

  it('ignora maiúsculas e acentos ao casar', () => {
    expect(compareTeamNamesByAnalysisOrder('customer success', 'Customer Success')).toBe(0);
    expect(teamAnalysisRank('  MARKETING ')).toBe(teamAnalysisRank('Marketing'));
  });

  it('mantém times fora da lista depois dos listados, em ordem alfabética', () => {
    const ordered = sortTeamSnapshotsByAnalysisOrder([
      snap('a', 'Financeiro'),
      snap('b', 'Comercial'),
      snap('c', 'Enablement'),
    ]);
    expect(ordered.map((t) => t.teamName)).toEqual(['Comercial', 'Enablement', 'Financeiro']);
  });

  it('detecta rascunho já ordenado (evita reescrita no draft)', () => {
    const canonical = sortTeamSnapshotsByAnalysisOrder([
      snap('1', 'Produto'),
      snap('2', 'Tecnologia'),
    ]);
    expect(isTeamSnapshotOrderCanonical(canonical)).toBe(true);
    expect(isTeamSnapshotOrderCanonical(canonical.slice().reverse())).toBe(false);
  });
});
