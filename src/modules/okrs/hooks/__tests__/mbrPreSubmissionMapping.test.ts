/**
 * Regression test (v3.31.1) — mapping `reflection_data → MbrPreTeamSubmission`
 * preserva `kpiNoDataReasons` 1:1 e ignora valores não-objeto.
 *
 * Replicamos a função inline que vive em `useMbrPreSubmissions.ts` (linhas
 * 209–211) para isolar do React Query / Supabase. Se o shape mudar, o teste
 * quebra junto.
 */
import { describe, it, expect } from 'vitest';
import type { MbrPreDraftData } from '@/modules/okrs/types/wizard/mbr';

function pickNoDataReasons(
  draftData: Partial<MbrPreDraftData>,
): Record<string, string> {
  return draftData.kpiNoDataReasons && typeof draftData.kpiNoDataReasons === 'object'
    ? draftData.kpiNoDataReasons
    : {};
}

describe('mbr-pre submission mapping — kpiNoDataReasons', () => {
  it('preserva o map quando presente', () => {
    const input = {
      kpiNoDataReasons: { 'kpi-1': 'integração offline', 'kpi-2': 'sem responsável' },
    } as Partial<MbrPreDraftData>;
    expect(pickNoDataReasons(input)).toEqual({
      'kpi-1': 'integração offline',
      'kpi-2': 'sem responsável',
    });
  });

  it('retorna {} quando ausente', () => {
    expect(pickNoDataReasons({})).toEqual({});
  });

  it('retorna {} quando shape inválido', () => {
    expect(pickNoDataReasons({ kpiNoDataReasons: null as unknown as Record<string, string> })).toEqual({});
    expect(pickNoDataReasons({ kpiNoDataReasons: 'string' as unknown as Record<string, string> })).toEqual({});
  });

  it('aceita map vazio sem virar fallback', () => {
    expect(pickNoDataReasons({ kpiNoDataReasons: {} })).toEqual({});
  });
});
