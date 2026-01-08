-- Wave 8: DROP V1 Permission Tables
-- IMPORTANT: Only run after all users are migrated to V2

-- First drop dependent tables (with foreign keys pointing to permission_groups)
DROP TABLE IF EXISTS bu_user_permission_groups CASCADE;
DROP TABLE IF EXISTS bu_permission_group_configs CASCADE;
DROP TABLE IF EXISTS permission_group_permissions CASCADE;

-- Then drop the main table
DROP TABLE IF EXISTS permission_groups CASCADE;

-- Add comment to track migration
COMMENT ON TABLE permission_templates_v2 IS 'V2 permission templates - migrated from permission_groups on 2025-01-08';