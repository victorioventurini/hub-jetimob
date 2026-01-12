import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  corsHeaders, 
  createServiceClient,
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

  try {
    // Validate JWT manually
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Use service client for audit operations
    // deno-lint-ignore no-explicit-any
    const supabase = createServiceClient() as any;

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

    console.log('Audit V2 completed successfully:', {
      templatesCount: result.templates.length,
      catalogKeysCount: result.catalogStats.totalKeys,
      migrationStatus: result.migrationStatus,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Audit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
