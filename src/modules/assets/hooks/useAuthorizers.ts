import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

export interface AuthorizerOption {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  role_label: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  team_leader: "Líder de Time",
};

/**
 * Hook para buscar usuários que podem autorizar empréstimos e transferências.
 * Retorna: super_admin, admin e líderes de time (teams.leader_user_id) da BU atual.
 */
export function useAuthorizers() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  const { data: authorizers = [], isLoading } = useQuery({
    queryKey: [...queryKeys.profiles.buProfiles(buId ?? null), "authorizers"],
    enabled: !!buId,
    queryFn: async () => {
      // 1. Fetch memberships for admin roles using profile_id (Identity Cutover v3.0)
      const { data: memberships, error: membershipError } = await supabase
        .from("bu_user_memberships")
        .select("profile_id, role_in_bu")
        .eq("bu_id", buId!)
        .in("role_in_bu", ["super_admin", "admin"]);

      if (membershipError) throw membershipError;

      // 2. Fetch team leaders (profiles.id via teams.leader_user_id)
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("leader_user_id")
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .not("leader_user_id", "is", null);

      if (teamsError) throw teamsError;

      // Build maps with profile_id as key (Identity Cutover v3.0)
      const adminProfileIds = (memberships || [])
        .map((m) => m.profile_id)
        .filter((id): id is string => !!id);
      const roleMapByProfileId = new Map<string, string>(
        (memberships || [])
          .filter((m) => m.profile_id)
          .map((m) => [m.profile_id!, m.role_in_bu])
      );

      // Team leaders are stored as profiles.id
      const teamLeaderProfileIds = (teams || [])
        .map((t) => t.leader_user_id)
        .filter((id): id is string => !!id);

      // Mark team leaders in the role map (if not already admin)
      for (const leaderId of teamLeaderProfileIds) {
        if (!roleMapByProfileId.has(leaderId)) {
          roleMapByProfileId.set(leaderId, "team_leader");
        }
      }

      // Combine all profile IDs
      const allProfileIds = [...new Set([...adminProfileIds, ...teamLeaderProfileIds])];
      if (allProfileIds.length === 0) return [];

      // 3. Fetch full profiles using profile_id
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, first_name, last_name, photo_url")
        .in("id", allProfileIds);

      if (profileError) throw profileError;

      return (profiles || [])
        .map((p) => {
          const role = roleMapByProfileId.get(p.id) || "team_leader";
          return {
            id: p.id,
            user_id: p.user_id!,
            full_name:
              p.display_name ||
              `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
              "Sem nome",
            avatar_url: p.photo_url,
            role,
            role_label: ROLE_LABELS[role] || role,
          };
        })
        .sort((a, b) => {
          // Sort by role priority: super_admin > admin > team_leader
          const rolePriority: Record<string, number> = {
            super_admin: 0,
            admin: 1,
            team_leader: 2,
          };
          const priorityDiff =
            (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99);
          if (priorityDiff !== 0) return priorityDiff;
          return a.full_name.localeCompare(b.full_name);
        }) as AuthorizerOption[];
    },
  });

  return {
    authorizers,
    isLoading,
  };
}
