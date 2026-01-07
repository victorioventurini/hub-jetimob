import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { queryKeys } from "@/lib/queryKeys";

export interface BuUser {
  user_id: string;
  role_in_bu: string;
  profiles: {
    id: string;
    display_name: string;
    work_email: string;
    photo_url: string | null;
    job_title: string | null;
  };
  teams: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export function useBuUsers() {
  const { client: supabase, buId, isReady } = useOptionalBuClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: queryKeys.permissions.buUsers(buId),
    queryFn: async () => {
      if (!supabase || !buId) return [];

      // Fetch memberships
      const { data: memberships, error: membershipError } = await supabase
        .from("bu_user_memberships")
        .select("user_id, role_in_bu")
        .eq("bu_id", buId);

      if (membershipError) throw membershipError;

      const userIds = memberships.map((m) => m.user_id);
      if (userIds.length === 0) return [];

      // Fetch profiles
      const { data: profilesRaw, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, work_email, photo_url, job_title")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      type ProfileRow = {
        id: string;
        user_id: string | null;
        display_name: string;
        work_email: string;
        photo_url: string | null;
        job_title: string | null;
      };

      const profiles = (profilesRaw ?? []) as ProfileRow[];
      const profilesByUserId: Record<string, ProfileRow> = {};

      for (const p of profiles) {
        if (p.user_id) profilesByUserId[p.user_id] = p;
      }

      return memberships
        .map((m) => ({
          user_id: m.user_id,
          role_in_bu: m.role_in_bu,
          profiles: profilesByUserId[m.user_id],
          teams: [], // Teams will be loaded separately if needed
        }))
        .filter((m) => m.profiles) as BuUser[];
    },
    enabled: isReady && !!buId,
  });

  return {
    users,
    isLoading,
  };
}
