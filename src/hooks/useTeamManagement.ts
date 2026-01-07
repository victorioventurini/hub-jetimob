import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { useAuth } from "@/hooks/useAuth";
import { useIdentity } from "@/hooks/useIdentity";

/**
 * Hook para verificar se o usuário pode gerenciar um time específico.
 * 
 * SAFE for pre-BU: Uses useOptionalBuClient() and disables query until BU is selected.
 * 
 * IDENTITY CONVENTION:
 * - Uses auth.uid() (user_id) for RPC call (the DB function converts to profile_id internally)
 * - The RPC `get_manageable_teams` handles the conversion from user_id → profile_id
 * - See docs/IDENTITY_CONVENTION.md for details
 * 
 * Regras:
 * - super_admin: pode gerenciar qualquer time
 * - admin da BU: pode gerenciar qualquer time da BU
 * - Líder direto: pode gerenciar APENAS o time onde é líder
 * - NÃO pode gerenciar time pai, irmão ou de outro ramo
 */
export function useTeamManagement() {
  const { isAdmin } = useAuth();
  const { userId, isReady: identityReady } = useIdentity();
  const { client, buId, isReady: buReady } = useOptionalBuClient();

  const { data: manageableTeams = [], isLoading } = useQuery({
    queryKey: ["manageable-teams", buId, userId],
    queryFn: async () => {
      if (!buId || !userId || !client) {
        throw new Error("useTeamManagement: No BU client available");
      }

      // RPC receives auth.uid() (user_id) and converts internally to profile_id
      const { data, error } = await client.rpc("get_manageable_teams", {
        p_user_id: userId,
        p_bu_id: buId,
      });

      if (error) {
        console.error("Erro ao buscar times gerenciáveis:", error);
        return [];
      }

      return data || [];
    },
    enabled: buReady && identityReady && !!userId,
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Verifica se o usuário pode gerenciar um time específico.
   * Admin/super_admin sempre podem.
   */
  const canManageTeam = (teamId: string): boolean => {
    if (isAdmin) return true;
    
    const team = manageableTeams.find((t: any) => t.team_id === teamId);
    return team?.can_manage ?? false;
  };

  /**
   * Retorna lista de IDs de times que o usuário pode gerenciar
   */
  const manageableTeamIds = manageableTeams
    .filter((t: any) => t.can_manage)
    .map((t: any) => t.team_id);

  return {
    canManageTeam,
    manageableTeamIds,
    manageableTeams,
    isLoading,
  };
}
