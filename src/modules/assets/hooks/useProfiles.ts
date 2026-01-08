import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

export interface ProfileOption {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  work_email: string | null;
}

export function useAssetProfiles() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: queryKeys.profiles.buProfiles(buId ?? null),
    enabled: !!buId,
    queryFn: async () => {
      // Get all users that belong to this BU
      const { data: memberships, error: membershipError } = await supabase
        .from("bu_user_memberships")
        .select("user_id")
        .eq("bu_id", buId!);

      if (membershipError) throw membershipError;

      const userIds = (memberships || []).map((m) => m.user_id);
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, first_name, last_name, display_name, photo_url, work_email")
        .in("user_id", userIds)
        .eq("employment_status", "active")
        .order("display_name");

      if (error) throw error;

      return (data || []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Sem nome",
        avatar_url: p.photo_url,
        work_email: p.work_email,
      })) as ProfileOption[];
    },
  });

  return {
    profiles,
    isLoading,
  };
}
