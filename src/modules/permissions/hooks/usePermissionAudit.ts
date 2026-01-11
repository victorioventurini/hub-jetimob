import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
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
  const { client: supabase, isReady, buId } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.permissions.audit(buId ?? null),
    queryFn: async (): Promise<AuditResult> => {
      if (!supabase || !isReady) {
        throw new Error("No BU client available");
      }
      
      const { data, error } = await supabase.functions.invoke('audit-permissions');
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data as AuditResult;
    },
    enabled: isReady,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
