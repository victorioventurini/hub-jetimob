// Permissions module hooks barrel export

// Permission Catalog
export { usePermissionCatalog } from "./usePermissionCatalog";

// BU Permissions
export { 
  useBuUserOverrides,
  useUserEffectivePermissions 
} from "./useBuPermissions";

// BU Users
export { useBuUsers, type BuUser } from "./useBuUsers";

// Permissions V2
export { 
  usePermissionTemplatesV2,
  useTemplateItemsV2,
  useUserTemplatesV2,
  useEffectivePermissionsV2,
  type PermissionTemplateV2,
} from "./usePermissionsV2";

// Governance
export {
  usePermissionPresets,
  usePresetItems,
  usePermissionDiff,
  usePermissionExplanation,
  usePermissionRiskReport,
  usePermissionAuditLogs,
  useLogPermissionChange,
  useUsersWithoutTemplates,
  type PermissionDiff,
  type PermissionPreset,
} from "./usePermissionGovernance";

// Audit
export { usePermissionAudit } from "./usePermissionAudit";

// Migration
export { useMigrationActions, useBuMigrationStatus } from "./useMigrationTracking";

// Revoke
export { useRevokeBuAccess } from "./useRevokeBuAccess";
