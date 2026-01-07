import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";

/**
 * Hook para verificar se o usuário pode gerenciar um time específico.
 * 
 * Regras:
 * - super_admin: pode gerenciar qualquer time
 * - admin da BU: pode gerenciar qualquer time da BU
 * - Líder direto: pode gerenciar APENAS o time onde é líder
 * - NÃO pode gerenciar time pai, irmão ou de outro ramo
 */
export function useTeamManagement() {
  const { user, isAdmin } = useAuth();
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  const { data: manageableTeams = [], isLoading } = useQuery({
    queryKey: ["manageable-teams", currentBuId, user?.id],
    queryFn: async () => {
      if (!currentBuId || !user?.id) return [];

      const { data, error } = await supabase.rpc("get_manageable_teams", {
        p_user_id: user.id,
        p_bu_id: currentBuId,
      });

      if (error) {
        console.error("Erro ao buscar times gerenciáveis:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!currentBuId && !!user?.id,
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
