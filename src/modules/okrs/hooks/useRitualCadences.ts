/**
 * useRitualCadences - CRUD hook for ritual cadence configuration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { useSyncRitualCalendar } from './useSyncRitualCalendar';
import { ALL_RITUAL_WIZARD_TYPES } from '../constants/ritualWizardTypes';

// ============================================================
// TYPES
// ============================================================

export interface RitualCadence {
  id: string;
  buId: string;
  wizardType: string;
  teamId: string | null;
  teamName: string | null;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  monthWeekOrdinal: number | null;
  startDate: string;
  endDate: string | null;
  responsibleProfileId: string | null;
  responsibleName: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCadenceParams {
  wizardType: string;
  teamId?: string | null;
  frequency: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  monthWeekOrdinal?: number | null;
  startDate: string;
  endDate?: string | null;
  responsibleProfileId?: string | null;
}

export interface UpdateCadenceParams {
  id: string;
  frequency?: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  monthWeekOrdinal?: number | null;
  startDate?: string;
  endDate?: string | null;
  responsibleProfileId?: string | null;
  isActive?: boolean;
}

const CADENCE_FIELDS = `
  id, bu_id, wizard_type, team_id, frequency,
  day_of_week, day_of_month, month_week_ordinal,
  start_date, end_date, responsible_profile_id, is_active, created_at,
  teams!ritual_cadences_team_id_fkey ( name ),
  profiles!ritual_cadences_responsible_profile_id_fkey ( display_name, first_name, last_name )
`;

function mapCadence(row: any): RitualCadence {
  return {
    id: row.id,
    buId: row.bu_id,
    wizardType: row.wizard_type,
    teamId: row.team_id,
    teamName: row.teams?.name ?? null,
    frequency: row.frequency,
    dayOfWeek: row.day_of_week,
    dayOfMonth: row.day_of_month,
    monthWeekOrdinal: row.month_week_ordinal,
    startDate: row.start_date,
    endDate: row.end_date,
    responsibleProfileId: row.responsible_profile_id,
    responsibleName: row.profiles?.display_name
      || [row.profiles?.first_name, row.profiles?.last_name].filter(Boolean).join(' ')
      || null,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

// ============================================================
// HOOKS
// ============================================================

export function useRitualCadences() {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();
  const { syncRitualCalendar } = useSyncRitualCalendar();
  const autoHealTriggeredByBu = useRef<Record<string, boolean>>({});

  const { data: hasQuarterCycle } = useQuery({
    queryKey: [...queryKeys.okrs.settingsCycles(currentBu?.id ?? null), 'has-quarter-cycle'],
    queryFn: async () => {
      if (!currentBu?.id) return false;

      const { data, error } = await buSupabase
        .from('cycles')
        .select('id')
        .eq('bu_id', currentBu.id)
        .eq('type', 'quarter')
        .limit(1);

      if (error) throw error;
      return (data ?? []).length > 0;
    },
    enabled: !!currentBu?.id,
    staleTime: 5 * 60 * 1000,
  });

  const cadencesQuery = useQuery({
    queryKey: queryKeys.okrs.ritualCadences(currentBu?.id ?? null),
    queryFn: async () => {
      if (!currentBu?.id) return [];

      const { data, error } = await buSupabase
        .from('ritual_cadences')
        .select(CADENCE_FIELDS)
        .eq('bu_id', currentBu.id)
        .order('wizard_type', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []).map(mapCadence);
    },
    enabled: !!currentBu?.id,
  });

  useEffect(() => {
    const buId = currentBu?.id;
    if (!buId || !hasQuarterCycle || !cadencesQuery.data) return;
    if (autoHealTriggeredByBu.current[buId]) return;

    const availableTypes = new Set(cadencesQuery.data.map((cadence) => cadence.wizardType));
    const missingTypes = ALL_RITUAL_WIZARD_TYPES.filter((wizardType) => !availableTypes.has(wizardType));

    if (missingTypes.length === 0) return;

    autoHealTriggeredByBu.current[buId] = true;
    void syncRitualCalendar({ silent: true }).catch(() => {
      autoHealTriggeredByBu.current[buId] = false;
    });
  }, [currentBu?.id, hasQuarterCycle, cadencesQuery.data, syncRitualCalendar]);

  return cadencesQuery;
}

export function useCreateCadence() {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateCadenceParams) => {
      if (!currentBu?.id) throw new Error('No BU selected');

      const { data, error } = await buSupabase
        .from('ritual_cadences')
        .insert({
          bu_id: currentBu.id,
          wizard_type: params.wizardType,
          team_id: params.teamId || null,
          frequency: params.frequency,
          day_of_week: params.dayOfWeek ?? null,
          day_of_month: params.dayOfMonth ?? null,
          month_week_ordinal: params.monthWeekOrdinal ?? null,
          start_date: params.startDate,
          end_date: params.endDate || null,
          responsible_profile_id: params.responsibleProfileId || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Generate occurrences
      await buSupabase.functions.invoke('generate-ritual-occurrences', {
        body: { cadence_id: data.id, bu_id: currentBu.id, rebuild_mode: 'incremental' },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualCadences(currentBu?.id ?? null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualOccurrencesPrefix(currentBu?.id ?? null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualAdherencePrefix(currentBu?.id ?? null) });
      toast.success('Cadência criada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar cadência');
    },
  });
}

export function useUpdateCadence() {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateCadenceParams) => {
      if (!currentBu?.id) throw new Error('No BU selected');

      const updateData: Record<string, unknown> = {};
      if (params.frequency !== undefined) updateData.frequency = params.frequency;
      if (params.dayOfWeek !== undefined) updateData.day_of_week = params.dayOfWeek;
      if (params.dayOfMonth !== undefined) updateData.day_of_month = params.dayOfMonth;
      if (params.monthWeekOrdinal !== undefined) updateData.month_week_ordinal = params.monthWeekOrdinal;
      if (params.startDate !== undefined) updateData.start_date = params.startDate;
      if (params.endDate !== undefined) updateData.end_date = params.endDate;
      if (params.responsibleProfileId !== undefined) updateData.responsible_profile_id = params.responsibleProfileId;
      if (params.isActive !== undefined) updateData.is_active = params.isActive;

      const { error } = await buSupabase
        .from('ritual_cadences')
        .update(updateData)
        .eq('id', params.id);

      if (error) throw error;

      // Regenerate occurrences
      await buSupabase.functions.invoke('generate-ritual-occurrences', {
        body: { cadence_id: params.id, bu_id: currentBu.id, rebuild_mode: 'incremental' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualCadences(currentBu?.id ?? null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualOccurrencesPrefix(currentBu?.id ?? null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualAdherencePrefix(currentBu?.id ?? null) });
      toast.success('Cadência atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar cadência');
    },
  });
}

export function useDeleteCadence() {
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cadenceId: string) => {
      const { error } = await buSupabase
        .from('ritual_cadences')
        .delete()
        .eq('id', cadenceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualCadences(currentBu?.id ?? null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualOccurrencesPrefix(currentBu?.id ?? null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualAdherencePrefix(currentBu?.id ?? null) });
      toast.success('Cadência removida');
    },
    onError: () => {
      toast.error('Erro ao remover cadência');
    },
  });
}
