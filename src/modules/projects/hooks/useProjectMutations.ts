import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { toast } from 'sonner';
import type { CreateProjectInput, SoftDeleteProjectInput, UpdateProjectInput } from '../types';

/**
 * Resultado canônico das RPCs de projeto (archive_project_v2 / update_project_v2).
 * Códigos: ARCHIVED, ALREADY_ARCHIVED, UPDATED, NOT_FOUND, FORBIDDEN,
 * UNAUTHENTICATED, INVALID_PAYLOAD.
 */
type ProjectRpcResult = {
  ok: boolean;
  code:
    | 'ARCHIVED'
    | 'ALREADY_ARCHIVED'
    | 'UPDATED'
    | 'NOT_FOUND'
    | 'FORBIDDEN'
    | 'UNAUTHENTICATED'
    | 'INVALID_PAYLOAD';
  project_id?: string;
  bu_id?: string;
};

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

      const { id, bu_id: _buIdLegacy, team_ids, ...updates } = input;

      // Whitelist do payload (a RPC valida e aplica COALESCE no banco).
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.owner_id !== undefined) payload.owner_id = updates.owner_id;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.start_date !== undefined) payload.start_date = updates.start_date;
      if (updates.due_date !== undefined) payload.due_date = updates.due_date;
      if (updates.external_url !== undefined) payload.external_url = updates.external_url;

      const { data, error } = await supabase.rpc('update_project_v2', {
        p_project_id: id,
        p_payload: payload,
      });

      console.info('[useUpdateProject] rpc result', {
        projectId: id,
        result: data,
        errorCode: error?.code ?? null,
        errorMessage: error?.message ?? null,
      });

      if (error) throw error;

      const result = data as unknown as ProjectRpcResult | null;
      if (!result || !result.ok) {
        const code = result?.code ?? 'UNKNOWN';
        const err = new Error(code === 'FORBIDDEN'
          ? 'Você não tem permissão para atualizar este projeto.'
          : code === 'NOT_FOUND'
            ? 'Projeto não encontrado.'
            : code === 'ALREADY_ARCHIVED'
              ? 'Projeto está arquivado.'
              : code === 'UNAUTHENTICATED'
                ? 'Sessão expirada. Faça login novamente.'
                : `Erro ao atualizar projeto (${code}).`);
        (err as { code?: string }).code = code;
        throw err;
      }

      // Sync team links (delete + re-insert) — herda permissão via JOIN com projects.
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

      return { id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.detailFor(data.id) });
      toast.success('Projeto atualizado');
    },
    onError: (error: Error & { code?: string }) => {
      const rawMsg = error?.message || 'Erro desconhecido';
      console.error('[useUpdateProject] error', { code: error?.code, rawMsg });
      toast.error(rawMsg);
    },
  });
}

export function useSoftDeleteProject() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (input: SoftDeleteProjectInput) => {
      if (!supabase) throw new Error('Client not ready');

      const { id } = input;

      // RPC SECURITY DEFINER: valida permissão server-side seguindo a regra
      // canônica v1.6 (super_admin, bu_admin, owner, leader_of_owner,
      // permission key). Não depende mais de probe SELECT (que falhava em
      // drift de BU contextual / impersonação).
      const { data, error } = await supabase.rpc('archive_project_v2', {
        p_project_id: id,
      });

      console.info('[useSoftDeleteProject] rpc result', {
        projectId: id,
        result: data,
        errorCode: error?.code ?? null,
        errorMessage: error?.message ?? null,
      });

      if (error) throw error;

      const result = data as unknown as ProjectRpcResult | null;
      if (!result) {
        throw new Error('Resposta inválida do servidor.');
      }

      if (result.ok) {
        return result;
      }

      const friendly =
        result.code === 'FORBIDDEN'
          ? 'Você não tem permissão para arquivar este projeto.'
          : result.code === 'NOT_FOUND'
            ? 'Projeto não encontrado.'
            : result.code === 'UNAUTHENTICATED'
              ? 'Sessão expirada. Faça login novamente.'
              : `Erro ao arquivar projeto (${result.code}).`;
      const err = new Error(friendly);
      (err as { code?: string }).code = result.code;
      throw err;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      toast.success('Projeto arquivado');
    },
    onError: (error: Error & { code?: string }) => {
      const rawMsg = error?.message || 'Erro desconhecido';
      console.error('[useSoftDeleteProject] error', { code: error?.code, rawMsg });
      toast.error(rawMsg);
    },
  });
}
