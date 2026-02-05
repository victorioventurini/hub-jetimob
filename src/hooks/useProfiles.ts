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
    teamObjectives: TransferItem[];
    teamKrs: TransferItem[];
    orgObjectives: TransferItem[];
    orgKrs: TransferItem[];
  };
  /** Items to auto-clear (SET NULL) - don't need newOwnerId */
  autoClear?: {
    teamLeaderships: string[];       // team IDs
    areaLeaderships: string[];       // area IDs
    areaCoLeaderships: string[];     // area IDs
    krCoResponsibilities: string[];  // KR IDs (remove from co_responsibles array)
    kpiContributions: string[];      // kpi_data_contributors IDs
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
 * This ensures mandatory dependencies (KPIs, Initiatives, Tickets, OKRs) are migrated
 * before the user is inactivated. Optional dependencies are auto-cleared.
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

      const { profileId, transfers, autoClear } = config;
      const now = new Date().toISOString();

      // ============================================================
      // 1. MANDATORY TRANSFERS - Owner must be reassigned
      // ============================================================

      // 1.1 Transfer KPIs
      for (const item of transfers.kpis) {
        const { error } = await client
          .from("kpi_metrics")
          .update({ owner_user_id: item.newOwnerId, updated_at: now })
          .eq("id", item.id);
        if (error) throw error;
      }

      // 1.2 Transfer Initiatives
      for (const item of transfers.initiatives) {
        const { error } = await client
          .from("okr_initiatives")
          .update({ owner_user_id: item.newOwnerId, updated_at: now })
          .eq("id", item.id);
        if (error) throw error;
      }

      // 1.3 Transfer Tickets
      for (const item of transfers.tickets) {
        const { error } = await client
          .from("tickets")
          .update({ owner_user_id: item.newOwnerId, updated_at: now })
          .eq("id", item.id);
        if (error) throw error;
      }

      // 1.4 Transfer Team Objectives
      for (const item of transfers.teamObjectives) {
        const { error } = await client
          .from("okr_team_objectives")
          .update({ owner_user_id: item.newOwnerId, updated_at: now })
          .eq("id", item.id);
        if (error) throw error;
      }

      // 1.5 Transfer Team KRs
      for (const item of transfers.teamKrs) {
        const { error } = await client
          .from("okr_team_key_results")
          .update({ owner_user_id: item.newOwnerId, updated_at: now })
          .eq("id", item.id);
        if (error) throw error;
      }

      // 1.6 Transfer Org Objectives
      for (const item of transfers.orgObjectives) {
        const { error } = await client
          .from("okr_org_objectives")
          .update({ owner_user_id: item.newOwnerId, updated_at: now })
          .eq("id", item.id);
        if (error) throw error;
      }

      // 1.7 Transfer Org KRs
      for (const item of transfers.orgKrs) {
        const { error } = await client
          .from("okr_org_key_results")
          .update({ owner_user_id: item.newOwnerId, updated_at: now })
          .eq("id", item.id);
        if (error) throw error;
      }

      // ============================================================
      // 2. OPTIONAL AUTO-CLEAR - SET NULL or remove from arrays
      // ============================================================

      // 2.1 Clear team leader (SET NULL)
      const { error: teamsError } = await client
        .from("teams")
        .update({ leader_user_id: null, updated_at: now })
        .eq("leader_user_id", profileId);
      if (teamsError) throw teamsError;

      // 2.2 Clear area leader (SET NULL)
      const { error: areaLeaderError } = await client
        .from("areas")
        .update({ leader_user_id: null, updated_at: now })
        .eq("leader_user_id", profileId);
      if (areaLeaderError) throw areaLeaderError;

      // 2.3 Clear area co-leader (SET NULL)
      const { error: areaCoLeaderError } = await client
        .from("areas")
        .update({ co_leader_user_id: null, updated_at: now })
        .eq("co_leader_user_id", profileId);
      if (areaCoLeaderError) throw areaCoLeaderError;

      // 2.4 Remove from KR co_responsibles array
      if (autoClear?.krCoResponsibilities && autoClear.krCoResponsibilities.length > 0) {
        for (const krId of autoClear.krCoResponsibilities) {
          // Fetch current co_responsibles, remove profileId, update
          const { data: kr, error: fetchError } = await client
            .from("okr_team_key_results")
            .select("co_responsibles")
            .eq("id", krId)
            .single();
          
          if (fetchError) throw fetchError;
          
          const currentCoResponsibles = (kr?.co_responsibles as string[]) || [];
          const newCoResponsibles = currentCoResponsibles.filter(id => id !== profileId);
          
          const { error: updateError } = await client
            .from("okr_team_key_results")
            .update({ co_responsibles: newCoResponsibles, updated_at: now })
            .eq("id", krId);
          
          if (updateError) throw updateError;
        }
      }

      // 2.5 Delete KPI contributions (soft delete)
      if (autoClear?.kpiContributions && autoClear.kpiContributions.length > 0) {
        const { error: contributionsError } = await client
          .from("kpi_data_contributors")
          .update({ deleted_at: now })
          .in("id", autoClear.kpiContributions);
        if (contributionsError) throw contributionsError;
      }

      // ============================================================
      // 3. SOFT DELETE THE PROFILE
      // ============================================================
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
      // Invalidate all affected caches
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.all(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectivesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgKeyResultsPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.all(buId) });
      toast.success("Responsabilidades transferidas e Jetimober excluído com sucesso");
    },
    onError: (error) => {
      console.error("Transfer error:", error);
      toast.error("Erro ao transferir responsabilidades");
    },
  });
}
