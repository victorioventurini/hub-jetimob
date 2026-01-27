/**
 * Hook para gerenciar supervisores de uma empresa parceira.
 * 
 * Supervisores são usuários internos que acompanham automaticamente todos
 * os tickets de uma empresa parceira específica como watchers.
 * 
 * @see docs/canonical/SCHEMA_QUICK_REFERENCE.md (partner_company_bu_associations.supervisor_profile_ids)
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

interface PartnerSupervisorsData {
  supervisorIds: string[];
  profiles: SupervisorProfile[];
}

/**
 * Busca supervisores de uma empresa parceira na BU atual.
 */
export function usePartnerSupervisors(companyId: string | null) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useQuery<PartnerSupervisorsData>({
    queryKey: ticketsKeys.partnerSupervisors(companyId, buId),
    queryFn: async () => {
      if (!companyId || !buId) return { supervisorIds: [], profiles: [] };

      // Buscar associação com supervisor_profile_ids
      const { data: assoc, error } = await supabase
        .from("partner_company_bu_associations")
        .select("supervisor_profile_ids")
        .eq("partner_company_id", companyId)
        .eq("bu_id", buId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;

      const supervisorIds = (assoc?.supervisor_profile_ids as string[] | null) ?? [];
      
      if (supervisorIds.length === 0) {
        return { supervisorIds: [], profiles: [] };
      }

      // Buscar profiles dos supervisores
      const { data: profiles, error: profilesError } = await supabase
        .from("v_bu_active_profiles")
        .select("id, display_name, photo_url, job_title_name")
        .in("id", supervisorIds);

      if (profilesError) throw profilesError;

      return { 
        supervisorIds, 
        profiles: (profiles ?? []) as SupervisorProfile[] 
      };
    },
    enabled: !!companyId && !!buId,
  });
}

/**
 * Mutation para atualizar supervisores de uma empresa parceira.
 */
export function useUpdatePartnerSupervisors() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useMutation({
    mutationFn: async ({ 
      companyId, 
      supervisorIds 
    }: { 
      companyId: string; 
      supervisorIds: string[]; 
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      const { error } = await supabase
        .from("partner_company_bu_associations")
        .update({ 
          supervisor_profile_ids: supervisorIds,
          updated_at: new Date().toISOString(),
        })
        .eq("partner_company_id", companyId)
        .eq("bu_id", buId)
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
