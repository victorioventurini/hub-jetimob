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
      // Get all active profiles directly from bu_id (includes users who haven't logged in yet)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, first_name, last_name, display_name, photo_url, work_email")
        .eq("bu_id", buId!)
        .eq("employment_status", "active")
        .is("deleted_at", null)
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
