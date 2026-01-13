import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

export interface ProfileOption {
  id: string;
  user_id: string | null;
  full_name: string;
  avatar_url: string | null;
  work_email: string | null;
  onboarding_completed?: boolean;
  has_bu_membership?: boolean;
}

/**
 * Hook for loading profiles in Assets module.
 * Uses canonical v_bu_active_profiles view.
 * 
 * Shows ALL registered users in the BU (not just those who logged in).
 * Only excludes terminated users.
 */
export function useAssetProfiles() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: queryKeys.profiles.buProfiles(buId ?? null),
    enabled: !!buId,
    staleTime: 5 * 60 * 1000, // 5 minutes - profiles change rarely
    queryFn: async () => {
      // Use canonical view - shows ALL registered users, not just active/logged-in
      // Exclude external users - they should only be visible in tickets module
      const { data, error } = await supabase
        .from("v_bu_active_profiles")
        .select("id, user_id, display_name, first_name, last_name, photo_url, work_email, onboarding_completed, has_bu_membership, user_type")
        .eq("bu_id", buId!)
        .eq("user_type", "internal")
        .order("display_name");

      if (error) throw error;

      return (data || []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Sem nome",
        avatar_url: p.photo_url,
        work_email: p.work_email,
        onboarding_completed: p.onboarding_completed,
        has_bu_membership: p.has_bu_membership,
      })) as ProfileOption[];
    },
  });

  return {
    profiles,
    isLoading,
  };
}
