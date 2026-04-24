import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { toast } from 'sonner';
import type { ProjectImpact, KrLinkKind } from '../types';

export function useAddMilestoneKrLink() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (input: {
      milestone_id: string;
      kr_id: string;
      kind: KrLinkKind;
      impact: ProjectImpact;
      project_id: string;
    }) => {
      if (!supabase) throw new Error('Client not ready');

      const payload =
        input.kind === 'org'
          ? { milestone_id: input.milestone_id, org_key_result_id: input.kr_id, impact: input.impact }
          : { milestone_id: input.milestone_id, key_result_id: input.kr_id, impact: input.impact };

      const { error } = await supabase.from('milestone_krs').insert(payload);
      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestoneKrs(data.milestone_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestonesFor(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detailFor(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.byKr(data.kr_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestoneKrsByKr(data.kr_id) });
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
      kr_id: string;
      kind: KrLinkKind;
      project_id: string;
    }) => {
      if (!supabase) throw new Error('Client not ready');

      const column = input.kind === 'org' ? 'org_key_result_id' : 'key_result_id';

      const { error } = await supabase
        .from('milestone_krs')
        .delete()
        .eq('milestone_id', input.milestone_id)
        .eq(column, input.kr_id);

      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestoneKrs(data.milestone_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestonesFor(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detailFor(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.byKr(data.kr_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestoneKrsByKr(data.kr_id) });
    },
    onError: (error) => {
      console.error('Error unlinking KR from milestone:', error);
      toast.error('Erro ao desvincular KR do milestone');
    },
  });
}
