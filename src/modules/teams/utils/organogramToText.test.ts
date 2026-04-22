/**
 * Teams · organogramToText — pure rendering tests (W5 mínimo)
 */
import { describe, it, expect } from 'vitest';
import { organogramToText } from './organogramToText';
import type { OrganogramData, OrganogramFilters, OrganogramNode } from '../types/organogram';

const FILTERS_FULL: OrganogramFilters = { showMembers: true, showSquads: true } as any;
const FILTERS_NO_MEMBERS: OrganogramFilters = { showMembers: false, showSquads: true } as any;

const mkPerson = (name: string, email?: string): OrganogramNode => ({
  type: 'person', name, email, children: [],
} as any);

const mkArea = (name: string, children: OrganogramNode[] = []): OrganogramNode => ({
  type: 'area', name, leaderName: null, children,
} as any);

describe('Teams · organogramToText · header & footer', () => {
  it('renderiza header com nome da BU e contagem de pessoas', () => {
    const data: OrganogramData = { ceo: null, areas: [] } as any;
    const out = organogramToText(data, FILTERS_FULL, 'Jet BU');
    expect(out).toContain('ORGANOGRAMA - Jet BU');
    expect(out).toMatch(/Total: 0 pessoas/);
  });

  it('singulariza "pessoa" quando count=1', () => {
    const data: OrganogramData = { ceo: { type: 'person', name: 'CEO X', children: [] } as any, areas: [] } as any;
    const out = organogramToText(data, FILTERS_FULL, 'BU');
    expect(out).toContain('CEO: CEO X');
    expect(out).toMatch(/Total: 1 pessoa$/m);
  });
});

describe('Teams · organogramToText · filtros', () => {
  it('omite pessoas quando showMembers=false', () => {
    const area = mkArea('Engenharia', [mkPerson('Joana', 'j@x.com')]);
    const data: OrganogramData = { ceo: null, areas: [area] } as any;
    const out = organogramToText(data, FILTERS_NO_MEMBERS, 'BU');
    expect(out).not.toContain('Joana');
    expect(out).toContain('ÁREA: Engenharia');
  });

  it('renderiza email entre parênteses quando presente', () => {
    const area = mkArea('Eng', [mkPerson('Ana', 'ana@x.com')]);
    const data: OrganogramData = { ceo: null, areas: [area] } as any;
    const out = organogramToText(data, FILTERS_FULL, 'BU');
    expect(out).toContain('Ana (ana@x.com)');
  });
});
