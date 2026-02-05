import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { useBu } from "@/contexts/BuContext";

export interface TransferItem {
  id: string;
  newOwnerId: string;
}

export interface TransferConfig {
  profileId: string;
  transfers: {
    kpis: TransferItem[];
    initiatives: TransferItem[];
    tickets: TransferItem[];
  };
}

/**
 * POST-BU hook: Only executes mutations when BU is selected.
 */
export function useDeleteProfile() {
  const queryClient = useQueryClient();
  const { client } = useOptionalBuClient();
  const { currentBu } = useBu();

  return useMutation({
    mutationFn: async (profileId: string) => {
      if (!client) {
        throw new Error("useDeleteProfile: No BU client available");
      }
      
      // Soft delete - set deleted_at
      const { error } = await client
        .from("profiles")
        .update({ 
          deleted_at: new Date().toISOString(),
          employment_status: "terminated" as const,
          updated_at: new Date().toISOString() 
        })
        .eq("id", profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all(currentBu?.id ?? null), refetchType: 'active' });
      toast.success("Jetimober excluído com sucesso");
    },
    onError: () => {
      toast.error("Erro ao excluir Jetimober");
    },
  });
}

/**
 * Transfer all dependencies from one user to new owners, then soft-delete.
 * This ensures mandatory dependencies (KPIs, Initiatives, Tickets) are migrated
 * before the user is inactivated. Teams (optional) are auto-cleared.
 */
export function useTransferDependencies() {
  const queryClient = useQueryClient();
  const { client } = useOptionalBuClient();
  const { currentBu } = useBu();

  return useMutation({
    mutationFn: async (config: TransferConfig) => {
      if (!client) {
        throw new Error("useTransferDependencies: No BU client available");
      }

      const { profileId, transfers } = config;
      const now = new Date().toISOString();

      // 1. Transfer KPIs
      for (const item of transfers.kpis) {
        const { error } = await client
          .from("kpi_metrics")
          .update({ owner_user_id: item.newOwnerId, updated_at: now })
          .eq("id", item.id);
        if (error) throw error;
      }

      // 2. Transfer Initiatives
      for (const item of transfers.initiatives) {
        const { error } = await client
          .from("okr_initiatives")
          .update({ owner_user_id: item.newOwnerId, updated_at: now })
          .eq("id", item.id);
        if (error) throw error;
      }

      // 3. Transfer Tickets
      for (const item of transfers.tickets) {
        const { error } = await client
          .from("tickets")
          .update({ owner_user_id: item.newOwnerId, updated_at: now })
          .eq("id", item.id);
        if (error) throw error;
      }

      // 4. Clear team leader (SET NULL) - optional dependency
      const { error: teamsError } = await client
        .from("teams")
        .update({ leader_user_id: null, updated_at: now })
        .eq("leader_user_id", profileId);
      if (teamsError) throw teamsError;

      // 5. Soft delete the profile
      const { error: profileError } = await client
        .from("profiles")
        .update({
          deleted_at: now,
          employment_status: "terminated" as const,
          updated_at: now,
        })
        .eq("id", profileId);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      const buId = currentBu?.id ?? null;
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.all(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiatives(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all(buId) });
      toast.success("Responsabilidades transferidas e Jetimober excluído com sucesso");
    },
    onError: (error) => {
      console.error("Transfer error:", error);
      toast.error("Erro ao transferir responsabilidades");
    },
  });
}
