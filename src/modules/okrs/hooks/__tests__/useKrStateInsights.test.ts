/**
 * Tests for calculateKrState and utility functions
 * 
 * Covers the 8 KR states, priority ordering, filtering,
 * grouping by severity, and config retrieval.
 * 
 * @see docs/guides/WIZARD_DEVELOPMENT_GUIDE.md
 */

import { describe, it, expect } from 'vitest';
import {
  calculateKrState,
  getKrStateConfig,
  groupKrStatesBySeverity,
  filterKrsRequiringAttention,
  filterKrsForCelebration,
  sortByStatePriority,
  KR_STATE_CONFIG,
  KR_STATE_PRIORITY_ORDER,
  type KrState,
  type CalculateKrStateParams,
} from '../useKrStateInsights';

// ============================================================
// calculateKrState — 8 estados
// ============================================================

describe('calculateKrState', () => {
  const base: CalculateKrStateParams = {
    progress: 50,
    status: 'green',
    daysSinceCheckin: 3,
    cycleEnded: false,
    expectedProgress: 50,
  };

  // --- not_started ---
  it('retorna not_started quando progress = 0 e ciclo ativo', () => {
    expect(calculateKrState({ ...base, progress: 0 })).toBe('not_started');
  });

  // --- healthy ---
  it('retorna healthy quando progresso conforme esperado e RAG green', () => {
    expect(calculateKrState(base)).toBe('healthy');
  });

  it('retorna healthy quando RAG green e sem gap significativo', () => {
    expect(calculateKrState({ ...base, progress: 45, expectedProgress: 50 })).toBe('healthy');
  });

  // --- stagnant ---
  it('retorna stagnant quando daysSinceCheckin >= 14', () => {
    expect(calculateKrState({ ...base, daysSinceCheckin: 14 })).toBe('stagnant');
  });

  it('retorna stagnant quando daysSinceCheckin = 30', () => {
    expect(calculateKrState({ ...base, daysSinceCheckin: 30 })).toBe('stagnant');
  });

  it('stagnant tem precedência sobre at_risk (RAG yellow + 14 dias)', () => {
    expect(calculateKrState({
      ...base,
      status: 'yellow',
      daysSinceCheckin: 14,
    })).toBe('stagnant');
  });

  it('stagnant tem precedência sobre off_track (RAG red + 14 dias)', () => {
    expect(calculateKrState({
      ...base,
      status: 'red',
      daysSinceCheckin: 14,
    })).toBe('stagnant');
  });

  // --- at_risk ---
  it('retorna at_risk quando RAG yellow', () => {
    expect(calculateKrState({ ...base, status: 'yellow' })).toBe('at_risk');
  });

  it('retorna at_risk quando gap > 15% abaixo do expected', () => {
    expect(calculateKrState({
      ...base,
      progress: 30,
      expectedProgress: 50,
      status: 'green',
    })).toBe('at_risk');
  });

  it('não retorna at_risk quando gap <= 15%', () => {
    expect(calculateKrState({
      ...base,
      progress: 40,
      expectedProgress: 50,
      status: 'green',
    })).toBe('healthy');
  });

  // --- off_track ---
  it('retorna off_track quando RAG red', () => {
    expect(calculateKrState({ ...base, status: 'red' })).toBe('off_track');
  });

  // --- achieved ---
  it('retorna achieved quando progress = 100 e ciclo ativo', () => {
    expect(calculateKrState({ ...base, progress: 100 })).toBe('achieved');
  });

  it('retorna achieved quando progress = 100 e ciclo encerrado', () => {
    expect(calculateKrState({ ...base, progress: 100, cycleEnded: true })).toBe('achieved');
  });

  // --- exceeded ---
  it('retorna exceeded quando progress > 100 e ciclo ativo', () => {
    expect(calculateKrState({ ...base, progress: 156 })).toBe('exceeded');
  });

  it('retorna exceeded quando progress > 100 e ciclo encerrado', () => {
    expect(calculateKrState({ ...base, progress: 156, cycleEnded: true })).toBe('exceeded');
  });

  it('exceeded com 200% retornado corretamente (no-clamp)', () => {
    expect(calculateKrState({ ...base, progress: 200 })).toBe('exceeded');
  });

  // --- not_achieved ---
  it('retorna not_achieved quando ciclo encerrado e progress < 100', () => {
    expect(calculateKrState({ ...base, cycleEnded: true, progress: 80 })).toBe('not_achieved');
  });

  it('retorna not_achieved quando ciclo encerrado e progress = 0', () => {
    expect(calculateKrState({ ...base, cycleEnded: true, progress: 0 })).toBe('not_achieved');
  });

  it('retorna not_achieved quando ciclo encerrado e progress = 50', () => {
    expect(calculateKrState({ ...base, cycleEnded: true, progress: 50 })).toBe('not_achieved');
  });

  // --- Ciclo encerrado ignora RAG e daysSinceCheckin ---
  it('ciclo encerrado: ignora RAG red e retorna not_achieved', () => {
    expect(calculateKrState({
      ...base,
      cycleEnded: true,
      progress: 60,
      status: 'red',
    })).toBe('not_achieved');
  });

  it('ciclo encerrado: ignora stagnant e retorna not_achieved', () => {
    expect(calculateKrState({
      ...base,
      cycleEnded: true,
      progress: 40,
      daysSinceCheckin: 30,
    })).toBe('not_achieved');
  });

  // --- Edge cases ---
  it('progress = 0 com status null retorna not_started', () => {
    expect(calculateKrState({ ...base, progress: 0, status: null })).toBe('not_started');
  });

  it('progress = 0 com status not_started retorna not_started', () => {
    expect(calculateKrState({ ...base, progress: 0, status: 'not_started' })).toBe('not_started');
  });

  it('expectedProgress = 0 não dispara at_risk por gap', () => {
    expect(calculateKrState({
      ...base,
      progress: 30,
      expectedProgress: 0,
      status: 'green',
    })).toBe('healthy');
  });

  it('daysSinceCheckin = 13 não é stagnant', () => {
    expect(calculateKrState({ ...base, daysSinceCheckin: 13 })).not.toBe('stagnant');
  });
});

// ============================================================
// getKrStateConfig
// ============================================================

describe('getKrStateConfig', () => {
  const allStates: KrState[] = [
    'not_started', 'healthy', 'stagnant', 'at_risk',
    'off_track', 'achieved', 'exceeded', 'not_achieved',
  ];

  it.each(allStates)('retorna config completa para estado "%s"', (state) => {
    const config = getKrStateConfig(state);
    expect(config).toBeDefined();
    expect(config.state).toBe(state);
    expect(config.label).toBeTruthy();
    expect(config.description).toBeTruthy();
    expect(config.severity).toMatch(/^(info|warning|critical)$/);
    expect(config.icon).toBeDefined();
    expect(config.colorClass).toBeTruthy();
    expect(config.bgClass).toBeTruthy();
    expect(config.borderClass).toBeTruthy();
    expect(config.guidingQuestion).toBeTruthy();
    expect(config.aiPrompt).toBeTruthy();
  });

  it('achieved tem severity info', () => {
    expect(getKrStateConfig('achieved').severity).toBe('info');
  });

  it('off_track tem severity critical', () => {
    expect(getKrStateConfig('off_track').severity).toBe('critical');
  });

  it('stagnant tem severity warning', () => {
    expect(getKrStateConfig('stagnant').severity).toBe('warning');
  });
});

// ============================================================
// groupKrStatesBySeverity
// ============================================================

describe('groupKrStatesBySeverity', () => {
  const items = [
    { state: 'off_track' as KrState, id: '1' },
    { state: 'healthy' as KrState, id: '2' },
    { state: 'stagnant' as KrState, id: '3' },
    { state: 'achieved' as KrState, id: '4' },
    { state: 'at_risk' as KrState, id: '5' },
    { state: 'exceeded' as KrState, id: '6' },
    { state: 'not_achieved' as KrState, id: '7' },
    { state: 'not_started' as KrState, id: '8' },
  ];

  it('agrupa critical corretamente', () => {
    const grouped = groupKrStatesBySeverity(items);
    expect(grouped.critical).toHaveLength(1);
    expect(grouped.critical[0].state).toBe('off_track');
  });

  it('agrupa warning corretamente', () => {
    const grouped = groupKrStatesBySeverity(items);
    expect(grouped.warning).toHaveLength(3); // stagnant, at_risk, not_achieved
  });

  it('agrupa info corretamente', () => {
    const grouped = groupKrStatesBySeverity(items);
    expect(grouped.info).toHaveLength(4); // healthy, achieved, exceeded, not_started
  });

  it('retorna arrays vazios quando sem itens', () => {
    const grouped = groupKrStatesBySeverity([]);
    expect(grouped.critical).toHaveLength(0);
    expect(grouped.warning).toHaveLength(0);
    expect(grouped.info).toHaveLength(0);
  });
});

// ============================================================
// filterKrsRequiringAttention
// ============================================================

describe('filterKrsRequiringAttention', () => {
  const items = [
    { state: 'healthy' as KrState },
    { state: 'stagnant' as KrState },
    { state: 'at_risk' as KrState },
    { state: 'off_track' as KrState },
    { state: 'achieved' as KrState },
    { state: 'exceeded' as KrState },
    { state: 'not_achieved' as KrState },
    { state: 'not_started' as KrState },
  ];

  it('retorna stagnant, at_risk, off_track, not_achieved', () => {
    const result = filterKrsRequiringAttention(items);
    expect(result).toHaveLength(4);
    const states = result.map(r => r.state);
    expect(states).toContain('stagnant');
    expect(states).toContain('at_risk');
    expect(states).toContain('off_track');
    expect(states).toContain('not_achieved');
  });

  it('não inclui healthy, achieved, exceeded, not_started', () => {
    const result = filterKrsRequiringAttention(items);
    const states = result.map(r => r.state);
    expect(states).not.toContain('healthy');
    expect(states).not.toContain('achieved');
    expect(states).not.toContain('exceeded');
    expect(states).not.toContain('not_started');
  });

  it('retorna vazio quando todos saudáveis', () => {
    const healthy = [{ state: 'healthy' as KrState }, { state: 'achieved' as KrState }];
    expect(filterKrsRequiringAttention(healthy)).toHaveLength(0);
  });
});

// ============================================================
// filterKrsForCelebration
// ============================================================

describe('filterKrsForCelebration', () => {
  const items = [
    { state: 'healthy' as KrState },
    { state: 'achieved' as KrState },
    { state: 'exceeded' as KrState },
    { state: 'off_track' as KrState },
  ];

  it('retorna achieved e exceeded', () => {
    const result = filterKrsForCelebration(items);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.state)).toEqual(['achieved', 'exceeded']);
  });

  it('retorna vazio quando nenhum celebrável', () => {
    expect(filterKrsForCelebration([{ state: 'healthy' as KrState }])).toHaveLength(0);
  });
});

// ============================================================
// sortByStatePriority
// ============================================================

describe('sortByStatePriority', () => {
  it('ordena critical primeiro, depois warning, depois info', () => {
    const items = [
      { state: 'healthy' as KrState },
      { state: 'off_track' as KrState },
      { state: 'achieved' as KrState },
      { state: 'at_risk' as KrState },
      { state: 'not_started' as KrState },
    ];

    const sorted = sortByStatePriority(items);
    expect(sorted[0].state).toBe('off_track');
    expect(sorted[1].state).toBe('at_risk');
    expect(sorted[sorted.length - 1].state).toBe('not_started');
  });

  it('preserva ordem relativa da prioridade', () => {
    const sorted = sortByStatePriority([
      { state: 'not_started' as KrState },
      { state: 'exceeded' as KrState },
      { state: 'stagnant' as KrState },
    ]);
    expect(sorted.map(s => s.state)).toEqual(['stagnant', 'exceeded', 'not_started']);
  });

  it('não modifica array original', () => {
    const items = [{ state: 'healthy' as KrState }, { state: 'off_track' as KrState }];
    const sorted = sortByStatePriority(items);
    expect(items[0].state).toBe('healthy');
    expect(sorted[0].state).toBe('off_track');
  });

  it('array vazio retorna vazio', () => {
    expect(sortByStatePriority([])).toEqual([]);
  });
});

// ============================================================
// KR_STATE_PRIORITY_ORDER
// ============================================================

describe('KR_STATE_PRIORITY_ORDER', () => {
  it('contém todos os 8 estados', () => {
    expect(KR_STATE_PRIORITY_ORDER).toHaveLength(8);
  });

  it('off_track é o primeiro (mais crítico)', () => {
    expect(KR_STATE_PRIORITY_ORDER[0]).toBe('off_track');
  });

  it('not_started é o último (menos urgente)', () => {
    expect(KR_STATE_PRIORITY_ORDER[KR_STATE_PRIORITY_ORDER.length - 1]).toBe('not_started');
  });
});

// ============================================================
// KR_STATE_CONFIG completeness
// ============================================================

describe('KR_STATE_CONFIG', () => {
  it('tem configuração para todos os 8 estados', () => {
    const states: KrState[] = [
      'not_started', 'healthy', 'stagnant', 'at_risk',
      'off_track', 'achieved', 'exceeded', 'not_achieved',
    ];
    states.forEach(state => {
      expect(KR_STATE_CONFIG[state]).toBeDefined();
    });
  });
});
