import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { toast } from 'sonner';
import type { ProjectImpact } from '../types';

export function useAddMilestoneKrLink() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (input: {
      milestone_id: string;
      key_result_id: string;
      impact: ProjectImpact;
      project_id: string;
    }) => {
      if (!supabase) throw new Error('Client not ready');

      const { error } = await supabase
        .from('milestone_krs')
        .insert({
          milestone_id: input.milestone_id,
          key_result_id: input.key_result_id,
          impact: input.impact,
        });

      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestoneKrs(data.milestone_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestones(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.byKr(data.key_result_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestoneKrsByKr(data.key_result_id) });
      toast.success('KR vinculada ao milestone');
    },
    onError: (error) => {
      console.error('Error linking KR to milestone:', error);
      toast.error('Erro ao vincular KR ao milestone');
    },
  });
}

export function useRemoveMilestoneKrLink() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (input: {
      milestone_id: string;
      key_result_id: string;
      project_id: string;
    }) => {
      if (!supabase) throw new Error('Client not ready');

      const { error } = await supabase
        .from('milestone_krs')
        .delete()
        .eq('milestone_id', input.milestone_id)
        .eq('key_result_id', input.key_result_id);

      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestoneKrs(data.milestone_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestones(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.byKr(data.key_result_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestoneKrsByKr(data.key_result_id) });
    },
    onError: (error) => {
      console.error('Error unlinking KR from milestone:', error);
      toast.error('Erro ao desvincular KR do milestone');
    },
  });
}
