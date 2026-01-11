import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBu } from "@/contexts/BuContext";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import type { JobTitle, JobTitleFormData, JobTitleWithUsageCount } from "../types";

/**
 * Hook para gerenciar cargos da BU atual
 * @updated Wave 2.5 - Normalizado para usar bu_id ao invés de bu_ids[]
 */
export function useJobTitles() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: queryKeys.settings.jobTitles(buId ?? null),
    staleTime: 5 * 60 * 1000, // 5 minutes - job titles change rarely
    queryFn: async (): Promise<JobTitleWithUsageCount[]> => {
      if (!buId) return [];

      // Buscar cargos da BU atual (bu_id singular)
      const { data: jobTitles, error } = await supabase
        .from("job_titles")
        .select("id, bu_id, name, description, is_active, created_at, updated_at, deleted_at")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;

      // Buscar contagem de profiles por cargo
      const { data: usageCounts, error: countError } = await supabase
        .from("profiles")
        .select("job_title_id")
        .eq("bu_id", buId)
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
        ...jt,
        usage_count: countMap[jt.id] || 0,
      }));
    },
    enabled: !!buId,
  });
}

/**
 * Hook para listar cargos ativos (para select em formulários)
 */
export function useActiveJobTitles() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: queryKeys.settings.jobTitlesActive(buId ?? null),
    staleTime: 5 * 60 * 1000, // 5 minutes - job titles change rarely
    queryFn: async (): Promise<JobTitle[]> => {
      if (!buId) return [];

      const { data, error } = await supabase
        .from("job_titles")
        .select("id, bu_id, name, description, is_active, created_at, updated_at, deleted_at")
        .eq("bu_id", buId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!buId,
  });
}

/**
 * Hook para criar cargo
 */
export function useCreateJobTitle() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: JobTitleFormData) => {
      if (!currentBu?.id) throw new Error("BU não selecionada");

      const { data: result, error } = await supabase
        .from("job_titles")
        .insert({
          bu_id: currentBu.id,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          is_active: data.is_active,
        })
        .select("id, bu_id, name, description, is_active, created_at, updated_at, deleted_at")
        .single();

      if (error) {
        if (error.message?.includes("job_titles_bu_id_name_unique")) {
          throw new Error("Já existe um cargo com este nome nesta BU");
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
  const supabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      name, 
      description, 
      is_active,
    }: { 
      id: string; 
      name?: string; 
      description?: string; 
      is_active?: boolean;
    }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { error } = await supabase
        .from("job_titles")
        .update(updateData)
        .eq("id", id);

      if (error) {
        if (error.message?.includes("job_titles_bu_id_name_unique")) {
          throw new Error("Já existe um cargo com este nome nesta BU");
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
  const supabase = useBuScopedSupabase();
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
