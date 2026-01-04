/**
 * Hooks compartilhados para dados reutilizados em múltiplos módulos.
 * Estes hooks fazem queries simples e leves para uso em selects, dropdowns, etc.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lista simples de times para uso em dropdowns/selects.
 * Para funcionalidades completas de times, use src/modules/teams/hooks/useTeams.ts
 */
export function useTeamsList() {
  return useQuery({
    queryKey: ["teams-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, parent_team_id, leader_user_id")
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Lista de ciclos de OKR ordenados por data.
 */
export function useCyclesList() {
  return useQuery({
    queryKey: ["cycles-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycles")
        .select("id, name, start_date, end_date, type")
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Perfil de um usuário específico (para exibição).
 */
export function useUserProfile(userId?: string) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, team_id, job_title")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/**
 * Lista simples de profiles para selects (líderes, owners, etc.)
 */
export function useProfilesList(buId?: string) {
  return useQuery({
    queryKey: ["profiles-list", buId],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, display_name, photo_url, job_title, user_id")
        .is("deleted_at", null)
        .eq("employment_status", "active")
        .order("display_name");

      if (buId) {
        query = query.eq("bu_id", buId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: buId ? !!buId : true,
  });
}
