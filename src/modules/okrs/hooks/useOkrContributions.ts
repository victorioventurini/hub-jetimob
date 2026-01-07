import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { toast } from 'sonner';
import type { OkrContribution, OkrContributionEntityType } from '../types';

export function useOkrContributions(entityType: OkrContributionEntityType, entityId: string) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: ['okr-contributions', entityType, entityId],
    queryFn: async () => {
      if (!supabase) return { contributesTo: [], contributedBy: [] };
      
      // Get contributions FROM this entity
      const { data: fromContributions, error: fromError } = await supabase
        .from('okr_contributions')
        .select('*')
        .eq('from_type', entityType)
        .eq('from_id', entityId)
        .is('deleted_at', null);

      if (fromError) throw fromError;

      // Get contributions TO this entity
      const { data: toContributions, error: toError } = await supabase
        .from('okr_contributions')
        .select('*')
        .eq('to_type', entityType)
        .eq('to_id', entityId)
        .is('deleted_at', null);

      if (toError) throw toError;

      return {
        contributesTo: fromContributions as OkrContribution[],
        contributedBy: toContributions as OkrContribution[],
      };
    },
    enabled: !!entityId && isReady && !!supabase,
  });
}

export function useCreateOkrContribution() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (contribution: {
      from_type: OkrContributionEntityType;
      from_id: string;
      to_type: OkrContributionEntityType;
      to_id: string;
      bu_id?: string;
      description?: string;
    }) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
      // bu_id is auto-filled by trigger, use type assertion
      const { data, error } = await supabase
        .from('okr_contributions')
        .insert(contribution as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['okr-contributions', variables.from_type, variables.from_id] });
      queryClient.invalidateQueries({ queryKey: ['okr-contributions', variables.to_type, variables.to_id] });
      toast.success('Contribuição criada com sucesso');
    },
    onError: (error: Error) => {
      console.error('Error creating contribution:', error);
      if (error.message.includes('self-referencing')) {
        toast.error('Não é possível criar uma contribuição auto-referenciada');
      } else if (error.message.includes('Foundational')) {
        toast.error('KRs fundacionais não podem contribuir para KRs organizacionais');
      } else if (error.message.includes('Enabler')) {
        toast.error('KRs habilitadores não podem contribuir para KRs organizacionais');
      } else {
        toast.error('Erro ao criar contribuição');
      }
    },
  });
}

export function useDeleteOkrContribution() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Cliente não disponível');
      
      const { error } = await supabase
        .from('okr_contributions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-contributions'] });
      toast.success('Contribuição removida');
    },
    onError: () => {
      toast.error('Erro ao remover contribuição');
    },
  });
}
