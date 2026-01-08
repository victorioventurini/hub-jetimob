import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBu } from "@/contexts/BuContext";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { toast } from "sonner";
import type { JobTitle, JobTitleFormData, JobTitleWithUsageCount } from "../types";

const QUERY_KEY = "job-titles";

/**
 * Hook para gerenciar cargos da BU atual
 * Busca cargos que incluem a BU atual no array bu_ids
 */
export function useJobTitles() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: [QUERY_KEY, buId],
    queryFn: async (): Promise<JobTitleWithUsageCount[]> => {
      if (!buId) return [];

      // Buscar cargos que contêm a BU atual no array bu_ids
      const { data: jobTitles, error } = await supabase
        .from("job_titles")
        .select("id, bu_ids, name, description, is_active, created_at, updated_at, deleted_at")
        .contains("bu_ids", [buId])
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
    queryKey: [QUERY_KEY, buId, "active"],
    queryFn: async (): Promise<JobTitle[]> => {
      if (!buId) return [];

      const { data, error } = await supabase
        .from("job_titles")
        .select("id, bu_ids, name, description, is_active, created_at, updated_at, deleted_at")
        .contains("bu_ids", [buId])
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

      // Se bu_ids foi passado, usa ele, senão usa a BU atual
      const buIds = data.bu_ids && data.bu_ids.length > 0 
        ? data.bu_ids 
        : [currentBu.id];

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
        if (error.message?.includes("job_titles_bu_name_unique")) {
          throw new Error("Já existe um cargo com este nome nesta BU");
        }
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
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
      bu_ids 
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
        if (error.message?.includes("job_titles_bu_name_unique")) {
          throw new Error("Já existe um cargo com este nome nesta BU");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Cargo atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar cargo");
    },
  });
}

/**
 * Hook para soft delete de cargo
 */
export function useDeleteJobTitle() {
  const supabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Cargo removido com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover cargo");
    },
  });
}
