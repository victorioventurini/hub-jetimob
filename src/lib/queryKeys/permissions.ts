/**
 * Permissions Query Keys
 */
export const permissionsKeys = {
  // Global catalog
  catalog: () => ['permissions', 'catalog'] as const,
  groups: () => ['permissions', 'groups'] as const,
  groupPermissions: (groupId: string | null) => 
    ['permissions', 'group-permissions', groupId] as const,
  
  // V2: Aliases
  aliases: () => ['permissions', 'aliases'] as const,
  
  // V2: Templates
  templatesV2: () => ['permissions', 'templates-v2'] as const,
  templateItemsV2: (templateId: string | null) => 
    ['permissions', 'template-items-v2', templateId] as const,
  
  // V2: User assignments
  userTemplatesV2: (buId: string | null, userId: string | null) => 
    ['permissions', 'user-templates-v2', buId, userId] as const,
  
  // V2: Effective preview
  effectivePreview: (buId: string | null, userId: string | null, mode: string) => 
    ['permissions', 'effective-preview', buId, userId, mode] as const,
  
  // BU-scoped
  buConfigs: (buId: string | null) => 
    ['permissions', 'bu-configs', buId] as const,
  buUsers: (buId: string | null) => 
    ['permissions', 'bu-users', buId] as const,
  userGroups: (buId: string | null, userId: string | null) => 
    ['permissions', 'user-groups', buId, userId] as const,
  userOverrides: (buId: string | null, userId: string | null) => 
    ['permissions', 'user-overrides', buId, userId] as const,
  userEffective: (buId: string | null, userId: string | null) => 
    ['permissions', 'user-effective', buId, userId] as const,
  
  // Migration tracking (Wave 7)
  migrationStatus: (buId: string | null) => 
    ['permissions', 'migration-status', buId] as const,
  userMigration: (buId: string | null, userId: string | null) => 
    ['permissions', 'user-migration', buId, userId] as const,
  
  // Current user
  myPermissions: (buId: string | null, userId: string | null) => 
    ['permissions', 'my', buId, userId] as const,
  
  // Audit
  audit: (buId: string | null) => 
    ['permissions', 'audit', buId] as const,
} as const;
