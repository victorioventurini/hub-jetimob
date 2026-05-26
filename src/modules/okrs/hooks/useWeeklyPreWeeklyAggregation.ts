/**
 * useWeeklyPreWeeklyAggregation
 *
 * Agrega os Pré-Weeklies CONCLUÍDOS da BU para a semana de referência,
 * devolvendo os tópicos (cross-times) e os sinais de pessoas, prontos
 * para os Steps 2 e 3 da Weekly v2.
 *
 * Sem novas tabelas: lê apenas `okr_wizard_sessions` (wizard_type='pre-weekly').
 * Filtros canônicos: bu_id explícito, status='completed', soft delete.
 */

import { useQuery } from '@tanstack/react-query';
import { startOfWeek, endOfWeek } from 'date-fns';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';
import type {
  PreWeeklyDraftData,
  PreWeeklyTopic,
  PreWeeklyPeopleSignal,
  WeeklyPriorityItem,
  WeeklyPeopleSignalAggregated,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface WeeklyAggregationCoverage {
  totalLeaders: number;
  submittedLeaders: number;
  pendingLeaders: number;
}

export interface UseWeeklyPreWeeklyAggregationReturn {
  topics: WeeklyPriorityItem[];
  peopleSignals: WeeklyPeopleSignalAggregated[];
  coverage: WeeklyAggregationCoverage;
  isLoading: boolean;
  isFetching: boolean;
}

// ============================================================
// HELPERS
// ============================================================

interface SessionRow {
  id: string;
  team_id: string | null;
  started_by: string | null;
  reflection_data: unknown;
}

function isPreWeeklyDraft(value: unknown): value is { data?: PreWeeklyDraftData } {
  return !!value && typeof value === 'object';
}

function readPreWeeklyData(reflection: unknown): PreWeeklyDraftData | null {
  if (!isPreWeeklyDraft(reflection)) return null;
  const payload = (reflection as { data?: PreWeeklyDraftData }).data ?? (reflection as PreWeeklyDraftData);
  if (!payload || typeof payload !== 'object') return null;
  return payload as PreWeeklyDraftData;
}

// ============================================================
// HOOK
// ============================================================

export function useWeeklyPreWeeklyAggregation(
  referenceWeek: string,
): UseWeeklyPreWeeklyAggregationReturn {
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
  const supabase = useBuScopedSupabase();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.okrs.weeklyAggregation(buId, referenceWeek),
    enabled: !!buId && !!referenceWeek,
    staleTime: 60 * 1000,
    queryFn: async () => {
      // Parse "YYYY-MM-DD" como data local (evita shift de fuso que joga para a semana anterior)
      const ref = referenceWeek ? new Date(`${referenceWeek}T00:00:00`) : new Date();
      const weekStart = startOfWeek(ref, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(ref, { weekStartsOn: 1 }).toISOString();

      // 1) Sessões de Pré-Weekly concluídas dentro da semana
      // NOTA: okr_wizard_sessions NÃO possui coluna `deleted_at` — não filtrar.
      const { data: sessions, error: sessionsError } = await supabase
        .from('okr_wizard_sessions')
        .select('id, team_id, started_by, reflection_data')
        .eq('bu_id', buId!)
        .eq('wizard_type', 'pre-weekly')
        .eq('status', 'completed')
        .gte('completed_at', weekStart)
        .lte('completed_at', weekEnd);
      if (sessionsError) throw sessionsError;

      const rows = (sessions ?? []) as SessionRow[];

      // 2) Resolver nomes de times (para apresentar nos Steps 2/3)
      const teamIds = Array.from(
        new Set(rows.map((r) => r.team_id).filter(Boolean) as string[]),
      );
      const teamNameById = new Map<string, string>();
      if (teamIds.length > 0) {
        const { data: teams } = await supabase
          .from('teams')
          .select('id, name')
          .eq('bu_id', buId!)
          .in('id', teamIds)
          .is('deleted_at', null);
        for (const t of teams ?? []) teamNameById.set(t.id, t.name);
      }

      // 3) Líderes "esperados" — todos os times ativos da BU
      const { data: activeTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('bu_id', buId!)
        .eq('status', 'active')
        .is('deleted_at', null);
      const totalLeaders = (activeTeams ?? []).length;

      // 4) Cobertura: contar líderes únicos que enviaram nesta janela
      const submittedBy = new Set<string>();
      for (const r of rows) {
        if (r.started_by) submittedBy.add(r.started_by);
      }
      const submittedLeaders = submittedBy.size;
      const pendingLeaders = Math.max(totalLeaders - submittedLeaders, 0);

      // 5) Achatar tópicos e sinais
      const topics: WeeklyPriorityItem[] = [];
      const peopleSignals: WeeklyPeopleSignalAggregated[] = [];

      for (const row of rows) {
        const draft = readPreWeeklyData(row.reflection_data);
        if (!draft) continue;
        const teamName = (row.team_id && teamNameById.get(row.team_id)) || 'Time';

        for (const topic of draft.topics ?? []) {
          topics.push({
            id: `${row.id}::${(topic as PreWeeklyTopic).id}`,
            sourcePreWeeklyId: row.id,
            teamId: row.team_id,
            teamName,
            topic,
          });
        }

        for (const signal of draft.peopleSignals ?? []) {
          peopleSignals.push({
            id: `${row.id}::${(signal as PreWeeklyPeopleSignal).id}`,
            sourcePreWeeklyId: row.id,
            teamId: row.team_id,
            teamName,
            signal,
          });
        }
      }

      return {
        topics,
        peopleSignals,
        coverage: { totalLeaders, submittedLeaders, pendingLeaders },
      };
    },
  });

  return {
    topics: data?.topics ?? [],
    peopleSignals: data?.peopleSignals ?? [],
    coverage:
      data?.coverage ?? { totalLeaders: 0, submittedLeaders: 0, pendingLeaders: 0 },
    isLoading,
  };
}
