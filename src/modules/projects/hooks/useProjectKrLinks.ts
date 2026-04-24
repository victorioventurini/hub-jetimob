import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { toast } from 'sonner';
import type { ProjectImpact, KrLinkKind } from '../types';

interface AddInput {
  project_id: string;
  kr_id: string;
  kind: KrLinkKind;
  impact: ProjectImpact;
}

export function useAddProjectKrLink() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (input: AddInput) => {
      if (!supabase) throw new Error('Client not ready');

      const payload =
        input.kind === 'org'
          ? { project_id: input.project_id, org_key_result_id: input.kr_id, impact: input.impact }
          : { project_id: input.project_id, key_result_id: input.kr_id, impact: input.impact };

      const { error } = await supabase.from('project_krs').insert(payload);
      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.detailFor(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.byKr(data.kr_id) });
      toast.success('KR vinculado ao projeto');
    },
    onError: (error) => {
      console.error('Error linking KR:', error);
      toast.error('Erro ao vincular KR');
    },
  });
}

interface RemoveInput {
  project_id: string;
  kr_id: string;
  kind: KrLinkKind;
}

export function useRemoveProjectKrLink() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (input: RemoveInput) => {
      if (!supabase) throw new Error('Client not ready');

      const column = input.kind === 'org' ? 'org_key_result_id' : 'key_result_id';

      const { error } = await supabase
        .from('project_krs')
        .delete()
        .eq('project_id', input.project_id)
        .eq(column, input.kr_id);

      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.detailFor(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.byKr(data.kr_id) });
    },
    onError: (error) => {
      console.error('Error unlinking KR:', error);
      toast.error('Erro ao desvincular KR');
    },
  });
}
