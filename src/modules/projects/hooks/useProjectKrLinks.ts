import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { toast } from 'sonner';
import type { ProjectImpact } from '../types';

export function useAddProjectKrLink() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (input: { project_id: string; key_result_id: string; impact: ProjectImpact }) => {
      if (!supabase) throw new Error('Client not ready');

      const { error } = await supabase
        .from('project_krs')
        .insert({
          project_id: input.project_id,
          key_result_id: input.key_result_id,
          impact: input.impact,
        });

      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.byKr(data.key_result_id) });
      toast.success('KR vinculado ao projeto');
    },
    onError: (error) => {
      console.error('Error linking KR:', error);
      toast.error('Erro ao vincular KR');
    },
  });
}

export function useRemoveProjectKrLink() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (input: { project_id: string; key_result_id: string }) => {
      if (!supabase) throw new Error('Client not ready');

      const { error } = await supabase
        .from('project_krs')
        .delete()
        .eq('project_id', input.project_id)
        .eq('key_result_id', input.key_result_id);

      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.byKr(data.key_result_id) });
    },
    onError: (error) => {
      console.error('Error unlinking KR:', error);
      toast.error('Erro ao desvincular KR');
    },
  });
}
