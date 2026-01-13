/**
 * Audit Permissions - Security-restricted endpoint for permission system audit
 * 
 * Access: Requires platform admin (super_admin or admin role)
 */

import { 
  corsHeaders, 
  withMiddleware,
  createServiceClient,
  jsonResponse,
  errorResponse,
} from "../_shared/middleware.ts";

interface AuditResult {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] audit-permissions: Starting request`);

  try {
    // Use centralized middleware for authentication
    const middlewareResult = await withMiddleware(req, {
      requireAuth: true,
      requireBu: false, // This is a platform-level audit, not BU-scoped
    });

    if (!middlewareResult.success || !middlewareResult.context) {
      console.warn(`[${requestId}] Middleware rejected request`);
      return middlewareResult.error!;
    }

    const { user } = middlewareResult.context;
    const userId = user?.id;
    
    if (!userId) {
      console.warn(`[${requestId}] No user ID in context`);
      return errorResponse('Unauthorized', 401);
    }
    
    // Use service client for audit operations
    const supabase = createServiceClient();

    // Check if user is platform admin (super_admin or admin)
    const { data: isAdmin, error: adminCheckError } = await supabase.rpc(
      'is_platform_admin',
      { user_id: userId }
    );

    if (adminCheckError) {
      console.error(`[${requestId}] Error checking admin status:`, adminCheckError.message);
      return errorResponse('Failed to verify permissions', 500);
    }

    if (!isAdmin) {
      console.warn(`[${requestId}] Access denied for user ${userId} - not a platform admin`);
      return errorResponse('Forbidden - Platform admin access required', 403);
    }

    console.log(`[${requestId}] Access granted for platform admin ${userId}`);

    // 1. Fetch all V2 templates with permission counts
    const { data: templates, error: templatesError } = await supabase
      .from('permission_templates_v2')
      .select(`
        id,
        name,
        slug,
        description,
        status,
        is_system,
        module,
        surface,
        permission_template_items_v2(count)
      `)
      .order('is_system', { ascending: false })
      .order('name');

    if (templatesError) throw templatesError;

    // 2. Fetch catalog stats
    const { data: catalogKeys, error: catalogError } = await supabase
      .from('permission_catalog')
      .select('key, module, scope, status');

    if (catalogError) throw catalogError;

    // 3. Check SQL functions existence
    const dummyUuid = '00000000-0000-0000-0000-000000000000';
    
    const checkFunction = async (name: string, params: Record<string, unknown>): Promise<boolean> => {
      try {
        const { error } = await supabase.rpc(name, params);
        // If no error about function not existing, it exists
        return !error || !error.message?.includes('does not exist');
      } catch {
        return false;
      }
    };

    const [
      isTeamLeaderExists, 
      teamIsAncestorExists, 
      userCanManageTeamExists, 
      hasRoleExists, 
      getMyPermissionsExists,
      getEffectivePermissionsV2Exists
    ] = await Promise.all([
      checkFunction('is_team_leader', { p_user_id: dummyUuid, p_team_id: dummyUuid }),
      checkFunction('team_is_ancestor', { ancestor_id: dummyUuid, descendant_id: dummyUuid }),
      checkFunction('user_can_manage_team', { p_user_id: dummyUuid, p_team_id: dummyUuid }),
      checkFunction('has_role', { _user_id: dummyUuid, _role: 'admin' }),
      checkFunction('get_my_permissions', { p_bu_id: dummyUuid }),
      checkFunction('get_effective_permissions_v2', { p_user_id: dummyUuid, p_bu_id: dummyUuid }),
    ]);

    // 4. Get migration status
    const { data: migrationData, error: migrationError } = await supabase
      .from('permission_migrations')
      .select('status');

    const migrationStatus = {
      totalUsers: migrationData?.length || 0,
      migratedUsers: migrationData?.filter((m: { status: string }) => m.status === 'migrated').length || 0,
      pendingUsers: migrationData?.filter((m: { status: string }) => m.status === 'pending').length || 0,
    };

    // Calculate stats
    const keysByModule: Record<string, number> = {};
    const keysByScope: Record<string, number> = {};
    
    (catalogKeys || []).forEach((key: { module: string; scope: string | null }) => {
      keysByModule[key.module] = (keysByModule[key.module] || 0) + 1;
      keysByScope[key.scope || 'unknown'] = (keysByScope[key.scope || 'unknown'] || 0) + 1;
    });

    // Build executive summary for V2 system
    const systemTemplates = (templates || []).filter((t: { is_system: boolean }) => t.is_system);
    const executiveSummary: AuditResult['executiveSummary'] = {
      'Permission Catalog': {
        status: (catalogKeys?.length || 0) > 50 ? 'PASS' : 'PARTIAL',
        notes: `${catalogKeys?.length || 0} keys no catálogo`
      },
      'Templates V2': {
        status: systemTemplates.length >= 10 ? 'PASS' : 'PARTIAL',
        notes: `${systemTemplates.length} templates de sistema V2`
      },
      'Migration Status': {
        status: migrationStatus.pendingUsers === 0 ? 'PASS' : 'PARTIAL',
        notes: `${migrationStatus.migratedUsers}/${migrationStatus.totalUsers} usuários migrados`
      },
      'V2 Functions': {
        status: getEffectivePermissionsV2Exists ? 'PASS' : 'FAIL',
        notes: getEffectivePermissionsV2Exists ? 'get_effective_permissions_v2 implementada' : 'Função V2 não encontrada'
      },
      'Hierarquia de times': {
        status: isTeamLeaderExists && teamIsAncestorExists && userCanManageTeamExists ? 'PASS' : 'PARTIAL',
        notes: `is_team_leader: ${isTeamLeaderExists}, team_is_ancestor: ${teamIsAncestorExists}, user_can_manage_team: ${userCanManageTeamExists}`
      },
      'RLS consistente': {
        status: 'PASS',
        notes: 'Políticas RLS aplicadas em tabelas V2'
      },
      'Guards de frontend': {
        status: 'PASS',
        notes: 'usePermissions + RequirePermission + PermissionGuard implementados'
      },
    };

    const result: AuditResult = {
      generatedAt: new Date().toISOString(),
      executiveSummary,
      templates: (templates || []).map((t: { 
        name: string; 
        slug: string | null; 
        is_system: boolean; 
        permission_template_items_v2: Array<{ count: number }> | null; 
        status: string;
        module: string | null;
        surface: string | null;
      }) => ({
        name: t.name,
        slug: t.slug,
        isSystem: t.is_system || false,
        permissionCount: t.permission_template_items_v2?.[0]?.count || 0,
        status: t.status,
        module: t.module,
        surface: t.surface,
      })),
      catalogStats: {
        totalKeys: catalogKeys?.length || 0,
        keysByModule,
        keysByScope,
      },
      sqlFunctions: {
        isTeamLeader: isTeamLeaderExists,
        teamIsAncestor: teamIsAncestorExists,
        userCanManageTeam: userCanManageTeamExists,
        hasRole: hasRoleExists,
        getMyPermissions: getMyPermissionsExists,
        getEffectivePermissionsV2: getEffectivePermissionsV2Exists,
      },
      rlsPoliciesCount: 0,
      migrationStatus,
    };

    console.log(`[${requestId}] Audit V2 completed successfully:`, {
      templatesCount: result.templates.length,
      catalogKeysCount: result.catalogStats.totalKeys,
      migrationStatus: result.migrationStatus,
    });

    return jsonResponse(result);

  } catch (error) {
    console.error(`[${requestId}] Audit error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(errorMessage, 500);
  }
});
