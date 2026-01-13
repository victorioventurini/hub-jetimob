import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { useIdentity } from "@/hooks/useIdentity";
import { usePermissions } from "@/hooks/usePermissions";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";

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
 * IMPERSONATION-AWARE:
 * - Uses usePermissions().isWildcard which respects impersonation context
 * - When impersonating, isWildcard is false, so we rely on RPC results
 * 
 * Regras:
 * - super_admin: pode gerenciar qualquer time (via isWildcard)
 * - admin da BU: pode gerenciar qualquer time da BU
 * - Líder direto: pode gerenciar APENAS o time onde é líder
 * - NÃO pode gerenciar time pai, irmão ou de outro ramo
 */
export function useTeamManagement() {
  const { isWildcard } = usePermissions();
  const { userId: realUserId, isReady: identityReady } = useIdentity();
  const { client, buId, isReady: buReady } = useOptionalBuClient();
  const { isImpersonating, impersonatedUserId } = useOptionalImpersonation();

  // Use impersonated user ID when impersonating, otherwise use real user ID
  const effectiveUserId = isImpersonating && impersonatedUserId 
    ? impersonatedUserId 
    : realUserId;

  // Query key includes impersonation flag to force refetch when switching
  const queryKey = isImpersonating
    ? ['manageable-teams', 'impersonated', buId, effectiveUserId] as const
    : ['manageable-teams', 'real', buId, effectiveUserId] as const;

  const { data: manageableTeams = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!buId || !effectiveUserId || !client) {
        throw new Error("useTeamManagement: No BU client available");
      }

      // RPC receives user_id and converts internally to profile_id
      // When impersonating, we pass the impersonated user's ID
      const { data, error } = await client.rpc("get_manageable_teams", {
        p_user_id: effectiveUserId,
        p_bu_id: buId,
      });

      if (error) {
        console.error("Erro ao buscar times gerenciáveis:", error);
        return [];
      }

      return data || [];
    },
    enabled: buReady && identityReady && !!effectiveUserId,
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Verifica se o usuário pode gerenciar um time específico.
   * isWildcard respeita impersonação (retorna false quando impersonando).
   */
  const canManageTeam = (teamId: string): boolean => {
    if (isWildcard) return true;
    
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
