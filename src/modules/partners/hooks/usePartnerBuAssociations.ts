/**
 * usePartnerBuAssociations - Hook para gerenciar associações de parceiros com BUs
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { partnersKeys } from "@/lib/queryKeys/partners";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import type { PartnerBuAssociationData } from "../types";

/**
 * Lista associações de um parceiro específico
 */
export function usePartnerBuAssociations(partnerId: string | null) {
  return useQuery({
    queryKey: partnersKeys.buAssociations(partnerId),
    queryFn: async () => {
      if (!partnerId) return [];

      const { data, error } = await supabase
        .from("partner_company_bu_associations")
        .select(`
          id, partner_company_id, bu_id, is_active, notes, created_at, updated_at,
          bu:bu_units(id, name)
        `)
        .eq("partner_company_id", partnerId)
        .is("deleted_at", null)
        .order("created_at");

      if (error) throw error;
      return data;
    },
    enabled: !!partnerId,
  });
}

/**
 * Lista parceiros ativos na BU atual
 */
export function usePartnersByBu() {
  const { currentBuId } = useBu();
  const supabaseBu = useBuScopedSupabase();

  return useQuery({
    queryKey: partnersKeys.byBu(currentBuId),
    queryFn: async () => {
      if (!currentBuId || !supabaseBu) return [];

      const { data, error } = await supabaseBu
        .from("partner_company_bu_associations")
        .select(`
          id, is_active, notes,
          partner_company:partner_companies(
            id, name, legal_name, person_type, document, document_type, status
          )
        `)
        .eq("bu_id", currentBuId)
        .eq("is_active", true)
        .is("deleted_at", null);

      if (error) throw error;

      // Flatten para retornar apenas os parceiros
      return data
        .filter((d) => d.partner_company)
        .map((d) => ({
          ...d.partner_company,
          association_id: d.id,
        }));
    },
    enabled: !!currentBuId && !!supabaseBu,
  });
}

/**
 * Ativa ou cria associação de um parceiro com a BU atual
 * IMPORTANTE: Usa cliente BU-scoped para respeitar RLS
 */
export function useActivatePartnerInBu() {
  const queryClient = useQueryClient();
  const { currentBuId } = useBu();
  const supabaseBu = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: PartnerBuAssociationData) => {
      // Upsert: se já existe, atualiza; se não, cria
      const { error } = await supabaseBu
        .from("partner_company_bu_associations")
        .upsert(
          {
            partner_company_id: data.partner_company_id,
            bu_id: data.bu_id,
            is_active: data.is_active ?? true,
            notes: data.notes || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "partner_company_id,bu_id",
          }
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: partnersKeys.all() });
      queryClient.invalidateQueries({ queryKey: partnersKeys.byBu(variables.bu_id) });
      queryClient.invalidateQueries({ queryKey: partnersKeys.buAssociations(variables.partner_company_id) });
      // Também invalida query do módulo tickets
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partners(currentBuId) });
      toast.success("Parceiro ativado nesta unidade de negócio");
    },
    onError: (error: Error) => {
      console.error("[useActivatePartnerInBu] Error:", error);
      toast.error("Erro ao ativar parceiro");
    },
  });
}

/**
 * Desativa parceiro em uma BU (não deleta, apenas is_active = false)
 * IMPORTANTE: Usa cliente BU-scoped para respeitar RLS
 */
export function useDeactivatePartnerInBu() {
  const queryClient = useQueryClient();
  const { currentBuId } = useBu();
  const supabaseBu = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      partnerId,
      buId,
    }: {
      partnerId: string;
      buId: string;
    }) => {
      const { error } = await supabaseBu
        .from("partner_company_bu_associations")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("partner_company_id", partnerId)
        .eq("bu_id", buId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: partnersKeys.all() });
      queryClient.invalidateQueries({ queryKey: partnersKeys.byBu(variables.buId) });
      queryClient.invalidateQueries({ queryKey: partnersKeys.buAssociations(variables.partnerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partners(currentBuId) });
      toast.success("Parceiro desativado nesta unidade de negócio");
    },
    onError: (error: Error) => {
      console.error("[useDeactivatePartnerInBu] Error:", error);
      toast.error("Erro ao desativar parceiro");
    },
  });
}

/**
 * Toggle do status de ativação
 */
export function useTogglePartnerBuAssociation() {
  const activateMutation = useActivatePartnerInBu();
  const deactivateMutation = useDeactivatePartnerInBu();

  return {
    mutate: (partnerId: string, buId: string, currentlyActive: boolean) => {
      if (currentlyActive) {
        deactivateMutation.mutate({ partnerId, buId });
      } else {
        activateMutation.mutate({
          partner_company_id: partnerId,
          bu_id: buId,
          is_active: true,
        });
      }
    },
    isPending: activateMutation.isPending || deactivateMutation.isPending,
  };
}

// ============================================================
// PLATFORM ADMIN HOOKS (Cross-BU, usam cliente global)
// ============================================================

/**
 * Ativa parceiro em qualquer BU (Platform Admin only)
 * Usa cliente global pois Platform Admin opera cross-BU
 */
export function useActivatePartnerInBuGlobal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PartnerBuAssociationData) => {
      const { error } = await supabase
        .from("partner_company_bu_associations")
        .upsert(
          {
            partner_company_id: data.partner_company_id,
            bu_id: data.bu_id,
            is_active: data.is_active ?? true,
            notes: data.notes || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "partner_company_id,bu_id",
          }
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: partnersKeys.all() });
      queryClient.invalidateQueries({ queryKey: partnersKeys.byBu(variables.bu_id) });
      queryClient.invalidateQueries({ queryKey: partnersKeys.buAssociations(variables.partner_company_id) });
      toast.success("Parceiro ativado na unidade de negócio");
    },
    onError: (error: Error) => {
      console.error("[useActivatePartnerInBuGlobal] Error:", error);
      toast.error("Erro ao ativar parceiro");
    },
  });
}

/**
 * Desativa parceiro em qualquer BU (Platform Admin only)
 * Usa cliente global pois Platform Admin opera cross-BU
 */
export function useDeactivatePartnerInBuGlobal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      partnerId,
      buId,
    }: {
      partnerId: string;
      buId: string;
    }) => {
      const { error } = await supabase
        .from("partner_company_bu_associations")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("partner_company_id", partnerId)
        .eq("bu_id", buId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: partnersKeys.all() });
      queryClient.invalidateQueries({ queryKey: partnersKeys.byBu(variables.buId) });
      queryClient.invalidateQueries({ queryKey: partnersKeys.buAssociations(variables.partnerId) });
      toast.success("Parceiro desativado na unidade de negócio");
    },
    onError: (error: Error) => {
      console.error("[useDeactivatePartnerInBuGlobal] Error:", error);
      toast.error("Erro ao desativar parceiro");
    },
  });
}
