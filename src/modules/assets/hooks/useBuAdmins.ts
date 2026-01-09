import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

export interface BuAdminOption {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

/**
 * Hook for loading BU admins (super_admin and admin only).
 * Used for fields that require admin authorization like write_off.
 */
export function useBuAdmins() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  const { data: admins = [], isLoading } = useQuery({
    queryKey: [...queryKeys.profiles.buProfiles(buId ?? null), 'admins'],
    enabled: !!buId,
    queryFn: async () => {
      // Fetch memberships for admin roles using profile_id (Identity Cutover v3.0)
      const { data: memberships, error: membershipError } = await supabase
        .from("bu_user_memberships")
        .select("profile_id, role_in_bu")
        .eq("bu_id", buId!)
        .in("role_in_bu", ["super_admin", "admin"]);

      if (membershipError) throw membershipError;
      if (!memberships || memberships.length === 0) return [];

      const adminProfileIds = memberships
        .map(m => m.profile_id)
        .filter((id): id is string => !!id);
      const roleMap = new Map(
        memberships
          .filter(m => m.profile_id)
          .map(m => [m.profile_id!, m.role_in_bu])
      );

      // Fetch profiles for these admin users using profile_id
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, first_name, last_name, photo_url")
        .in("id", adminProfileIds);

      if (profileError) throw profileError;

      return (profiles || []).map((p) => ({
        id: p.id, // profile_id for domain columns
        user_id: p.user_id!,
        full_name: p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Sem nome",
        avatar_url: p.photo_url,
        role: roleMap.get(p.id) || "admin",
      })) as BuAdminOption[];
    },
  });

  return {
    admins,
    isLoading,
  };
}
