import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";

interface BuUser {
  user_id: string;
  role_in_bu: string;
  profiles: {
    id: string;
    display_name: string;
    work_email: string;
    photo_url: string | null;
  };
}

export function useBuUsers() {
  const { currentBuId } = useBu();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["bu_users_permissions", currentBuId],
    queryFn: async () => {
      if (!currentBuId) return [];

      const { data, error } = await supabase
        .from("bu_user_memberships")
        .select(`
          user_id,
          role_in_bu
        `)
        .eq("bu_id", currentBuId);

      if (error) throw error;

      // Fetch profiles separately - use user_id column from profiles to match auth user
      const userIds = data.map((m) => m.user_id);
      if (userIds.length === 0) return [];

      const { data: profilesRaw, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, work_email, photo_url")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      type ProfileRow = {
        id: string;
        user_id: string | null;
        display_name: string;
        work_email: string;
        photo_url: string | null;
      };

      const profiles = (profilesRaw ?? []) as ProfileRow[];
      const profilesByUserId: Record<string, ProfileRow> = {};

      for (const p of profiles) {
        if (p.user_id) profilesByUserId[p.user_id] = p;
      }

      return data
        .map((m) => ({
          user_id: m.user_id,
          role_in_bu: m.role_in_bu,
          profiles: profilesByUserId[m.user_id],
        }))
        .filter((m) => m.profiles) as BuUser[];
    },
    enabled: !!currentBuId,
  });

  return {
    users,
    isLoading,
  };
}
