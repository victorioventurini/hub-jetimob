import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { queryKeys } from "@/lib/queryKeys";

export interface BuUser {
  user_id: string;
  profile_id: string;
  role_in_bu: string | null;
  has_bu_membership: boolean;
  onboarding_completed: boolean;
  profiles: {
    id: string;
    display_name: string;
    work_email: string;
    photo_url: string | null;
    job_title_name: string | null;
  };
  teams: Array<{
    id: string;
    name: string;
    is_primary: boolean;
  }>;
}

export function useBuUsers() {
  const { client: supabase, buId, isReady } = useOptionalBuClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: queryKeys.permissions.buUsers(buId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!supabase || !buId) return [];

      // Use canonical view - shows ALL registered users in the BU
      const { data: profilesRaw, error: profilesError } = await supabase
        .from("v_bu_active_profiles")
        .select("id, user_id, display_name, work_email, photo_url, job_title_name, onboarding_completed, has_bu_membership")
        .eq("bu_id", buId)
        .order("display_name");

      if (profilesError) throw profilesError;

      const profiles = profilesRaw ?? [];
      if (profiles.length === 0) return [];

      const userIds = profiles
        .map((p) => p.user_id)
        .filter((id): id is string => !!id);

      // Fetch memberships to get role_in_bu using profile_id (Identity Cutover v3.0)
      const { data: memberships } = await supabase
        .from("bu_user_memberships")
        .select("profile_id, role_in_bu")
        .eq("bu_id", buId);

      const membershipByProfileId: Record<string, string> = {};
      for (const m of memberships ?? []) {
        if (m.profile_id) {
          membershipByProfileId[m.profile_id] = m.role_in_bu;
        }
      }

      // Fetch team memberships
      let teamsByUserId: Record<string, Array<{ id: string; name: string; is_primary: boolean }>> = {};
      
      if (userIds.length > 0) {
        const { data: teamMemberships } = await supabase
          .from("user_team_memberships")
          .select("user_id, is_primary, team:teams!inner(id, name)")
          .in("user_id", userIds);

        type TeamMemberRow = {
          user_id: string;
          is_primary: boolean;
          team: { id: string; name: string };
        };

        for (const tm of (teamMemberships ?? []) as unknown as TeamMemberRow[]) {
          if (!teamsByUserId[tm.user_id]) {
            teamsByUserId[tm.user_id] = [];
          }
          teamsByUserId[tm.user_id].push({
            id: tm.team.id,
            name: tm.team.name,
            is_primary: tm.is_primary,
          });
        }
      }

      return profiles.map((p) => ({
        user_id: p.user_id || p.id,
        profile_id: p.id,
        role_in_bu: membershipByProfileId[p.id] || null,
        has_bu_membership: p.has_bu_membership,
        onboarding_completed: p.onboarding_completed,
        profiles: {
          id: p.id,
          display_name: p.display_name,
          work_email: p.work_email,
          photo_url: p.photo_url,
          job_title_name: p.job_title_name || null,
        },
        teams: p.user_id ? (teamsByUserId[p.user_id] || []) : [],
      })) as BuUser[];
    },
    enabled: isReady && !!buId,
  });

  return {
    users,
    isLoading,
  };
}
