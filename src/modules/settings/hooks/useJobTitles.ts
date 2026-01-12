import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBu } from "@/contexts/BuContext";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import type { JobTitle, JobTitleFormData, JobTitleWithUsageCount } from "../types";

/**
 * Hook para gerenciar cargos (global, filtrado por acesso do usuário)
 * @updated Wave 2.6 - Convertido para bu_ids[] (multi-BU)
 */
export function useJobTitles() {
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: queryKeys.settings.jobTitles(buId ?? null),
    staleTime: 5 * 60 * 1000, // 5 minutes - job titles change rarely
    queryFn: async (): Promise<JobTitleWithUsageCount[]> => {
      // Buscar todos os cargos que o usuário tem acesso (RLS filtra automaticamente)
      const { data: jobTitles, error } = await supabase
        .from("job_titles")
        .select("id, bu_ids, name, description, is_active, created_at, updated_at, deleted_at")
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;

      // Buscar contagem de profiles por cargo (global)
      const { data: usageCounts, error: countError } = await supabase
        .from("profiles")
        .select("job_title_id")
        .is("deleted_at", null)
        .not("job_title_id", "is", null);

      if (countError) throw countError;

      // Criar mapa de contagem
      const countMap = (usageCounts || []).reduce((acc, p) => {
        if (p.job_title_id) {
          acc[p.job_title_id] = (acc[p.job_title_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return (jobTitles || []).map((jt) => ({
        id: jt.id,
        bu_ids: jt.bu_ids || [],
        name: jt.name,
        description: jt.description,
        is_active: jt.is_active,
        created_at: jt.created_at,
        updated_at: jt.updated_at,
        deleted_at: jt.deleted_at,
        usage_count: countMap[jt.id] || 0,
      }));
    },
    enabled: !!buId,
  });
}

/**
 * Hook para listar cargos ativos da BU atual (para select em formulários)
 * Filtra apenas cargos que incluem a BU atual no bu_ids[]
 */
export function useActiveJobTitles() {
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: queryKeys.settings.jobTitlesActive(buId ?? null),
    staleTime: 5 * 60 * 1000, // 5 minutes - job titles change rarely
    queryFn: async (): Promise<JobTitle[]> => {
      if (!buId) return [];

      const { data, error } = await supabase
        .from("job_titles")
        .select("id, bu_ids, name, description, is_active, created_at, updated_at, deleted_at")
        .eq("is_active", true)
        .is("deleted_at", null)
        .contains("bu_ids", [buId])
        .order("name");

      if (error) throw error;
      
      return (data || []).map((jt) => ({
        id: jt.id,
        bu_ids: jt.bu_ids || [],
        name: jt.name,
        description: jt.description,
        is_active: jt.is_active,
        created_at: jt.created_at,
        updated_at: jt.updated_at,
        deleted_at: jt.deleted_at,
      }));
    },
    enabled: !!buId,
  });
}

/**
 * Hook para criar cargo
 */
export function useCreateJobTitle() {
  const { currentBu } = useBu();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: JobTitleFormData) => {
      if (!currentBu?.id) throw new Error("BU não selecionada");

      // Garantir que a BU atual está no array
      const buIds = data.bu_ids.includes(currentBu.id) 
        ? data.bu_ids 
        : [...data.bu_ids, currentBu.id];

      const { data: result, error } = await supabase
        .from("job_titles")
        .insert({
          bu_ids: buIds,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          is_active: data.is_active,
        })
        .select("id, bu_ids, name, description, is_active, created_at, updated_at, deleted_at")
        .single();

      if (error) {
        if (error.message?.includes("job_titles_name_unique")) {
          throw new Error("Já existe um cargo com este nome no sistema");
        }
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.jobTitlesPrefix() });
      toast.success("Cargo criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar cargo");
    },
  });
}

/**
 * Hook para atualizar cargo
 */
export function useUpdateJobTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      name, 
      description, 
      is_active,
      bu_ids,
    }: { 
      id: string; 
      name?: string; 
      description?: string; 
      is_active?: boolean;
      bu_ids?: string[];
    }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (bu_ids !== undefined) updateData.bu_ids = bu_ids;

      const { error } = await supabase
        .from("job_titles")
        .update(updateData)
        .eq("id", id);

      if (error) {
        if (error.message?.includes("job_titles_name_unique")) {
          throw new Error("Já existe um cargo com este nome no sistema");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.jobTitlesPrefix() });
      toast.success("Cargo atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar cargo");
    },
  });
}

/**
 * Hook para soft delete de cargo com optimistic update
 */
export function useDeleteJobTitle() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useMutation({
    mutationFn: async (id: string) => {
      // Verificar se há usuários vinculados
      const { data: profiles, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("job_title_id", id)
        .is("deleted_at", null)
        .limit(1);

      if (checkError) throw checkError;

      if (profiles && profiles.length > 0) {
        throw new Error("Não é possível excluir um cargo com usuários vinculados. Desative-o primeiro.");
      }

      const { error } = await supabase
        .from("job_titles")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    // Optimistic update: remove from list immediately
    onMutate: async (id) => {
      const qk = queryKeys.settings.jobTitles(buId ?? null);
      await queryClient.cancelQueries({ queryKey: qk });
      
      const previousData = queryClient.getQueryData<JobTitleWithUsageCount[]>(qk);
      
      if (previousData) {
        queryClient.setQueryData(qk, previousData.filter((jt) => jt.id !== id));
      }
      
      return { previousData, qk };
    },
    onError: (error: Error, _id, context) => {
      if (context?.previousData && context?.qk) {
        queryClient.setQueryData(context.qk, context.previousData);
      }
      toast.error(error.message || "Erro ao remover cargo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.jobTitlesPrefix() });
      toast.success("Cargo removido com sucesso");
    },
  });
}
