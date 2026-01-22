import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';
import type { OkrContribution, OkrContributionEntityType } from '../types';

// Explicit fields for okr_contributions - avoid select('*')
const CONTRIBUTION_FIELDS = `
  id, bu_id, from_type, from_id, to_type, to_id,
  description, created_by, created_at, deleted_at
` as const;

export function useOkrContributions(entityType: OkrContributionEntityType, entityId: string) {
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.contributions(entityType, entityId),
    queryFn: async () => {
      if (!supabase) return { contributesTo: [], contributedBy: [] };
      
      // Get contributions FROM this entity
      const { data: fromContributions, error: fromError } = await supabase
        .from('okr_contributions')
        .select(CONTRIBUTION_FIELDS)
        .eq('from_type', entityType)
        .eq('from_id', entityId)
        .is('deleted_at', null);

      if (fromError) throw fromError;

      // Get contributions TO this entity
      const { data: toContributions, error: toError } = await supabase
        .from('okr_contributions')
        .select(CONTRIBUTION_FIELDS)
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
    staleTime: 2 * 60 * 1000, // 2 minutes
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
        .select(CONTRIBUTION_FIELDS)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.contributions(variables.from_type, variables.from_id), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.contributions(variables.to_type, variables.to_id), refetchType: 'active' });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.contributions(), refetchType: 'active' });
      toast.success('Contribuição removida');
    },
    onError: () => {
      toast.error('Erro ao remover contribuição');
    },
  });
}
