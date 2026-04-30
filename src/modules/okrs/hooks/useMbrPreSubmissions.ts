/**
 * useMbrPreSubmissions — agrega submissões `mbr-pre` completadas no mês corrente
 * da BU ativa e devolve, por `teamId`, o subset relevante para alimentar o MBR.
 *
 * Inclui addendums (de `okr_wizard_session_addendums`) por sessão.
 *
 * Retorno indexado por `teamId` para consumo direto pelos steps do MBR
 * (Panorama, KPI Gate, Detail, Decisions).
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

export interface UseMbrPreSubmissionsParams {
  /** YYYY-MM (mês de referência do MBR). Default = mês corrente. */
  referenceMonth?: string;
  enabled?: boolean;
}

function monthBoundsISO(referenceMonth: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(referenceMonth);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0) - 1).toISOString();
  return { start, end };
}

function currentReferenceMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

export function useMbrPreSubmissions({
  referenceMonth,
  enabled = true,
}: UseMbrPreSubmissionsParams = {}) {
  const buSupabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();

  const refMonth = referenceMonth ?? currentReferenceMonth();
  const buId = currentBu?.id ?? null;

  return useQuery<UseMbrPreSubmissionsResult>({
    queryKey: mbrKeys.preSubmissions(buId, refMonth),
    enabled: enabled && !!buSupabase && !!buId,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<UseMbrPreSubmissionsResult> => {
      if (!buSupabase || !buId) return EMPTY_RESULT;
      const bounds = monthBoundsISO(refMonth);
      if (!bounds) return EMPTY_RESULT;

      // 1) Sessions completadas no mês
      const { data: sessions, error } = await buSupabase
        .from('okr_wizard_sessions')
        .select('id, team_id, started_by, completed_at, reflection_data')
        .eq('bu_id', buId)
        .eq('wizard_type', 'mbr-pre')
        .eq('status', 'completed')
        .gte('completed_at', bounds.start)
        .lte('completed_at', bounds.end)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      if (!sessions || sessions.length === 0) return EMPTY_RESULT;

      // Mantém apenas a sessão mais recente por time (já ordenado desc).
      const latestByTeam = new Map<string, typeof sessions[number]>();
      for (const s of sessions) {
        if (!s.team_id) continue;
        if (!latestByTeam.has(s.team_id)) latestByTeam.set(s.team_id, s);
      }

      const sessionIds = Array.from(latestByTeam.values()).map(s => s.id);

      // 2) Addendums dessas sessões
      let addendumsBySession = new Map<string, MbrPreSubmissionAddendum[]>();
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

      // 3) Resolver display_name dos started_by
      const profileIds = Array.from(latestByTeam.values())
        .map(s => s.started_by)
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

      // 4) Construir map por team
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
