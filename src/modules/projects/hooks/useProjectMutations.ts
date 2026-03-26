import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { toast } from 'sonner';
import type { CreateProjectInput, UpdateProjectInput } from '../types';

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      if (!supabase) throw new Error('Client not ready');

      const { team_ids, kr_links, ...projectData } = input;

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name: projectData.name,
          description: projectData.description ?? null,
          owner_id: projectData.owner_id,
          status: projectData.status ?? 'planned',
          start_date: projectData.start_date ?? null,
          due_date: projectData.due_date ?? null,
          external_url: projectData.external_url ?? null,
          bu_id: projectData.bu_id,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Insert team links
      if (team_ids && team_ids.length > 0) {
        const { error: teamsError } = await supabase
          .from('project_teams')
          .insert(team_ids.map(team_id => ({
            project_id: project.id,
            team_id,
          })));
        if (teamsError) throw teamsError;
      }

      // Insert KR links
      if (kr_links && kr_links.length > 0) {
        const { error: krsError } = await supabase
          .from('project_krs')
          .insert(kr_links.map(link => ({
            project_id: project.id,
            key_result_id: link.key_result_id,
            impact: link.impact,
          })));
        if (krsError) throw krsError;
      }

      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      toast.success('Projeto criado com sucesso');
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast.error('Erro ao criar projeto');
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      if (!supabase) throw new Error('Client not ready');

      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(data.id) });
      toast.success('Projeto atualizado');
    },
    onError: (error) => {
      console.error('Error updating project:', error);
      toast.error('Erro ao atualizar projeto');
    },
  });
}

export function useSoftDeleteProject() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!supabase) throw new Error('Client not ready');

      const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      toast.success('Projeto arquivado');
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
      toast.error('Erro ao arquivar projeto');
    },
  });
}
