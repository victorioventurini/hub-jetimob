/**
 * Testes unitários do useDecisionsAggregator.
 *
 * Hook que agrupa decisões por sourceStep para consolidação no DecisionsStep.
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDecisionsAggregator } from '../useDecisionsAggregator';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

function dec(id: string, sourceStep?: string): TeamCheckinDecision {
  return {
    id,
    title: `dec-${id}`,
    category: 'decision',
    sourceStep,
    createdAt: new Date().toISOString(),
    createdBy: 'tester',
  } as TeamCheckinDecision;
}

describe('useDecisionsAggregator', () => {
  it('retorna estruturas vazias quando não há decisões', () => {
    const { result } = renderHook(() => useDecisionsAggregator([], 'decisions'));
    expect(result.current.fromOtherSteps).toEqual([]);
    expect(result.current.fromCurrentStep).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.countsByStep).toEqual({});
  });

  it('separa decisões do step corrente das demais', () => {
    const decisions = [
      dec('a', 'kpis'),
      dec('b', 'krs'),
      dec('c', 'decisions'),
      dec('d', 'decisions'),
    ];
    const { result } = renderHook(() => useDecisionsAggregator(decisions, 'decisions'));

    expect(result.current.fromCurrentStep).toHaveLength(2);
    expect(result.current.fromCurrentStep.map((d) => d.id)).toEqual(['c', 'd']);

    expect(result.current.fromOtherSteps).toHaveLength(2);
    const stepIds = result.current.fromOtherSteps.map((g) => g.sourceStep).sort();
    expect(stepIds).toEqual(['kpis', 'krs']);

    expect(result.current.totalCount).toBe(4);
    expect(result.current.countsByStep).toEqual({
      kpis: 1,
      krs: 1,
      decisions: 2,
    });
  });

  it('agrupa decisões sem sourceStep no bucket __unsourced__', () => {
    const decisions = [dec('a'), dec('b', 'kpis')];
    const { result } = renderHook(() => useDecisionsAggregator(decisions, 'decisions'));

    expect(result.current.countsByStep).toEqual({
      __unsourced__: 1,
      kpis: 1,
    });
    expect(result.current.fromOtherSteps).toHaveLength(2);
  });

  it('memoiza referência estável quando inputs não mudam', () => {
    const decisions = [dec('a', 'kpis')];
    const { result, rerender } = renderHook(
      ({ d, s }: { d: TeamCheckinDecision[]; s: string }) =>
        useDecisionsAggregator(d, s),
      { initialProps: { d: decisions, s: 'decisions' } },
    );
    const first = result.current;
    rerender({ d: decisions, s: 'decisions' });
    expect(result.current).toBe(first);
  });
});
