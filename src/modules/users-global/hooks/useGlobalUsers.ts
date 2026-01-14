// ============================================================
// USE GLOBAL USERS - Hook para listar todos usuários do sistema
// ============================================================
// PRE-BU: Usa cliente supabase global (não BU-scoped)
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import type { GlobalUser, GlobalUserFilters } from "../types";

export function useGlobalUsers(filters: GlobalUserFilters = {}) {
  const { q, buId, onboardingStatus, userType, includeTerminated = false } = filters;

  return useQuery({
    queryKey: queryKeys.users.globalList(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async (): Promise<GlobalUser[]> => {
      const { data, error } = await supabase.rpc("get_global_users_admin", {
        p_search: q || null,
        p_bu_id: buId || null,
        p_onboarding_status: onboardingStatus === "all" ? null : onboardingStatus || null,
        p_user_type: userType === "all" ? null : userType || null,
        p_include_terminated: includeTerminated,
      });

      if (error) throw error;

      // Parse bu_accesses from JSONB to array
      return (data || []).map((user: Record<string, unknown>) => ({
        ...user,
        bu_accesses: Array.isArray(user.bu_accesses)
          ? user.bu_accesses
          : JSON.parse(user.bu_accesses as string || "[]"),
      })) as GlobalUser[];
    },
  });
}
