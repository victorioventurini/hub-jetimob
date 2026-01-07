import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook para verificar se o usuário pode gerenciar um time específico.
 * 
 * SAFE for pre-BU: Uses useOptionalBuClient() and disables query until BU is selected.
 * 
 * Regras:
 * - super_admin: pode gerenciar qualquer time
 * - admin da BU: pode gerenciar qualquer time da BU
 * - Líder direto: pode gerenciar APENAS o time onde é líder
 * - NÃO pode gerenciar time pai, irmão ou de outro ramo
 */
export function useTeamManagement() {
  const { user, isAdmin } = useAuth();
  const { client, buId, isReady } = useOptionalBuClient();

  const { data: manageableTeams = [], isLoading } = useQuery({
    queryKey: ["manageable-teams", buId, user?.id],
    queryFn: async () => {
      if (!buId || !user?.id || !client) {
        throw new Error("useTeamManagement: No BU client available");
      }

      const { data, error } = await client.rpc("get_manageable_teams", {
        p_user_id: user.id,
        p_bu_id: buId,
      });

      if (error) {
        console.error("Erro ao buscar times gerenciáveis:", error);
        return [];
      }

      return data || [];
    },
    enabled: isReady && !!user?.id,
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
