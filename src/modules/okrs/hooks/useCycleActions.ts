/**
 * useCycleActions — Mutations para transições de status de ciclo
 * 
 * @see Fase 6 — Plano de vínculo ciclos ↔ rituais
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { useSyncRitualCalendar } from '@/modules/okrs/hooks/useSyncRitualCalendar';
import { toast } from 'sonner';

export function useCycleActions() {
  const supabase = useBuScopedSupabase();
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const { syncRitualCalendar } = useSyncRitualCalendar();
  const buId = currentBu?.id ?? null;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.okrs.settingsCycles(buId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.okrs.cyclesList(buId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.okrs.activeCycle(buId) });
  };

  const activateCycle = useMutation({
    mutationFn: async (cycleId: string) => {
      const { error } = await supabase
        .from('cycles')
        .update({ status: 'active' } as any)
        .eq('id', cycleId);

      if (error) {
        if (error.message?.includes('Já existe um ciclo')) {
          throw new Error('Já existe um ciclo ativo deste tipo. Encerre-o antes de ativar outro.');
        }
        throw error;
      }

      await syncRitualCalendar({ silent: true });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Ciclo ativado com sucesso');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao ativar ciclo');
    },
  });

  const closeCycle = useMutation({
    mutationFn: async (cycleId: string) => {
      const { error } = await supabase
        .from('cycles')
        .update({ status: 'closed' } as any)
        .eq('id', cycleId);

      if (error) throw error;

      await syncRitualCalendar({ silent: true });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Ciclo encerrado com sucesso');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao encerrar ciclo');
    },
  });

  return { activateCycle, closeCycle };
}
