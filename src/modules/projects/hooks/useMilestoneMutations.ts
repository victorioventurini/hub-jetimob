import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { toast } from 'sonner';
import type { CreateMilestoneInput, UpdateMilestoneInput } from '../types';

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (input: CreateMilestoneInput) => {
      if (!supabase) throw new Error('Client not ready');

      const { data, error } = await supabase
        .from('project_milestones')
        .insert({
          project_id: input.project_id,
          name: input.name,
          owner_id: input.owner_id ?? null,
          status: input.status ?? 'todo',
          due_date: input.due_date ?? null,
          sort_order: input.sort_order ?? 0,
          bu_id: input.bu_id,
        })
        .select('id, project_id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestones(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(data.project_id) });
      toast.success('Milestone criado');
    },
    onError: (error) => {
      console.error('Error creating milestone:', error);
      toast.error('Erro ao criar milestone');
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (input: UpdateMilestoneInput & { project_id: string }) => {
      if (!supabase) throw new Error('Client not ready');

      const { id, project_id, ...updates } = input;

      const { data, error } = await supabase
        .from('project_milestones')
        .update(updates)
        .eq('id', id)
        .select('id, project_id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestones(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(data.project_id) });
    },
    onError: (error) => {
      console.error('Error updating milestone:', error);
      toast.error('Erro ao atualizar milestone');
    },
  });
}

export function useSoftDeleteMilestone() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      if (!supabase) throw new Error('Client not ready');

      const { error } = await supabase
        .from('project_milestones')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestones(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(data.project_id) });
      toast.success('Milestone removido');
    },
    onError: (error) => {
      console.error('Error deleting milestone:', error);
      toast.error('Erro ao remover milestone');
    },
  });
}
