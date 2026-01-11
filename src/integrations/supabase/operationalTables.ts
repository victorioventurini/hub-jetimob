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
export const OPERATIONAL_TABLES: string[] = [
  // OKRs
  "okr_org_objectives",
  "okr_org_key_results",
  "okr_team_objectives",
  "okr_team_key_results",
  "okr_contributions",
  "okr_kr_metrics",
  "okr_checkins",
  "okr_initiatives",
  "okr_insights",
  "okr_audit_log",

  // KPIs
  "kpi_metrics",
  "kpi_values",
  "kpi_thresholds",
  "kpi_alerts",

  // Teams / Org
  "teams",
  "user_team_memberships",
  "squads",
  "team_memberships",
  "squad_memberships",

  // BU operational config / locations
  "bu_locations",
  "bu_module_configs",
  "user_permission_assignments",
  "bu_role_templates",

  // Assets - Inventory
  "asset_inventory",
  "asset_movements",
  "asset_categories",
  "asset_groups",
  "asset_group_items",
  "asset_permissions",
  "asset_attachments",
  "asset_relationships",

  // Assets - Keys
  "asset_clavicularies",
  "asset_hooks",
  "asset_keyrings",
  "asset_keys",
  "asset_key_movements",

  // Assets - Gifts
  "asset_gift_items",
  "asset_gift_batches",
  "asset_gift_movements",

  // Tickets
  "tickets",
  "ticket_messages",
  "ticket_attachments",
  "ticket_categories",
  "ticket_subcategories",
  "ticket_routing_rules",
  "partner_companies",
  "partner_contacts",
  "partner_contact_skills",

  // Notifications & Mentions
  "notifications",
  "mentions",
  "notification_preferences",
  "notification_channels",
  "notification_endpoints",
  "notification_deliveries",

  // Automations / Integrations (if BU-scoped)
  "automation_connections",
  "integration_configs",
].filter(Boolean);

/**
 * Tabelas globais/meta - podem usar client global
 * Essas tabelas não dependem de bu_id ou são acessadas antes de haver BU.
 */
export const GLOBAL_META_TABLES: string[] = [
  "bu_units",
  "bu_user_memberships",
  "user_roles",
  "profiles",
  "modules",
  "permission_catalog",
].filter(Boolean);

/**
 * Verifica se uma tabela é operacional (requer BU scope)
 */
export function isOperationalTable(tableName: string): boolean {
  return OPERATIONAL_TABLES.includes(tableName);
}

/**
 * Verifica se uma tabela é global/meta (permite client global)
 */
export function isGlobalMetaTable(tableName: string): boolean {
  return GLOBAL_META_TABLES.includes(tableName);
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
      throw new Error(errorMsg);
    } else {
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
  'src/modules/bu/hooks/useBuData.ts',
  'src/integrations/supabase/client.ts',
  'src/integrations/supabase/useBuScopedSupabase.ts',
] as const;
