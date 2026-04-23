import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { toast } from 'sonner';
import type { CreateProjectInput, UpdateProjectInput } from '../types';

export function useCreateProject() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

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
          start_date: projectData.start_date,
          due_date: projectData.due_date,
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
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      if (!supabase) throw new Error('Client not ready');

      const { id, team_ids, ...updates } = input;

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select('id')
        .single();

      if (error) throw error;

      // Sync team links (delete + re-insert)
      if (team_ids !== undefined) {
        const { error: delError } = await supabase
          .from('project_teams')
          .delete()
          .eq('project_id', id);
        if (delError) throw delError;

        if (team_ids.length > 0) {
          const { error: insError } = await supabase
            .from('project_teams')
            .insert(team_ids.map(team_id => ({ project_id: id, team_id })));
          if (insError) throw insError;
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detailFor(data.id) });
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
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!supabase) throw new Error('Client not ready');
      if (!currentBuId) throw new Error('Nenhuma BU selecionada');

      // Defense in depth: filtra explicitamente por bu_id corrente.
      // Evita erro RLS obscuro quando header BU está stale + garante isolamento.
      const { error, count } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() }, { count: 'exact' })
        .eq('id', projectId)
        .eq('bu_id', currentBuId)
        .is('deleted_at', null);

      if (error) throw error;
      if (count === 0) {
        throw new Error('Projeto não pôde ser arquivado (sem permissão ou BU incorreta).');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      toast.success('Projeto arquivado');
    },
    onError: (error: any) => {
      console.error('[useSoftDeleteProject]', error);
      const code = error?.code ?? '';
      const rawMsg: string = error?.message || error?.details || error?.hint || 'Erro desconhecido';
      const isPermissionError =
        code === '42501' ||
        /row-level security|permission denied|sem permiss/i.test(rawMsg);
      const friendly = isPermissionError
        ? 'Você não tem permissão para arquivar este projeto.'
        : `Erro ao arquivar projeto: ${rawMsg}`;
      toast.error(friendly);
    },
  });
}
