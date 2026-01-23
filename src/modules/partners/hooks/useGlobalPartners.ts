/**
 * useGlobalPartners - Hook para gerenciar empresas parceiras globalmente
 * 
 * Diferente do usePartnerCompanies do módulo tickets, este hook
 * acessa parceiros GLOBALMENTE (sem filtro de BU).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/globalClient";
import { partnersKeys } from "@/lib/queryKeys/partners";
import { toast } from "sonner";
import type {
  GlobalPartnerCompany,
  CreatePartnerCompanyData,
  UpdatePartnerCompanyData,
} from "../types";

const PARTNER_FIELDS = `
  id, name, legal_name, person_type, document, document_type,
  allowed_domains, notes, status, created_at, updated_at, deleted_at, bu_id,
  bu_associations:partner_company_bu_associations(
    id, bu_id, is_active, notes, created_at, updated_at,
    bu:bu_units(id, name)
  )
`;

/**
 * Lista todos os parceiros globalmente
 */
export function useGlobalPartners() {
  return useQuery({
    queryKey: partnersKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_companies")
        .select(PARTNER_FIELDS)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;

      // Compute active_bus_count
      return (data as GlobalPartnerCompany[]).map((partner) => ({
        ...partner,
        active_bus_count: partner.bu_associations?.filter((a) => a.is_active).length ?? 0,
      }));
    },
  });
}

/**
 * Busca um parceiro pelo ID
 */
export function usePartnerDetail(partnerId: string | null) {
  return useQuery({
    queryKey: partnersKeys.detail(partnerId),
    queryFn: async () => {
      if (!partnerId) return null;

      const { data, error } = await supabase
        .from("partner_companies")
        .select(PARTNER_FIELDS)
        .eq("id", partnerId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      return data as GlobalPartnerCompany | null;
    },
    enabled: !!partnerId,
  });
}

/**
 * Busca parceiro por documento (CPF/CNPJ)
 */
export function useSearchPartnerByDocument(document: string | null) {
  const normalizedDoc = document?.replace(/\D/g, "") ?? "";

  return useQuery({
    queryKey: partnersKeys.byDocument(normalizedDoc || null),
    queryFn: async () => {
      if (!normalizedDoc || normalizedDoc.length < 11) return null;

      const { data, error } = await supabase
        .from("partner_companies")
        .select("id, name, document, person_type, document_type, status")
        .eq("document", normalizedDoc)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: normalizedDoc.length >= 11,
  });
}

/**
 * Cria um novo parceiro global
 */
export function useCreateGlobalPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePartnerCompanyData) => {
      const { data: created, error } = await supabase
        .from("partner_companies")
        .insert([{
          name: data.name,
          legal_name: data.legal_name || null,
          person_type: data.person_type,
          document: data.document || null,
          document_type: data.document_type || null,
          allowed_domains: data.allowed_domains || [],
          notes: data.notes || null,
          status: "active" as const,
          bu_id: null, // Global partner, no BU
        }])
        .select("id")
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnersKeys.all() });
      toast.success("Empresa parceira criada com sucesso");
    },
    onError: (error: Error) => {
      console.error("[useCreateGlobalPartner] Error:", error);
      if (error.message.includes("idx_partner_companies_document_unique")) {
        toast.error("Já existe uma empresa cadastrada com este CPF/CNPJ");
      } else {
        toast.error("Erro ao criar empresa parceira: " + error.message);
      }
    },
  });
}

/**
 * Atualiza um parceiro existente
 */
export function useUpdateGlobalPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePartnerCompanyData) => {
      const { id, ...updateData } = data;

      const { error } = await supabase
        .from("partner_companies")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      return { id };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: partnersKeys.all() });
      queryClient.invalidateQueries({ queryKey: partnersKeys.detail(variables.id) });
      toast.success("Empresa parceira atualizada");
    },
    onError: (error: Error) => {
      console.error("[useUpdateGlobalPartner] Error:", error);
      toast.error("Erro ao atualizar empresa parceira");
    },
  });
}

/**
 * Soft delete de um parceiro
 */
export function useDeleteGlobalPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (partnerId: string) => {
      const { error } = await supabase
        .from("partner_companies")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", partnerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnersKeys.all() });
      toast.success("Empresa parceira removida");
    },
    onError: (error: Error) => {
      console.error("[useDeleteGlobalPartner] Error:", error);
      toast.error("Erro ao remover empresa parceira");
    },
  });
}
