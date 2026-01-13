/**
 * Hooks compartilhados para dados reutilizados em múltiplos módulos.
 * Estes hooks fazem queries simples e leves para uso em selects, dropdowns, etc.
 * 
 * IMPORTANTE: Todos os hooks que retornam dados BU-scoped devem filtrar por bu_id!
 * IMPORTANTE: Usar queryKeys centralizados de @/lib/queryKeys
 */

import { useQuery } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Lista simples de times para uso em dropdowns/selects.
 * Filtra automaticamente pela BU atual.
 * Para funcionalidades completas de times, use src/modules/teams/hooks/useTeams.ts
 */
export function useTeamsList() {
  const { currentBu } = useBu();
  const supabase = useOptionalBuScopedSupabase();
  
  return useQuery({
    // Default: do not include inactive teams in dropdowns
    queryKey: queryKeys.teams.list(currentBu?.id ?? null, false),
    queryFn: async () => {
      if (!supabase || !currentBu?.id) return [];
      
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, parent_team_id, leader_user_id")
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null)
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!supabase && !!currentBu?.id,
  });
}

/**
 * Lista de ciclos de OKR ordenados por data.
 */
export function useCyclesList() {
  const supabase = useOptionalBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.cycles.list(),
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("cycles")
        .select("id, name, start_date, end_date, type")
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!supabase,
  });
}

/**
 * Perfil de um usuário específico (para exibição).
 * Considera o override de cargo via bu_user_memberships para a BU atual.
 * @updated Wave 2.6 - Prioriza job_title da membership sobre o do profile
 */
export function useUserProfile(userId?: string) {
  const supabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();
  
  return useQuery({
    queryKey: queryKeys.profiles.detail(userId ?? "", currentBu?.id ?? ""),
    queryFn: async () => {
      if (!supabase || !userId) return null;

      // Buscar profile base
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, team_id, job_title_id, job_title_rel:job_titles!job_title_id(name)")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!profile) return null;

      // Cargo default do profile
      let jobTitle = (profile.job_title_rel as { name: string } | null)?.name || null;

      // Verificar override de cargo na membership da BU atual
      if (currentBu?.id) {
        const { data: membership } = await supabase
          .from("bu_user_memberships")
          .select("job_title_id, job_title:job_titles!bu_user_memberships_job_title_id_fkey(name)")
          .eq("user_id", userId)
          .eq("bu_id", currentBu.id)
          .is("deleted_at", null)
          .maybeSingle();

        // Se membership tem cargo específico, usar ele
        if (membership?.job_title_id && membership?.job_title) {
          jobTitle = (membership.job_title as { name: string }).name;
        }
      }

      return {
        ...profile,
        job_title: jobTitle,
      };
    },
    enabled: !!supabase && !!userId,
  });
}

// useProfilesList foi removido - use useBuUsersDirectory de @/hooks/useBuUsersDirectory
