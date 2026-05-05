/**
 * useMbrPreSubmissions — agrega submissões `mbr-pre` cujo **mês alvo da
 * análise** (`reflection_data.data.referenceMonth`) é igual ao `referenceMonth`
 * solicitado pelo MBR.
 *
 * Antes (bug): filtrava por `completed_at` no mês civil, o que falhava quando
 * pré-MBRs eram feitos com atraso (ex.: pré-MBR de abril completado em 06/maio
 * sumia do MBR de abril). Agora pareamos pelo mês analisado, que é o conceito
 * canônico e estável.
 *
 * Para retrocompat com submissões antigas que **não** gravavam `referenceMonth`,
 * caímos no fallback: usar o mês civil de `completed_at` como mês alvo
 * implícito (era exatamente o comportamento histórico).
 */

import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { mbrKeys } from '@/lib/queryKeys/okrs';
import type {
  MbrPreDraftData,
  MbrPreTeamSubmission,
  MbrPreSubmissionAddendum,
} from '../types/wizard/mbr';
import {
  defaultReferenceMonth,
  monthBoundsISO,
  previousMonthOf,
} from '@/modules/okrs/utils/mbr/referenceMonth';

export interface UseMbrPreSubmissionsParams {
  /** YYYY-MM (mês analisado pelo MBR). Default = mês imediatamente anterior. */
  referenceMonth?: string;
  enabled?: boolean;
}

export interface UseMbrPreSubmissionsResult {
  /** Map por teamId → submissão consolidada. */
  byTeam: Record<string, MbrPreTeamSubmission>;
  /** Lista de addendums por teamId (compat com prop `teamAddendums` do Detail step). */
  addendumsByTeam: Record<string, MbrPreSubmissionAddendum[]>;
  /** Quantidade de times que submeteram. */
  submittedCount: number;
}

const EMPTY_RESULT: UseMbrPreSubmissionsResult = {
  byTeam: {},
  addendumsByTeam: {},
  submittedCount: 0,
};

/** Extrai o referenceMonth gravado no draft, ou retorna null se ausente. */
function extractRefMonth(reflection: unknown): string | null {
  if (!reflection || typeof reflection !== 'object') return null;
  const root = reflection as { data?: unknown; referenceMonth?: unknown };
  // Formato canônico do useGenericWizardDraft: { data: MbrPreDraftData }
  if (root.data && typeof root.data === 'object') {
    const d = root.data as { referenceMonth?: unknown };
    if (typeof d.referenceMonth === 'string') return d.referenceMonth;
  }
  // Fallback raro: gravado direto na raiz
  if (typeof root.referenceMonth === 'string') return root.referenceMonth;
  return null;
}

/** Converte ISO `completed_at` em YYYY-MM (fuso local), para fallback de drafts antigos. */
function completedAtToYearMonth(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function useMbrPreSubmissions({
  referenceMonth,
  enabled = true,
}: UseMbrPreSubmissionsParams = {}) {
  const buSupabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();

  const refMonth = referenceMonth ?? defaultReferenceMonth();
  const buId = currentBu?.id ?? null;

  return useQuery<UseMbrPreSubmissionsResult>({
    queryKey: mbrKeys.preSubmissions(buId, refMonth),
    enabled: enabled && !!buSupabase && !!buId,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<UseMbrPreSubmissionsResult> => {
      if (!buSupabase || !buId) return EMPTY_RESULT;

      // Janela de busca generosa: do início do mês alvo até o fim do mês
      // imediatamente seguinte. Cobre pré-MBRs feitos no início do mês
      // seguinte (caso comum) e ainda permite atrasos pequenos. O filtro
      // efetivo é por `referenceMonth` no payload (abaixo).
      const targetBounds = monthBoundsISO(refMonth);
      if (!targetBounds) return EMPTY_RESULT;
      const nextMonthYm = (() => {
        const m = /^(\d{4})-(\d{2})$/.exec(refMonth);
        if (!m) return refMonth;
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = new Date(y, mo, 1); // mês seguinte
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      })();
      const nextBounds = monthBoundsISO(nextMonthYm);
      const windowStart = targetBounds.start;
      const windowEnd = nextBounds?.end ?? targetBounds.end;
      // Cobre também retrocompat (drafts antigos feitos no mês alvo).
      const fallbackPreviousBounds = monthBoundsISO(previousMonthOf(refMonth));

      // 1) Sessions completadas dentro da janela ampla
      const { data: sessions, error } = await buSupabase
        .from('okr_wizard_sessions')
        .select('id, team_id, started_by, completed_at, reflection_data')
        .eq('bu_id', buId)
        .eq('wizard_type', 'mbr-pre')
        .eq('status', 'completed')
        .gte('completed_at', fallbackPreviousBounds?.start ?? windowStart)
        .lte('completed_at', windowEnd)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      if (!sessions || sessions.length === 0) return EMPTY_RESULT;

      // 2) Filtrar por referenceMonth do payload (com fallback p/ drafts antigos).
      // Fallback heurístico (drafts sem `referenceMonth` persistido): pré-MBRs
      // costumam ser concluídos no início do mês *seguinte* ao analisado.
      // Aceitamos, portanto, completions cujo mês civil seja `refMonth` (envio
      // dentro do próprio mês) OU o mês imediatamente seguinte (caso comum).
      const nextOfRef = nextMonthYm; // já calculado acima
      const matching = sessions.filter((s) => {
        const explicit = extractRefMonth(s.reflection_data);
        if (explicit) return explicit === refMonth;
        const completedYm = completedAtToYearMonth(s.completed_at as string);
        return completedYm === refMonth || completedYm === nextOfRef;
      });
      if (matching.length === 0) return EMPTY_RESULT;

      // 3) Mantém apenas a sessão mais recente por time (já ordenado desc).
      const latestByTeam = new Map<string, typeof sessions[number]>();
      for (const s of matching) {
        if (!s.team_id) continue;
        if (!latestByTeam.has(s.team_id)) latestByTeam.set(s.team_id, s);
      }

      const sessionIds = Array.from(latestByTeam.values()).map((s) => s.id);

      // 4) Addendums dessas sessões
      const addendumsBySession = new Map<string, MbrPreSubmissionAddendum[]>();
      if (sessionIds.length > 0) {
        const { data: addRows } = await (buSupabase as any)
          .from('okr_wizard_addendums')
          .select('session_id, text, created_at, created_by')
          .in('session_id', sessionIds)
          .order('created_at', { ascending: true });

        for (const a of (addRows ?? []) as Array<{ session_id: string; text: string; created_at: string; created_by: string }>) {
          const list = addendumsBySession.get(a.session_id) ?? [];
          list.push({
            text: String(a.text ?? ''),
            created_at: a.created_at,
            created_by: a.created_by ?? '',
          });
          addendumsBySession.set(a.session_id, list);
        }
      }

      // 5) Resolver display_name dos started_by
      const profileIds = Array.from(latestByTeam.values())
        .map((s) => s.started_by)
        .filter((id): id is string => !!id);
      const namesById = new Map<string, string>();
      if (profileIds.length > 0) {
        const { data: profiles } = await buSupabase
          .from('profiles')
          .select('id, display_name')
          .in('id', profileIds);
        for (const p of profiles ?? []) {
          if (p.display_name) namesById.set(p.id, p.display_name as string);
        }
      }

      // 6) Construir map por team
      const byTeam: Record<string, MbrPreTeamSubmission> = {};
      const addendumsByTeam: Record<string, MbrPreSubmissionAddendum[]> = {};

      for (const [teamId, session] of latestByTeam.entries()) {
        const refData = (session.reflection_data ?? {}) as { data?: MbrPreDraftData } | MbrPreDraftData;
        const draftData = ('data' in (refData as object)
          ? (refData as { data?: MbrPreDraftData }).data
          : (refData as MbrPreDraftData)) ?? null;

        if (!draftData) continue;

        const addendums = addendumsBySession.get(session.id) ?? [];
        addendumsByTeam[teamId] = addendums;

        byTeam[teamId] = {
          sessionId: session.id,
          teamId,
          submittedAt: session.completed_at as string,
          submittedBy: session.started_by ?? null,
          submittedByName: session.started_by ? namesById.get(session.started_by) ?? null : null,
          highlights: draftData.highlights ?? { accelerated: '', blocked: '', needsDecision: '' },
          nextSteps: draftData.nextSteps ?? { focus: '', prioritizedItems: [], crossDependencies: [] },
          kpisToCreate: Array.isArray(draftData.kpisToCreate) ? draftData.kpisToCreate : [],
          krFinalStates: Array.isArray(draftData.krFinalStates) ? draftData.krFinalStates : [],
          addendums,
          kpiSnapshots: Array.isArray(draftData.kpiSnapshots) ? draftData.kpiSnapshots : [],
          kpiJustifications: (draftData.kpiJustifications && typeof draftData.kpiJustifications === 'object')
            ? draftData.kpiJustifications
            : {},
          kpiNoDataReasons: (draftData.kpiNoDataReasons && typeof draftData.kpiNoDataReasons === 'object')
            ? draftData.kpiNoDataReasons
            : {},
          kpiOutdatedUpdates: (draftData.kpiOutdatedUpdates && typeof draftData.kpiOutdatedUpdates === 'object')
            ? draftData.kpiOutdatedUpdates
            : {},
          projectJustifications: (draftData.projectJustifications && typeof draftData.projectJustifications === 'object')
            ? {
                projects: draftData.projectJustifications.projects ?? {},
                milestones: draftData.projectJustifications.milestones ?? {},
              }
            : { projects: {}, milestones: {} },
          krJustifications: (draftData.krJustifications && typeof draftData.krJustifications === 'object')
            ? draftData.krJustifications
            : {},
          agendaSuggestions: Array.isArray(draftData.agendaSuggestions) ? draftData.agendaSuggestions : [],
          monthAnalysis: draftData.monthAnalysis ?? null,
          decisions: Array.isArray(draftData.decisions) ? draftData.decisions : [],
        };
      }

      return {
        byTeam,
        addendumsByTeam,
        submittedCount: Object.keys(byTeam).length,
      };
    },
  });
}
