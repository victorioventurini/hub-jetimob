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
      if (!input.owner_id) {
        // Defesa em profundidade: UI já bloqueia, mas garantimos no hook.
        throw new Error('Responsável é obrigatório');
      }

      const { data, error } = await supabase
        .from('project_milestones')
        .insert({
          project_id: input.project_id,
          name: input.name,
          owner_id: input.owner_id,
          status: input.status ?? 'todo',
          start_date: input.start_date,
          due_date: input.due_date ?? null,
          notes: input.notes ?? null,
          sort_order: input.sort_order ?? 0,
          bu_id: input.bu_id,
        })
        .select('id, project_id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestonesFor(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detailFor(data.project_id) });
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

      // Defesa: owner_id é NOT NULL no DB; bloquear tentativas de limpá-lo.
      if ('owner_id' in updates && !updates.owner_id) {
        throw new Error('Responsável é obrigatório');
      }

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
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestonesFor(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detailFor(data.project_id) });
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
      queryClient.invalidateQueries({ queryKey: projectsKeys.milestonesFor(data.project_id) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detailFor(data.project_id) });
    },
    onError: (error) => {
      console.error('Error deleting milestone:', error);
      toast.error('Erro ao remover milestone');
    },
  });
}
