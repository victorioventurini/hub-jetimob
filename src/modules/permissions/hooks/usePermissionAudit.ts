import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";

export interface AuditResult {
  generatedAt: string;
  executiveSummary: Record<string, { status: 'PASS' | 'FAIL' | 'PARTIAL'; notes: string }>;
  templates: Array<{
    name: string;
    slug: string | null;
    isSystem: boolean;
    permissionCount: number;
    status: string;
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
  };
  rlsPoliciesCount: number;
  expectedTemplates: Array<{
    name: string;
    exists: boolean;
    slug: string | null;
  }>;
}

export function usePermissionAudit() {
  const { client: supabase, isReady, buId } = useOptionalBuClient();
  
  return useQuery({
    queryKey: ['permission-audit', buId],
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
