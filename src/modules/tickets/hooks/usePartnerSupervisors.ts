/**
 * Hook para gerenciar supervisores de uma empresa parceira.
 * 
 * Supervisores são usuários (internos ou externos) que acompanham automaticamente
 * todos os tickets de uma empresa parceira específica como watchers.
 * 
 * - Internos: profiles.id (usuários da BU)
 * - Externos: partner_contacts.id (contatos da empresa parceira)
 * 
 * @see docs/canonical/SCHEMA_QUICK_REFERENCE.md (external_company_bu_associations)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { ticketsKeys } from "@/lib/queryKeys/tickets";
import { toast } from "sonner";

interface SupervisorProfile {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  job_title_name?: string | null;
}

interface SupervisorContact {
  id: string;
  name: string;
  email: string;
}

interface PartnerSupervisorsData {
  internalSupervisorIds: string[];
  externalSupervisorIds: string[];
  internalProfiles: SupervisorProfile[];
  externalContacts: SupervisorContact[];
}

/**
 * Busca supervisores (internos e externos) de uma empresa parceira na BU atual.
 */
export function usePartnerSupervisors(companyId: string | null) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useQuery<PartnerSupervisorsData>({
    queryKey: ticketsKeys.partnerSupervisors(companyId, buId),
    queryFn: async () => {
      if (!companyId || !buId) {
        return { 
          internalSupervisorIds: [], 
          externalSupervisorIds: [], 
          internalProfiles: [], 
          externalContacts: [] 
        };
      }

      // Buscar associação com supervisor_profile_ids e supervisor_contact_ids
      const { data: assoc, error } = await supabase
        .from("external_company_bu_associations")
        .select("supervisor_profile_ids, supervisor_contact_ids")
        .eq("external_company_id", companyId)
        .eq("bu_id", buId)
        .eq("role", "partner")
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;

      const internalSupervisorIds = (assoc?.supervisor_profile_ids as string[] | null) ?? [];
      const externalSupervisorIds = (assoc?.supervisor_contact_ids as string[] | null) ?? [];
      
      // Buscar profiles dos supervisores internos
      let internalProfiles: SupervisorProfile[] = [];
      if (internalSupervisorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("v_bu_active_profiles")
          .select("id, display_name, photo_url, job_title_name")
          .in("id", internalSupervisorIds);

        if (profilesError) throw profilesError;
        internalProfiles = (profiles ?? []) as SupervisorProfile[];
      }

      // Buscar contatos dos supervisores externos
      let externalContacts: SupervisorContact[] = [];
      if (externalSupervisorIds.length > 0) {
        const { data: contacts, error: contactsError } = await supabase
          .from("partner_contacts")
          .select("id, name, email")
          .in("id", externalSupervisorIds);

        if (contactsError) throw contactsError;
        externalContacts = (contacts ?? []) as SupervisorContact[];
      }

      return { 
        internalSupervisorIds, 
        externalSupervisorIds,
        internalProfiles,
        externalContacts,
      };
    },
    enabled: !!companyId && !!buId,
  });
}

/**
 * Mutation para atualizar supervisores (internos e externos) de uma empresa parceira.
 */
export function useUpdatePartnerSupervisors() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useMutation({
    mutationFn: async ({ 
      companyId, 
      internalSupervisorIds,
      externalSupervisorIds,
    }: { 
      companyId: string; 
      internalSupervisorIds: string[];
      externalSupervisorIds: string[];
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      const { error } = await supabase
        .from("external_company_bu_associations")
        .update({ 
          supervisor_profile_ids: internalSupervisorIds,
          supervisor_contact_ids: externalSupervisorIds,
          updated_at: new Date().toISOString(),
        })
        .eq("external_company_id", companyId)
        .eq("bu_id", buId)
        .eq("role", "partner")
        .is("deleted_at", null);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ticketsKeys.partnerSupervisors(variables.companyId, buId),
        refetchType: 'active',
      });
      toast.success("Supervisores atualizados");
    },
    onError: (error: Error) => {
      console.error("[useUpdatePartnerSupervisors] Error:", error);
      toast.error("Erro ao atualizar supervisores");
    },
  });
}
