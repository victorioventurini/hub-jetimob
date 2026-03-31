import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';

interface SyncOptions {
  silent?: boolean;
}

/**
 * Dispara a sincronização automática do calendário de ritos com base nos ciclos da BU.
 * Fluxo padrão: rebuild total das ocorrências derivadas.
 */
export function useSyncRitualCalendar() {
  const { client: supabase, buId } = useOptionalBuClient();
  const queryClient = useQueryClient();

  const syncRitualCalendar = useCallback(
    async ({ silent = false }: SyncOptions = {}) => {
      if (!supabase || !buId) {
        throw new Error('Nenhuma BU selecionada para sincronização de ritos');
      }

      const { error } = await supabase.functions.invoke('sync-ritual-calendar-from-cycles', {
        body: {
          bu_id: buId,
          rebuild_mode: 'full',
        },
      });

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualCadences(buId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualOccurrencesPrefix(buId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.okrs.ritualAdherencePrefix(buId) }),
      ]);

      if (!silent) {
        toast.success('Ritos sincronizados com os ciclos');
      }
    },
    [supabase, buId, queryClient]
  );

  return { syncRitualCalendar };
}
