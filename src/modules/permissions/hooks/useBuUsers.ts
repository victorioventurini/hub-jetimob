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
          role_in_bu,
          profiles:user_id(
            id,
            display_name,
            work_email,
            photo_url
          )
        `)
        .eq("bu_id", currentBuId);

      if (error) throw error;
      return data as unknown as BuUser[];
    },
    enabled: !!currentBuId,
  });

  return {
    users,
    isLoading,
  };
}
