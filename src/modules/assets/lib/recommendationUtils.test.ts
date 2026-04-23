/**
 * Wave 2 — Tests for asset recommendation utilities.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getReviewStatus,
  getScopeType,
  scoreRecommendation,
  enrichRecommendation,
  filterAndRankRecommendations,
  groupRecommendationsByScope,
} from './recommendationUtils';
import type { AssetRecommendation } from '../types';

const baseRec = (overrides: Partial<AssetRecommendation> = {}): AssetRecommendation =>
  ({
    id: 'r1',
    name: 'Notebook Dell',
    category_id: 'cat-1',
    applicable_team_ids: [],
    applicable_job_title_ids: [],
    last_reviewed_at: null,
    review_interval_months: 6,
    ...overrides,
  } as AssetRecommendation);

describe('getReviewStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('null = overdue', () => {
    expect(getReviewStatus(null, 6)).toBe('overdue');
  });

  it('último review há 7 meses (interval 6) = overdue', () => {
    expect(getReviewStatus('2025-09-01T00:00:00Z', 6)).toBe('overdue');
  });

  it('último review há 6 meses menos 7 dias (próximo daqui 7 dias) = due_soon', () => {
    // last + 6m = 2026-04-30 → 7 dias = due_soon
    expect(getReviewStatus('2025-10-30T00:00:00Z', 6)).toBe('due_soon');
  });

  it('último review há 1 mês (interval 6) = up_to_date', () => {
    expect(getReviewStatus('2026-03-23T00:00:00Z', 6)).toBe('up_to_date');
  });
});

describe('getScopeType', () => {
  it('job_title vence team', () => {
    expect(getScopeType(['t1'], ['j1'])).toBe('job_title');
  });
  it('team quando não há job_title', () => {
    expect(getScopeType(['t1'], [])).toBe('team');
  });
  it('global quando ambos vazios', () => {
    expect(getScopeType([], [])).toBe('global');
  });
});

describe('scoreRecommendation', () => {
  it('cargo match = 100', () => {
    const r = baseRec({ applicable_job_title_ids: ['j1'] });
    expect(scoreRecommendation(r, undefined, 'j1')).toBe(100);
  });
  it('team match = 10', () => {
    const r = baseRec({ applicable_team_ids: ['t1'] });
    expect(scoreRecommendation(r, 't1')).toBe(10);
  });
  it('cargo prefere sobre time', () => {
    const r = baseRec({ applicable_team_ids: ['t1'], applicable_job_title_ids: ['j1'] });
    expect(scoreRecommendation(r, 't1', 'j1')).toBe(100);
  });
  it('global (sem scopes) = 1', () => {
    expect(scoreRecommendation(baseRec(), 't1', 'j1')).toBe(1);
  });
  it('escopado mas sem match do user = 0', () => {
    const r = baseRec({ applicable_team_ids: ['outro'] });
    expect(scoreRecommendation(r, 't1', 'j1')).toBe(0);
  });
});

describe('enrichRecommendation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('adiciona review_status e scope_type', () => {
    const r = baseRec({ applicable_team_ids: ['t1'] });
    const e = enrichRecommendation(r);
    expect(e.review_status).toBe('overdue');
    expect(e.scope_type).toBe('team');
  });
});

describe('filterAndRankRecommendations', () => {
  it('filtra por categoria', () => {
    const list = [
      baseRec({ id: 'a', category_id: 'cat-1' }),
      baseRec({ id: 'b', category_id: 'cat-2' }),
    ];
    expect(filterAndRankRecommendations(list, 'cat-1')).toHaveLength(1);
  });

  it('ordena por score desc, depois por nome asc', () => {
    const list = [
      baseRec({ id: 'a', name: 'Beta', applicable_team_ids: ['t1'] }), // 10
      baseRec({ id: 'b', name: 'Alfa', applicable_job_title_ids: ['j1'] }), // 100
      baseRec({ id: 'c', name: 'Gama' }), // 1
    ];
    const r = filterAndRankRecommendations(list, undefined, 't1', 'j1');
    expect(r.map(x => x.id)).toEqual(['b', 'a', 'c']);
  });

  it('empate de score ordena por nome PT-BR', () => {
    const list = [
      baseRec({ id: 'a', name: 'Zebra' }),
      baseRec({ id: 'b', name: 'Águia' }),
    ];
    const r = filterAndRankRecommendations(list);
    expect(r[0].name).toBe('Águia');
  });
});

describe('groupRecommendationsByScope', () => {
  it('agrupa por priority bucket', () => {
    const list = [
      baseRec({ id: 'a', applicable_job_title_ids: ['j1'] }),
      baseRec({ id: 'b', applicable_team_ids: ['t1'] }),
      baseRec({ id: 'c' }), // global
    ];
    const r = groupRecommendationsByScope(list, 't1', 'j1');
    expect(r.byJobTitle.map(x => x.id)).toEqual(['a']);
    expect(r.byTeam.map(x => x.id)).toEqual(['b']);
    expect(r.global.map(x => x.id)).toEqual(['c']);
  });

  it('escopados sem match caem no global (nunca esconde)', () => {
    const list = [baseRec({ id: 'x', applicable_team_ids: ['outro'] })];
    const r = groupRecommendationsByScope(list);
    expect(r.global.map(x => x.id)).toEqual(['x']);
  });
});
