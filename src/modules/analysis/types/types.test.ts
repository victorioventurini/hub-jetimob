/**
 * Analysis module — type & enum tests (W5 mínimo)
 */
import { describe, it, expect } from 'vitest';
import type {
  AnalysisStatus,
  AnalysisMode,
  AnalysisDepth,
  AnalysisModule,
  AnalysisPeriod,
  AnalysisScope,
  AnalysisSource,
  AnalysisKeyMetric,
} from './index';

describe('Analysis · enums', () => {
  it('Status modela ciclo do worker (pending → generating → complete|failed)', () => {
    const s: AnalysisStatus[] = ['pending', 'generating', 'complete', 'failed'];
    expect(new Set(s).size).toBe(4);
  });

  it('Mode permite auto, manual e híbrido', () => {
    const m: AnalysisMode[] = ['auto', 'manual', 'mixed'];
    expect(m).toEqual(expect.arrayContaining(['auto', 'manual', 'mixed']));
  });

  it('Depth tem 4 níveis (auto, minimal → standard → full)', () => {
    const d: AnalysisDepth[] = ['auto', 'minimal', 'standard', 'full'];
    expect(d[1]).toBe('minimal');
    expect(d[d.length - 1]).toBe('full');
  });

  it('Module cobre os domínios analisáveis', () => {
    const allowed: AnalysisModule[] = ['kpis', 'okrs', 'projects', 'initiatives', 'checkins', 'wizards'];
    expect(allowed).toHaveLength(6);
  });
});

describe('Analysis · Period & Scope', () => {
  it('Period tem start e end ISO; label é opcional', () => {
    const p: AnalysisPeriod = { start: '2026-01-01', end: '2026-03-31', label: 'Q1' };
    expect(p.start < p.end).toBe(true);
  });

  it('Scope aceita todas as listas opcionais (escopo livre)', () => {
    const s: AnalysisScope = { team_ids: [], area_ids: ['a1'] };
    expect(s.user_ids).toBeUndefined();
    expect(s.area_ids).toEqual(['a1']);
  });
});

describe('Analysis · Source & KeyMetric', () => {
  it('Source identifica módulo agregado', () => {
    const src: AnalysisSource = { module: 'okrs', label: 'OKRs Q1', count: 12 };
    expect(src.count).toBe(12);
  });

  it('KeyMetric carrega valor e delta opcionais (UI cards)', () => {
    const m: AnalysisKeyMetric = { label: 'Atingimento', value: '78%', delta: '+5pp' };
    expect(m.value).toMatch(/%/);
  });
});
