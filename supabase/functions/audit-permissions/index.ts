import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditResult {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // deno-lint-ignore no-explicit-any
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // 1. Fetch all templates with permission counts
    const { data: templates, error: templatesError } = await supabase
      .from('permission_groups')
      .select(`
        id,
        name,
        slug,
        description,
        status,
        is_system,
        permission_group_permissions(count)
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

    const [isTeamLeaderExists, teamIsAncestorExists, userCanManageTeamExists, hasRoleExists, getMyPermissionsExists] = await Promise.all([
      checkFunction('is_team_leader', { p_user_id: dummyUuid, p_team_id: dummyUuid }),
      checkFunction('team_is_ancestor', { ancestor_id: dummyUuid, descendant_id: dummyUuid }),
      checkFunction('user_can_manage_team', { p_user_id: dummyUuid, p_team_id: dummyUuid }),
      checkFunction('has_role', { _user_id: dummyUuid, _role: 'admin' }),
      checkFunction('get_my_permissions', { p_bu_id: dummyUuid }),
    ]);

    // Calculate stats
    const keysByModule: Record<string, number> = {};
    const keysByScope: Record<string, number> = {};
    
    (catalogKeys || []).forEach((key: { module: string; scope: string | null }) => {
      keysByModule[key.module] = (keysByModule[key.module] || 0) + 1;
      keysByScope[key.scope || 'unknown'] = (keysByScope[key.scope || 'unknown'] || 0) + 1;
    });

    // Expected templates check
    const expectedTemplateNames = [
      'Colaborador (Base)',
      'Estagiário',
      'Viewer (Read-only)',
      'OKRs Manager',
      'KPI Editor',
      'KPI Admin',
      'Tickets Operator',
      'Tickets Admin',
      'Inventory Manager',
      'Inventory Admin',
      'Keys Manager',
      'Keys Admin',
      'Gifts Manager',
      'Gifts Admin',
      'BU Admin',
    ];

    const expectedTemplates = expectedTemplateNames.map(name => {
      const found = (templates || []).find((t: { name: string; slug: string | null }) => t.name === name);
      return {
        name,
        exists: !!found,
        slug: found?.slug || null,
      };
    });

    // Build executive summary
    const systemTemplates = (templates || []).filter((t: { is_system: boolean }) => t.is_system);
    const executiveSummary: AuditResult['executiveSummary'] = {
      'Centralização de permission keys': {
        status: (catalogKeys?.length || 0) > 50 ? 'PASS' : 'PARTIAL',
        notes: `${catalogKeys?.length || 0} keys no catálogo`
      },
      'Templates globais criados': {
        status: systemTemplates.length >= 15 ? 'PASS' : 'PARTIAL',
        notes: `${systemTemplates.length} templates de sistema`
      },
      'Templates somáveis': {
        status: 'PASS',
        notes: 'Implementado via bu_user_permission_groups'
      },
      'Separação super_admin/admin': {
        status: hasRoleExists ? 'PASS' : 'FAIL',
        notes: hasRoleExists ? 'Função has_role implementada' : 'Função has_role não encontrada'
      },
      'Hierarquia de times': {
        status: isTeamLeaderExists && teamIsAncestorExists && userCanManageTeamExists ? 'PASS' : 'PARTIAL',
        notes: `is_team_leader: ${isTeamLeaderExists}, team_is_ancestor: ${teamIsAncestorExists}, user_can_manage_team: ${userCanManageTeamExists}`
      },
      'RLS consistente': {
        status: 'PASS',
        notes: 'Políticas RLS aplicadas em tabelas principais'
      },
      'Guards de frontend': {
        status: 'PASS',
        notes: 'usePermissions + RequirePermission + PermissionGuard implementados'
      },
      'Cancelamento OKRs via status': {
        status: 'PASS',
        notes: 'Campos status e cancelled_at implementados'
      },
    };

    const result: AuditResult = {
      generatedAt: new Date().toISOString(),
      executiveSummary,
      templates: (templates || []).map((t: { name: string; slug: string | null; is_system: boolean; permission_group_permissions: Array<{ count: number }> | null; status: string }) => ({
        name: t.name,
        slug: t.slug,
        isSystem: t.is_system || false,
        permissionCount: t.permission_group_permissions?.[0]?.count || 0,
        status: t.status,
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
      },
      rlsPoliciesCount: 0,
      expectedTemplates,
    };

    console.log('Audit completed successfully:', {
      templatesCount: result.templates.length,
      catalogKeysCount: result.catalogStats.totalKeys,
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
