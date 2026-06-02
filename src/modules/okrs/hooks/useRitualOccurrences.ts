/**
 * useRitualOccurrences - Hook for fetching ritual occurrence data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

/**
 * MBR/Pré-MBR — quando uma ocorrência é reagendada, deslocamos a janela
 * de `ritual_window_overrides` correspondente (mesmo bu + wizard_type + datas
 * cobrindo o dia original) preservando o tamanho da janela. Caso não exista
 * override, criamos uma de 1 dia (opens=closes=newDate). Isso mantém o gate
 * de disponibilidade do rito alinhado com o calendário operacional.
 */
async function syncMbrWindowOverrideOnReschedule(
  buSupabase: any,
  params: { buId: string; wizardType: string; oldDate: string; newDate: string },
): Promise<void> {
  if (!['mbr', 'mbr-pre'].includes(params.wizardType)) return;
  if (!params.buId || !params.oldDate || !params.newDate) return;

  const dayMs = 24 * 60 * 60 * 1000;
  const shiftDays = Math.round(
    (new Date(params.newDate + 'T00:00:00').getTime() -
      new Date(params.oldDate + 'T00:00:00').getTime()) / dayMs,
  );
  if (shiftDays === 0) return;

  const { data: overrides } = await buSupabase
    .from('ritual_window_overrides')
    .select('id, opens_date, closes_date, cycle_id')
    .eq('bu_id', params.buId)
    .eq('wizard_type', params.wizardType)
    .lte('opens_date', params.oldDate)
    .gte('closes_date', params.oldDate);

  const addDays = (iso: string, days: number) => {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  for (const o of overrides ?? []) {
    await buSupabase
      .from('ritual_window_overrides')
      .update({
        opens_date: addDays(o.opens_date, shiftDays),
        closes_date: addDays(o.closes_date, shiftDays),
        reason: `Sincronizado com reagendamento (${params.oldDate} → ${params.newDate})`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', o.id);
  }
}

// ============================================================
// TYPES
// ============================================================

export type OccurrenceStatus = 'scheduled' | 'completed_on_time' | 'completed_late' | 'missed' | 'rescheduled';

export interface RitualOccurrence {
  id: string;
  buId: string;
  cadenceId: string | null;
  wizardType: string;
  teamId: string | null;
  teamName: string | null;
  plannedDate: string;
  status: OccurrenceStatus;
  actualDate: string | null;
  rescheduledFrom: string | null;
  rescheduledTo: string | null;
  sessionId: string | null;
  notes: string | null;
}

export interface OccurrenceFilters {
  month?: number; // 0-11
  year?: number;
  teamId?: string | null;
  wizardType?: string | null;
}

const OCCURRENCE_FIELDS = `
  id, bu_id, cadence_id, wizard_type, team_id, planned_date,
  status, actual_date, rescheduled_from, rescheduled_to,
  session_id, notes,
  teams!ritual_occurrences_team_id_fkey ( name )
`;

function mapOccurrence(row: any): RitualOccurrence {
  return {
    id: row.id,
    buId: row.bu_id,
    cadenceId: row.cadence_id,
    wizardType: row.wizard_type,
    teamId: row.team_id,
    teamName: row.teams?.name ?? null,
    plannedDate: row.planned_date,
    status: row.status as OccurrenceStatus,
    actualDate: row.actual_date,
    rescheduledFrom: row.rescheduled_from,
    rescheduledTo: row.rescheduled_to,
    sessionId: row.session_id,
    notes: row.notes,
  };
}

// ============================================================
// HOOKS
// ============================================================

export function useRitualOccurrences(filters: OccurrenceFilters = {}) {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();

  const year = filters.year ?? new Date().getFullYear();
  const month = filters.month ?? new Date().getMonth();

  // Date range for the month
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endMonth = month === 11 ? 0 : month + 1;
  const endYear = month === 11 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`;

  return useQuery({
    queryKey: queryKeys.okrs.ritualOccurrences(currentBu?.id ?? null, { year, month, teamId: filters.teamId, wizardType: filters.wizardType }),
    queryFn: async () => {
      if (!currentBu?.id) return [];

      let query = buSupabase
        .from('ritual_occurrences')
        .select(OCCURRENCE_FIELDS)
        .eq('bu_id', currentBu.id)
        .gte('planned_date', startDate)
        .lt('planned_date', endDate)
        .order('planned_date', { ascending: true });

      if (filters.teamId) {
        query = query.eq('team_id', filters.teamId);
      }
      if (filters.wizardType) {
        query = query.eq('wizard_type', filters.wizardType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapOccurrence);
    },
    enabled: !!currentBu?.id,
  });
}

/**
 * Reschedule an occurrence
 */
export function useRescheduleOccurrence() {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ occurrenceId, newDate }: { occurrenceId: string; newDate: string }) => {
      // Get current occurrence
      const { data: occ, error: fetchErr } = await buSupabase
        .from('ritual_occurrences')
        .select('planned_date, rescheduled_from, wizard_type, bu_id')
        .eq('id', occurrenceId)
        .single();

      if (fetchErr || !occ) throw fetchErr || new Error('Occurrence not found');

      const { error } = await buSupabase
        .from('ritual_occurrences')
        .update({
          status: 'rescheduled',
          rescheduled_from: occ.rescheduled_from || occ.planned_date,
          rescheduled_to: newDate,
          planned_date: newDate,
        })
        .eq('id', occurrenceId);

      if (error) throw error;

      await syncMbrWindowOverrideOnReschedule(buSupabase, {
        buId: (occ as any).bu_id ?? currentBu?.id ?? '',
        wizardType: (occ as any).wizard_type,
        oldDate: occ.planned_date as string,
        newDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualOccurrencesPrefix(currentBu?.id ?? null) });
      toast.success('Ocorrência reagendada');
    },
    onError: () => {
      toast.error('Erro ao reagendar');
    },
  });
}

/**
 * Preview de ocorrências elegíveis para reagendamento em massa.
 * Retorna todas as `ritual_occurrences` com mesmo wizard_type + planned_date
 * cujo status seja 'scheduled' ou 'missed' na BU ativa.
 */
export function useBulkRescheduleEligibleOccurrences(params: {
  wizardType: string | null;
  plannedDate: string | null;
  enabled?: boolean;
}) {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();
  const { wizardType, plannedDate, enabled = true } = params;

  return useQuery({
    queryKey: queryKeys.okrs.ritualOccurrencesEligibleForBulk(
      currentBu?.id ?? null,
      wizardType,
      plannedDate,
    ),
    queryFn: async () => {
      if (!currentBu?.id || !wizardType || !plannedDate) return [];

      const { data, error } = await buSupabase
        .from('ritual_occurrences')
        .select(`id, team_id, planned_date, status, rescheduled_from, teams!ritual_occurrences_team_id_fkey ( name )`)
        .eq('bu_id', currentBu.id)
        .eq('wizard_type', wizardType)
        .eq('planned_date', plannedDate)
        .in('status', ['scheduled', 'missed'])
        .order('team_id', { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id as string,
        teamId: row.team_id as string | null,
        teamName: (row.teams?.name ?? null) as string | null,
        plannedDate: row.planned_date as string,
        status: row.status as OccurrenceStatus,
        rescheduledFrom: row.rescheduled_from as string | null,
      }));
    },
    enabled: enabled && !!currentBu?.id && !!wizardType && !!plannedDate,
    staleTime: 30_000,
  });
}

/**
 * Reagenda em massa todas as ocorrências do mesmo rito + mesma data
 * (status 'scheduled' ou 'missed') para uma nova data, em todos os times da BU.
 */
export function useRescheduleOccurrencesBulk() {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      wizardType,
      plannedDate,
      newDate,
    }: {
      wizardType: string;
      plannedDate: string;
      newDate: string;
    }) => {
      if (!currentBu?.id) throw new Error('BU não selecionada');

      const { data: rows, error: fetchErr } = await buSupabase
        .from('ritual_occurrences')
        .select('id, planned_date, rescheduled_from')
        .eq('bu_id', currentBu.id)
        .eq('wizard_type', wizardType)
        .eq('planned_date', plannedDate)
        .in('status', ['scheduled', 'missed']);

      if (fetchErr) throw fetchErr;
      const list = rows ?? [];
      if (list.length === 0) return { count: 0 };

      const results = await Promise.all(
        list.map((row: any) =>
          buSupabase
            .from('ritual_occurrences')
            .update({
              status: 'rescheduled',
              rescheduled_from: row.rescheduled_from || row.planned_date,
              rescheduled_to: newDate,
              planned_date: newDate,
            })
            .eq('id', row.id),
        ),
      );

      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;

      await syncMbrWindowOverrideOnReschedule(buSupabase, {
        buId: currentBu.id,
        wizardType,
        oldDate: plannedDate,
        newDate,
      });

      return { count: list.length };
    },
    onSuccess: ({ count }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.okrs.ritualOccurrencesPrefix(currentBu?.id ?? null),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.okrs.ritualAdherencePrefix(currentBu?.id ?? null),
      });
      toast.success(`${count} ocorrência(s) reagendada(s)`);
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Erro ao reagendar em massa');
    },
  });
}

/**
 * Get occurrence linked to a session (for history enrichment)
 */
export function useOccurrenceBySession(sessionId: string | null) {
  const buSupabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.okrs.ritualOccurrenceBySession(sessionId),
    queryFn: async () => {
      if (!sessionId) return null;

      const { data, error } = await buSupabase
        .from('ritual_occurrences')
        .select('id, planned_date, actual_date, status, rescheduled_from')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}
