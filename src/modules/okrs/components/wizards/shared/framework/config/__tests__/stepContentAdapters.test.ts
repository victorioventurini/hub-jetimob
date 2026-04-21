/**
 * Testes da função pura `groupDecisionsBySourceStep`.
 *
 * Hoje exercitada indiretamente por `useDecisionsAggregator`. Cobertura
 * direta blinda contratos de adapter sem necessidade de React/render —
 * detecta drift no shape `DecisionsBySourceStep` antes do hook.
 */

import { describe, it, expect } from 'vitest';
import {
  groupDecisionsBySourceStep,
  type DecisionsBySourceStep,
} from '../stepContentAdapters';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

const mkDecision = (
  id: string,
  sourceStep: string | undefined,
  text = `decisão ${id}`,
): TeamCheckinDecision => ({
  id,
  text,
  sourceStep,
  // Campos mínimos exigidos pelo type — propriedades opcionais omitidas
  // intencionalmente para validar que o agrupamento não depende delas.
} as TeamCheckinDecision);

describe('groupDecisionsBySourceStep', () => {
  it('retorna lista vazia quando não há decisões', () => {
    expect(groupDecisionsBySourceStep([])).toEqual([]);
  });

  it('agrupa decisões pelo sourceStep e calcula counts', () => {
    const decisions = [
      mkDecision('1', 'kpis'),
      mkDecision('2', 'kpis'),
      mkDecision('3', 'krs'),
    ];

    const result = groupDecisionsBySourceStep(decisions);

    expect(result).toHaveLength(2);
    const kpis = result.find((g) => g.sourceStep === 'kpis')!;
    const krs = result.find((g) => g.sourceStep === 'krs')!;
    expect(kpis.count).toBe(2);
    expect(kpis.decisions.map((d) => d.id)).toEqual(['1', '2']);
    expect(krs.count).toBe(1);
    expect(krs.decisions.map((d) => d.id)).toEqual(['3']);
  });

  it('move decisões sem sourceStep para o bucket __unsourced__', () => {
    const decisions = [
      mkDecision('1', undefined),
      mkDecision('2', undefined),
      mkDecision('3', 'kpis'),
    ];

    const result = groupDecisionsBySourceStep(decisions);

    const unsourced = result.find((g) => g.sourceStep === '__unsourced__');
    expect(unsourced).toBeDefined();
    expect(unsourced!.count).toBe(2);
    expect(unsourced!.decisions.map((d) => d.id)).toEqual(['1', '2']);
  });

  it('preserva a ordem de inserção das decisões dentro de cada bucket', () => {
    const decisions = [
      mkDecision('a', 'kpis'),
      mkDecision('b', 'krs'),
      mkDecision('c', 'kpis'),
      mkDecision('d', 'krs'),
    ];

    const result = groupDecisionsBySourceStep(decisions);

    const kpis = result.find((g) => g.sourceStep === 'kpis')!;
    const krs = result.find((g) => g.sourceStep === 'krs')!;
    expect(kpis.decisions.map((d) => d.id)).toEqual(['a', 'c']);
    expect(krs.decisions.map((d) => d.id)).toEqual(['b', 'd']);
  });

  it('cada item retornado tem o shape DecisionsBySourceStep', () => {
    const decisions = [mkDecision('1', 'kpis')];
    const [item] = groupDecisionsBySourceStep(decisions);
    const expected: DecisionsBySourceStep = {
      sourceStep: 'kpis',
      count: 1,
      decisions: [decisions[0]],
    };
    expect(item).toEqual(expected);
  });

  it('lida com sourceStep vazio (string "") como bucket próprio', () => {
    // String vazia é distinta de `undefined` — não deve cair em __unsourced__.
    const decisions = [mkDecision('1', ''), mkDecision('2', undefined)];
    const result = groupDecisionsBySourceStep(decisions);
    expect(result).toHaveLength(2);
    expect(result.some((g) => g.sourceStep === '')).toBe(true);
    expect(result.some((g) => g.sourceStep === '__unsourced__')).toBe(true);
  });
});
