import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { toast } from 'sonner';
import type { CreateProjectInput, SoftDeleteProjectInput, UpdateProjectInput } from '../types';

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

      const { id, bu_id, team_ids, ...updates } = input;

      // Filtra por bu_id do REGISTRO (não do contexto). RLS já garante isolamento.
      // Manter o filtro aqui é defesa em profundidade contra mismatch de target,
      // não substituto da RLS.
      const { data, error, count } = await supabase
        .from('projects')
        .update(updates, { count: 'exact' })
        .eq('id', id)
        .eq('bu_id', bu_id)
        .select('id')
        .maybeSingle();

      console.info('[useUpdateProject] result', {
        projectId: id,
        recordBuId: bu_id,
        affectedCount: count,
        errorCode: error?.code ?? null,
        errorMessage: error?.message ?? null,
      });

      if (error) throw error;

      if (!data || count === 0) {
        // count=0 sem error → ambíguo. Diagnosticar com SELECT.
        const { data: probe, error: probeErr } = await supabase
          .from('projects')
          .select('id, deleted_at')
          .eq('id', id)
          .maybeSingle();

        if (probeErr) throw probeErr;
        if (!probe) throw new Error('Projeto não encontrado.');
        if (probe.deleted_at) throw new Error('Projeto já está arquivado.');

        const rlsErr = new Error('Sem permissão para atualizar este projeto.');
        (rlsErr as any).code = '42501';
        throw rlsErr;
      }

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
    onError: (error: any) => {
      const code = error?.code ?? '';
      const rawMsg: string = error?.message || error?.details || error?.hint || 'Erro desconhecido';
      console.error('[useUpdateProject] error', { code, rawMsg });
      const isPermissionError =
        code === '42501' ||
        /row-level security|permission denied|sem permiss/i.test(rawMsg);
      const friendly = isPermissionError
        ? 'Você não tem permissão para atualizar este projeto.'
        : `Erro ao atualizar projeto: ${rawMsg}`;
      toast.error(friendly);
    },
  });
}

export function useSoftDeleteProject() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (input: SoftDeleteProjectInput) => {
      if (!supabase) throw new Error('Client not ready');

      const { id, bu_id } = input;

      // Filtra por bu_id do REGISTRO (não do contexto). Isolamento real é da RLS.
      const { error, count } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() }, { count: 'exact' })
        .eq('id', id)
        .eq('bu_id', bu_id)
        .is('deleted_at', null);

      console.info('[useSoftDeleteProject] result', {
        projectId: id,
        recordBuId: bu_id,
        affectedCount: count,
        errorCode: error?.code ?? null,
        errorMessage: error?.message ?? null,
      });

      if (error) throw error;

      if (count === 0) {
        // count=0 sem error é AMBÍGUO. Diagnosticar com SELECT antes de
        // assumir que foi RLS — pode ter sido idempotência ou registro inexistente.
        const { data: probe, error: probeErr } = await supabase
          .from('projects')
          .select('id, deleted_at, bu_id')
          .eq('id', id)
          .maybeSingle();

        if (probeErr) throw probeErr;

        if (!probe) {
          throw new Error('Projeto não encontrado.');
        }

        if (probe.deleted_at) {
          // Já estava arquivado: tratar como sucesso (idempotência).
          console.info('[useSoftDeleteProject] already archived (idempotent)', { id });
          return;
        }

        if (probe.bu_id !== bu_id) {
          // Caller passou bu_id errado. Bug do caller, não da permissão.
          throw new Error(`BU do projeto (${probe.bu_id}) difere do bu_id informado (${bu_id}).`);
        }

        // Existe, não está arquivado, bu_id confere → RLS negou de verdade.
        const rlsErr = new Error('Sem permissão para arquivar este projeto.');
        (rlsErr as any).code = '42501';
        throw rlsErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      toast.success('Projeto arquivado');
    },
    onError: (error: any) => {
      const code = error?.code ?? '';
      const rawMsg: string = error?.message || error?.details || error?.hint || 'Erro desconhecido';
      console.error('[useSoftDeleteProject] error', {
        code,
        rawMsg,
        details: error?.details ?? null,
        hint: error?.hint ?? null,
      });
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
