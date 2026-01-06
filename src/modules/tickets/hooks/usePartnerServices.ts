import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";

// ===========================================
// TYPES
// ===========================================

export type PartnerServiceStatus = "active" | "inactive";

export interface PartnerServiceMapping {
  id: string;
  bu_id: string;
  partner_company_id: string;
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
  partner_company_id: string;
  partner_company_name: string;
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
export function usePartnerServices(partnerCompanyId?: string) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: ["partner-services", buId, partnerCompanyId],
    queryFn: async () => {
      if (!buId) return [];

      let query = supabase
        .from("v_partner_services")
        .select("*")
        .eq("bu_id", buId)
        .eq("status", "active");

      if (partnerCompanyId) {
        query = query.eq("partner_company_id", partnerCompanyId);
      }

      const { data, error } = await query.order("category_name");

      if (error) throw error;
      return data as PartnerService[];
    },
    enabled: !!buId,
  });
}

/**
 * Busca categorias atendidas por um parceiro (usando função SQL)
 */
export function usePartnerCategories(partnerCompanyId: string | undefined) {
  return useQuery({
    queryKey: ["partner-categories", partnerCompanyId],
    queryFn: async () => {
      if (!partnerCompanyId) return [];

      const { data, error } = await supabase
        .rpc("get_partner_categories", { p_partner_company_id: partnerCompanyId });

      if (error) throw error;
      return data as PartnerCategory[];
    },
    enabled: !!partnerCompanyId,
  });
}

/**
 * Busca subcategorias atendidas por um parceiro para uma categoria específica
 */
export function usePartnerSubcategories(
  partnerCompanyId: string | undefined,
  categoryId: string | undefined
) {
  return useQuery({
    queryKey: ["partner-subcategories", partnerCompanyId, categoryId],
    queryFn: async () => {
      if (!partnerCompanyId || !categoryId) return [];

      const { data, error } = await supabase
        .rpc("get_partner_subcategories", {
          p_partner_company_id: partnerCompanyId,
          p_category_id: categoryId,
        });

      if (error) throw error;
      return data as PartnerSubcategory[];
    },
    enabled: !!partnerCompanyId && !!categoryId,
  });
}

/**
 * Busca todos os mappings de um parceiro (para configuração)
 */
export function usePartnerServiceMappings(partnerCompanyId: string | undefined) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: ["partner-service-mappings", buId, partnerCompanyId],
    queryFn: async () => {
      if (!buId || !partnerCompanyId) return [];

      const { data, error } = await supabase
        .from("partner_service_mappings")
        .select("*")
        .eq("bu_id", buId)
        .eq("partner_company_id", partnerCompanyId)
        .is("deleted_at", null);

      if (error) throw error;
      return data as PartnerServiceMapping[];
    },
    enabled: !!buId && !!partnerCompanyId,
  });
}

/**
 * Cria um novo mapeamento de serviço
 */
export function useCreatePartnerService() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useMutation({
    mutationFn: async (data: {
      partner_company_id: string;
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
          partner_company_id: data.partner_company_id,
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
      queryClient.invalidateQueries({ queryKey: ["partner-services"] });
      queryClient.invalidateQueries({ queryKey: ["partner-categories"] });
      queryClient.invalidateQueries({ queryKey: ["partner-subcategories"] });
      queryClient.invalidateQueries({
        queryKey: ["partner-service-mappings", buId, variables.partner_company_id],
      });
    },
  });
}

/**
 * Remove (soft delete) um mapeamento de serviço
 */
export function useDeletePartnerService() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useMutation({
    mutationFn: async ({
      id,
      partner_company_id,
    }: {
      id: string;
      partner_company_id: string;
    }) => {
      const { error } = await supabase
        .from("partner_service_mappings")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["partner-services"] });
      queryClient.invalidateQueries({ queryKey: ["partner-categories"] });
      queryClient.invalidateQueries({ queryKey: ["partner-subcategories"] });
      queryClient.invalidateQueries({
        queryKey: ["partner-service-mappings", buId, variables.partner_company_id],
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

  return useMutation({
    mutationFn: async ({
      partner_company_id,
      services,
    }: {
      partner_company_id: string;
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
        .eq("partner_company_id", partner_company_id)
        .is("deleted_at", null);

      if (deleteError) throw deleteError;

      // Se não há serviços novos, termina aqui
      if (services.length === 0) {
        return [];
      }

      // Inserir novos mapeamentos
      const mappingsToInsert = services.map((s) => ({
        bu_id: buId,
        partner_company_id,
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
      queryClient.invalidateQueries({ queryKey: ["partner-services"] });
      queryClient.invalidateQueries({ queryKey: ["partner-categories"] });
      queryClient.invalidateQueries({ queryKey: ["partner-subcategories"] });
      queryClient.invalidateQueries({
        queryKey: ["partner-service-mappings", buId, variables.partner_company_id],
      });
    },
  });
}

/**
 * Verifica se um parceiro tem serviços configurados
 */
export function useHasPartnerServices(partnerCompanyId: string | undefined) {
  const { data: services, isLoading } = usePartnerServices(partnerCompanyId);
  
  return {
    hasServices: (services?.length ?? 0) > 0,
    isLoading,
    servicesCount: services?.length ?? 0,
  };
}
