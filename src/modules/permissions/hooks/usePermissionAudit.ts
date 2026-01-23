import { useQuery } from "@tanstack/react-query";
import { supabase as authSupabase } from "@/integrations/supabase/globalClient";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

export interface AuditResult {
  generatedAt: string;
  executiveSummary: Record<string, { status: 'PASS' | 'FAIL' | 'PARTIAL'; notes: string }>;
  templates: Array<{
    name: string;
    slug: string | null;
    isSystem: boolean;
    permissionCount: number;
    status: string;
    module: string | null;
    surface: string | null;
  }>;
  catalogStats: {
    totalKeys: number;
    keysByModule: Record<string, number>;
    keysByScope: Record<string, number>;
  };
  sqlFunctions: {
    isTeamLeader: boolean;
    teamIsAncestor: boolean;
    userCanManageTeam: boolean;
    hasRole: boolean;
    getMyPermissions: boolean;
    getEffectivePermissionsV2: boolean;
  };
  rlsPoliciesCount: number;
  migrationStatus: {
    totalUsers: number;
    migratedUsers: number;
    pendingUsers: number;
  };
}

export function usePermissionAudit() {
  const { currentBuId } = useBu();
  
  return useQuery({
    queryKey: queryKeys.permissions.audit(currentBuId ?? null),
    queryFn: async (): Promise<AuditResult> => {
      if (!currentBuId) {
        throw new Error("No BU selected");
      }
      
      // Get current session for auth token
      const { data: sessionData } = await authSupabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error("User not authenticated");
      }
      
      const { data, error } = await authSupabase.functions.invoke('audit-permissions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-current-bu-id': currentBuId,
        },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data as AuditResult;
    },
    enabled: !!currentBuId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
