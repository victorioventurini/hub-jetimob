/**
 * Operational Tables Registry
 * 
 * Tabelas que contêm dados de negócio com escopo de BU.
 * Qualquer acesso a essas tabelas DEVE usar useBuScopedSupabase().
 * 
 * O client global só pode acessar tabelas de infraestrutura/auth.
 */

/**
 * Tabelas operacionais - DEVEM usar useBuScopedSupabase()
 * Qualquer acesso via client global a essas tabelas é proibido.
 */
export const OPERATIONAL_TABLES: readonly string[] = [
  // OKRs
  'okr_org_objectives',
  'okr_org_key_results',
  'okr_team_objectives',
  'okr_team_key_results',
  'okr_checkins',
  'okr_insights',
  'okr_comments',
  'okr_links',
  'okr_initiatives',
  'okr_health_snapshots',
  
  // KPIs
  'kpis',
  'kpi_values',
  'kpi_targets',
  
  // Teams & Structure
  'teams',
  'squads',
  'squad_members',
  
  // Assets
  'asset_inventory',
  'asset_categories',
  'asset_movements',
  'asset_keyrings',
  'asset_keys',
  'asset_key_movements',
  'asset_clavicularies',
  'asset_hooks',
  'asset_groups',
  'asset_group_items',
  'asset_gift_items',
  'asset_gift_batches',
  'asset_gift_movements',
  'asset_permissions',
  
  // Tickets
  'tickets',
  'ticket_messages',
  'ticket_attachments',
  'ticket_mentions',
  'ticket_participants',
  'ticket_categories',
  'ticket_subcategories',
  
  // Partners
  'partner_companies',
  'partner_contacts',
  
  // Notifications
  'notifications',
  'user_notification_preferences',
  'bu_notification_channels',
  
  // Cycles
  'cycles',
  
  // BU Config
  'bu_locations',
  'bu_module_configs',
  'bu_integrations_config',
  'bu_ia_config',
  'bu_agent_activations',
  'bu_permission_group_configs',
  'bu_user_permission_groups',
  'bu_user_permission_overrides',
  
  // AI Agents
  'ai_agents',
  'ai_agent_documents',
  'ai_agent_logs',
  
  // Automations
  'automation_connections',
  'automation_connection_events',
  'automation_incoming_tokens',
  'automation_logs',
] as const;

/**
 * Tabelas de infraestrutura/auth - podem usar client global
 * Essas tabelas não dependem de bu_id ou são acessadas antes de haver BU.
 */
export const INFRASTRUCTURE_TABLES: readonly string[] = [
  // Auth & Profiles (user-scoped, não BU-scoped)
  'profiles',
  'user_roles',
  'bu_user_memberships',
  
  // BU Units (lista de BUs disponíveis)
  'bu_units',
  
  // Catalogs (read-only, globais)
  'modules',
  'permission_catalog',
  'permission_groups',
  'permission_group_permissions',
  'notification_events',
  'notification_channels',
  'hub_integrations_catalog',
  'hub_integrations_global_config',
  'automation_event_catalog',
  'automation_action_catalog',
  
  // Audit (write-only, sistema)
  'audit_logs',
  'app_error_logs',
] as const;

/**
 * Verifica se uma tabela é operacional (requer BU scope)
 */
export function isOperationalTable(tableName: string): boolean {
  return OPERATIONAL_TABLES.includes(tableName as typeof OPERATIONAL_TABLES[number]);
}

/**
 * Verifica se uma tabela é de infraestrutura (permite client global)
 */
export function isInfrastructureTable(tableName: string): boolean {
  return INFRASTRUCTURE_TABLES.includes(tableName as typeof INFRASTRUCTURE_TABLES[number]);
}

/**
 * Valida se o acesso a uma tabela via client global é permitido.
 * Lança erro em dev se tentar acessar tabela operacional.
 */
export function assertGlobalClientAllowed(
  tableName: string, 
  context: string = 'unknown'
): void {
  if (isOperationalTable(tableName)) {
    const errorMsg = `[BU_SCOPE_VIOLATION] Tabela operacional "${tableName}" acessada via client global em "${context}". Use useBuScopedSupabase().`;
    
    if (import.meta.env.DEV) {
      console.error(errorMsg);
      // Em dev, lançar erro para falhar rápido
      throw new Error(errorMsg);
    } else {
      // Em prod, apenas logar (não quebrar a aplicação)
      console.warn(errorMsg);
    }
  }
}

/**
 * Lista de arquivos com exceções justificadas para uso do client global
 */
export const ALLOWED_GLOBAL_CLIENT_FILES = [
  'src/hooks/useAuth.tsx',
  'src/components/notifications/NotificationCenter.tsx',
  'src/modules/bu/hooks/useBuData.ts', // checkEmailDomainAllowed
  'src/integrations/supabase/client.ts',
  'src/integrations/supabase/useBuScopedSupabase.ts',
] as const;
