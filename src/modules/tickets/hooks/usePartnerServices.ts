import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

// ===========================================
// TYPES
// ===========================================

export type PartnerServiceStatus = "active" | "inactive";

export interface PartnerServiceMapping {
  id: string;
  bu_id: string;
  external_company_id: string;
  category_id: string;
  subcategory_id: string | null;
  status: PartnerServiceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PartnerService {
  id: string;
  bu_id: string;
  external_company_id: string;
  external_company_name: string;
  category_id: string;
  category_name: string;
  category_scope: string;
  subcategory_id: string | null;
  subcategory_name: string | null;
  is_generalist: boolean;
  status: PartnerServiceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerCategory {
  category_id: string;
  category_name: string;
  is_generalist: boolean;
  subcategory_count: number;
}

export interface PartnerSubcategory {
  subcategory_id: string;
  subcategory_name: string;
}

// ===========================================
// HOOKS
// ===========================================

/**
 * Busca todos os serviços de um parceiro (view v_partner_services)
 */
export function usePartnerServices(externalCompanyId?: string) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.partnerServices(buId ?? null, externalCompanyId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!buId) return [];

      let query = supabase
        .from("v_partner_services")
        .select("id, bu_id, external_company_id, external_company_name, category_id, category_name, category_scope, subcategory_id, subcategory_name, is_generalist, status, notes, created_at, updated_at")
        .eq("bu_id", buId)
        .eq("status", "active");

      if (externalCompanyId) {
        query = query.eq("external_company_id", externalCompanyId);
      }

      const { data, error } = await query.order("category_name");

      if (error) throw error;
      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        bu_id: item.bu_id as string,
        external_company_id: item.external_company_id as string,
        external_company_name: item.external_company_name as string,
        category_id: item.category_id as string,
        category_name: item.category_name as string,
        category_scope: item.category_scope as string,
        subcategory_id: item.subcategory_id as string | null,
        subcategory_name: item.subcategory_name as string | null,
        is_generalist: item.is_generalist as boolean,
        status: item.status as PartnerServiceStatus,
        notes: item.notes as string | null,
        created_at: item.created_at as string,
        updated_at: item.updated_at as string,
      })) as PartnerService[];
    },
    enabled: !!buId,
  });
}

/**
 * Busca categorias atendidas por um parceiro (usando função SQL)
 */
export function usePartnerCategories(externalCompanyId: string | undefined) {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.partnerCategories(externalCompanyId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!externalCompanyId) return [];

      const { data, error } = await supabase
        .rpc("get_partner_categories", { p_partner_company_id: externalCompanyId } as any);

      if (error) throw error;
      return data as PartnerCategory[];
    },
    enabled: !!externalCompanyId,
  });
}

/**
 * Busca subcategorias atendidas por um parceiro para uma categoria específica
 */
export function usePartnerSubcategories(
  externalCompanyId: string | undefined,
  categoryId: string | undefined
) {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.partnerSubcategories(externalCompanyId, categoryId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!externalCompanyId || !categoryId) return [];

      const { data, error } = await supabase
        .rpc("get_partner_subcategories", {
          p_partner_company_id: externalCompanyId,
          p_category_id: categoryId,
        } as any);

      if (error) throw error;
      return data as PartnerSubcategory[];
    },
    enabled: !!externalCompanyId && !!categoryId,
  });
}

/**
 * Busca empresas parceiras que atendem uma categoria específica
 */
export function usePartnersByCategory(categoryId: string | undefined) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ["partners-by-category", buId, categoryId],
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!buId || !categoryId) return [];

      // Buscar parceiros distintos que atendem a categoria
      const { data, error } = await supabase
        .from("v_partner_services")
        .select("external_company_id, external_company_name")
        .eq("bu_id", buId)
        .eq("category_id", categoryId)
        .eq("status", "active");

      if (error) throw error;

      // Remover duplicatas (mesmo parceiro pode ter múltiplas subcategorias)
      const uniquePartners = Array.from(
        new Map((data || []).map((p: Record<string, unknown>) => [p.external_company_id, p])).values()
      );

      return uniquePartners.map((p: Record<string, unknown>) => ({
        id: p.external_company_id as string,
        name: p.external_company_name as string,
      }));
    },
    enabled: !!buId && !!categoryId,
  });
}

/**
 * Busca todos os mappings de um parceiro (para configuração)
 */
export function usePartnerServiceMappings(externalCompanyId: string | undefined) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.partnerServiceMappings(buId ?? null, externalCompanyId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!buId || !externalCompanyId) return [];

      const { data, error } = await supabase
        .from("partner_service_mappings")
        .select("id, bu_id, external_company_id, category_id, subcategory_id, status, notes, created_at, updated_at")
        .eq("bu_id", buId)
        .eq("external_company_id", externalCompanyId)
        .is("deleted_at", null);

      if (error) throw error;
      return (data || []) as PartnerServiceMapping[];
    },
    enabled: !!buId && !!externalCompanyId,
  });
}

/**
 * Cria um novo mapeamento de serviço
 */
export function useCreatePartnerService() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: {
      external_company_id: string;
      category_id: string;
      subcategory_id?: string | null;
      notes?: string | null;
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: mapping, error } = await supabase
        .from("partner_service_mappings")
        .insert({
          bu_id: buId,
          external_company_id: data.external_company_id,
          category_id: data.category_id,
          subcategory_id: data.subcategory_id || null,
          notes: data.notes || null,
          status: "active",
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return mapping as PartnerServiceMapping;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partnerServicesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partnerCategoriesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partnerSubcategoriesPrefix() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.partnerServiceMappings(buId ?? null, variables.external_company_id),
      });
    },
  });
}

/**
 * Remove (soft delete) um mapeamento de serviço com optimistic update
 */
export function useDeletePartnerService() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      external_company_id,
    }: {
      id: string;
      external_company_id: string;
    }) => {
      const { error } = await supabase
        .from("partner_service_mappings")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      return { id, external_company_id };
    },
    // Optimistic update: remove from list immediately
    onMutate: async ({ id, external_company_id }) => {
      const queryKey = ["partner-service-mappings", buId, external_company_id];
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<PartnerService[]>(queryKey);
      
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData.filter((s) => s.id !== id));
      }
      
      return { previousData, queryKey };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partnerServicesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partnerCategoriesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partnerSubcategoriesPrefix() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.partnerServiceMappings(buId ?? null, data.external_company_id),
      });
    },
  });
}

/**
 * Salva múltiplos mapeamentos de uma vez (para a UI de configuração)
 * Remove os antigos e insere os novos
 */
export function useSavePartnerServices() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      external_company_id,
      services,
    }: {
      external_company_id: string;
      services: Array<{
        category_id: string;
        subcategory_id: string | null;
        notes?: string | null;
      }>;
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Soft delete dos mapeamentos existentes
      const { error: deleteError } = await supabase
        .from("partner_service_mappings")
        .update({ deleted_at: new Date().toISOString() })
        .eq("bu_id", buId)
        .eq("external_company_id", external_company_id)
        .is("deleted_at", null);

      if (deleteError) throw deleteError;

      // Se não há serviços novos, termina aqui
      if (services.length === 0) {
        return [];
      }

      // Inserir novos mapeamentos
      const mappingsToInsert = services.map((s) => ({
        bu_id: buId,
        external_company_id,
        category_id: s.category_id,
        subcategory_id: s.subcategory_id,
        notes: s.notes || null,
        status: "active" as const,
        created_by: user?.id,
      }));

      const { data: mappings, error: insertError } = await supabase
        .from("partner_service_mappings")
        .insert(mappingsToInsert)
        .select();

      if (insertError) throw insertError;
      return mappings as PartnerServiceMapping[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partnerServicesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partnerCategoriesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partnerSubcategoriesPrefix() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.partnerServiceMappings(buId ?? null, variables.external_company_id),
      });
    },
  });
}

/**
 * Verifica se um parceiro tem serviços configurados
 */
export function useHasPartnerServices(externalCompanyId: string | undefined) {
  const { data: services, isLoading } = usePartnerServices(externalCompanyId);
  
  return {
    hasServices: (services?.length ?? 0) > 0,
    isLoading,
    servicesCount: services?.length ?? 0,
  };
}
