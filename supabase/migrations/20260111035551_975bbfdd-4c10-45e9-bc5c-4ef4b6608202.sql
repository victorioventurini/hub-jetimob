
-- Wave 1: Security Fix - Convert SECURITY DEFINER views to SECURITY INVOKER
-- This migration recreates views with proper security settings

-- ============================================================================
-- 1. v_bu_memberships_active
-- Core view used by many other views - must be fixed first
-- ============================================================================
DROP VIEW IF EXISTS v_bu_active_profiles CASCADE;
DROP VIEW IF EXISTS v_bu_memberships_active CASCADE;

CREATE VIEW v_bu_memberships_active 
WITH (security_invoker = on) AS
SELECT 
  m.id AS membership_id,
  m.profile_id,
  m.bu_id,
  m.role_in_bu,
  m.is_default,
  m.created_at AS membership_created_at,
  p.user_id,
  p.display_name,
  p.first_name,
  p.last_name,
  p.email,
  p.work_email,
  p.photo_url,
  p.team_id,
  t.name AS team_name,
  p.job_title_id,
  jt.name AS job_title_name,
  p.employment_status,
  p.onboarding_completed,
  p.global_status,
  p.user_type,
  p.start_date,
  p.birth_day,
  p.birth_month,
  p.created_at AS profile_created_at,
  bu.name AS bu_name
FROM bu_user_memberships m
JOIN profiles p ON (m.profile_id = p.id)
JOIN bu_units bu ON (m.bu_id = bu.id)
LEFT JOIN teams t ON (p.team_id = t.id)
LEFT JOIN job_titles jt ON (p.job_title_id = jt.id)
WHERE m.deleted_at IS NULL 
  AND p.deleted_at IS NULL 
  AND p.global_status = 'active'
  AND p.employment_status <> 'terminated';

-- ============================================================================
-- 2. v_bu_active_profiles (depends on v_bu_memberships_active)
-- ============================================================================
CREATE VIEW v_bu_active_profiles 
WITH (security_invoker = on) AS
SELECT 
  profile_id AS id,
  user_id,
  display_name,
  first_name,
  last_name,
  email,
  work_email,
  photo_url,
  team_id,
  team_name,
  job_title_id,
  job_title_name,
  employment_status,
  onboarding_completed,
  global_status,
  user_type,
  bu_id,
  role_in_bu,
  is_default,
  start_date,
  birth_day,
  birth_month,
  profile_created_at AS created_at,
  true AS has_bu_membership
FROM v_bu_memberships_active m;

-- ============================================================================
-- 3. v_bu_id_null_report (diagnostic view - admin only)
-- ============================================================================
DROP VIEW IF EXISTS v_bu_id_null_report CASCADE;

CREATE VIEW v_bu_id_null_report 
WITH (security_invoker = on) AS
SELECT 'okr_org_objectives'::text AS table_name,
    count(*) FILTER (WHERE bu_id IS NULL) AS count_null,
    count(*) AS total
FROM okr_org_objectives
UNION ALL
SELECT 'okr_org_key_results'::text AS table_name,
    count(*) FILTER (WHERE bu_id IS NULL) AS count_null,
    count(*) AS total
FROM okr_org_key_results
UNION ALL
SELECT 'okr_team_objectives'::text AS table_name,
    count(*) FILTER (WHERE bu_id IS NULL) AS count_null,
    count(*) AS total
FROM okr_team_objectives
UNION ALL
SELECT 'okr_team_key_results'::text AS table_name,
    count(*) FILTER (WHERE bu_id IS NULL) AS count_null,
    count(*) AS total
FROM okr_team_key_results
UNION ALL
SELECT 'okr_checkins'::text AS table_name,
    count(*) FILTER (WHERE bu_id IS NULL) AS count_null,
    count(*) AS total
FROM okr_checkins
UNION ALL
SELECT 'okr_initiatives'::text AS table_name,
    count(*) FILTER (WHERE bu_id IS NULL) AS count_null,
    count(*) AS total
FROM okr_initiatives
UNION ALL
SELECT 'teams'::text AS table_name,
    count(*) FILTER (WHERE bu_id IS NULL) AS count_null,
    count(*) AS total
FROM teams
UNION ALL
SELECT 'squads'::text AS table_name,
    count(*) FILTER (WHERE bu_id IS NULL) AS count_null,
    count(*) AS total
FROM squads
UNION ALL
SELECT 'asset_inventory'::text AS table_name,
    count(*) FILTER (WHERE bu_id IS NULL) AS count_null,
    count(*) AS total
FROM asset_inventory
UNION ALL
SELECT 'tickets'::text AS table_name,
    count(*) FILTER (WHERE bu_id IS NULL) AS count_null,
    count(*) AS total
FROM tickets
UNION ALL
SELECT 'kpi_metrics'::text AS table_name,
    count(*) FILTER (WHERE bu_id IS NULL) AS count_null,
    count(*) AS total
FROM kpi_metrics;

-- ============================================================================
-- 4. v_perf_indexes_report (diagnostic view - admin only)
-- ============================================================================
DROP VIEW IF EXISTS v_perf_indexes_report CASCADE;

CREATE VIEW v_perf_indexes_report 
WITH (security_invoker = on) AS
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename = ANY (ARRAY[
    'profiles', 'teams', 'tickets', 'ticket_messages', 'ticket_categories',
    'okr_org_objectives', 'okr_team_objectives', 'okr_team_key_results', 
    'okr_checkins', 'kpi_metrics', 'kpi_values', 'asset_inventory',
    'asset_movements', 'asset_keyrings', 'asset_key_movements',
    'notifications', 'notification_outbox'
  ])
ORDER BY tablename, indexname;

-- ============================================================================
-- 5. v_permission_risk_report (admin security view)
-- ============================================================================
DROP VIEW IF EXISTS v_permission_risk_report CASCADE;

CREATE VIEW v_permission_risk_report 
WITH (security_invoker = on) AS
WITH user_template_counts AS (
  SELECT 
    ut.user_id,
    ut.bu_id,
    count(DISTINCT ut.template_id) AS template_count,
    count(DISTINCT ti.permission_key) AS permission_count,
    bool_or(pt.slug LIKE '%admin%') AS has_admin_template,
    bool_or(pt.slug LIKE '%operator%' OR pt.slug LIKE '%manager%') AS has_operator_template
  FROM bu_user_permission_templates_v2 ut
  JOIN permission_templates_v2 pt ON pt.id = ut.template_id
  JOIN permission_template_items_v2 ti ON ti.template_id = pt.id
  GROUP BY ut.user_id, ut.bu_id
),
disabled_module_access AS (
  SELECT 
    ut.user_id,
    ut.bu_id,
    array_agg(DISTINCT pt.module) AS modules_with_access
  FROM bu_user_permission_templates_v2 ut
  JOIN permission_templates_v2 pt ON pt.id = ut.template_id
  WHERE pt.module IS NOT NULL 
    AND pt.module NOT IN (
      SELECT m.slug
      FROM bu_module_configs bmc
      JOIN modules m ON m.id = bmc.module_id
      WHERE bmc.bu_id = ut.bu_id AND bmc.is_enabled = true
    )
  GROUP BY ut.user_id, ut.bu_id
)
SELECT 
  utc.user_id,
  utc.bu_id,
  p.display_name AS user_name,
  p.work_email AS user_email,
  utc.template_count,
  utc.permission_count,
  CASE
    WHEN utc.has_admin_template AND utc.has_operator_template THEN 'high'
    WHEN utc.permission_count > 50 THEN 'medium'
    WHEN dma.modules_with_access IS NOT NULL THEN 'medium'
    ELSE 'low'
  END AS risk_level,
  array_remove(ARRAY[
    CASE WHEN utc.has_admin_template AND utc.has_operator_template 
         THEN 'Admin + operator templates redundantes' ELSE NULL END,
    CASE WHEN utc.permission_count > 50 
         THEN 'Alto número de permissões (' || utc.permission_count || ')' ELSE NULL END,
    CASE WHEN dma.modules_with_access IS NOT NULL 
         THEN 'Acesso a módulos desabilitados: ' || array_to_string(dma.modules_with_access, ', ') ELSE NULL END
  ], NULL) AS risk_reasons
FROM user_template_counts utc
JOIN profiles p ON p.id = utc.user_id
LEFT JOIN disabled_module_access dma ON dma.user_id = utc.user_id AND dma.bu_id = utc.bu_id
WHERE (utc.has_admin_template AND utc.has_operator_template)
   OR utc.permission_count > 50
   OR dma.modules_with_access IS NOT NULL;

-- ============================================================================
-- 6. v_permissions_without_explanation (catalog diagnostic)
-- ============================================================================
DROP VIEW IF EXISTS v_permissions_without_explanation CASCADE;

CREATE VIEW v_permissions_without_explanation 
WITH (security_invoker = on) AS
SELECT 
  pc.key AS permission_key,
  pc.module,
  pc.resource,
  pc.action,
  pc.status
FROM permission_catalog pc
LEFT JOIN permission_template_items_v2 ti ON ti.permission_key = pc.key
WHERE ti.permission_key IS NULL 
  AND pc.status = 'active';

-- ============================================================================
-- 7. v_users_without_templates (admin security view)
-- ============================================================================
DROP VIEW IF EXISTS v_users_without_templates CASCADE;

CREATE VIEW v_users_without_templates 
WITH (security_invoker = on) AS
SELECT 
  m.profile_id,
  m.bu_id,
  p.display_name,
  p.work_email,
  m.role_in_bu,
  m.created_at AS membership_created_at
FROM bu_user_memberships m
JOIN profiles p ON p.id = m.profile_id
LEFT JOIN bu_user_permission_templates_v2 t ON t.user_id = m.profile_id AND t.bu_id = m.bu_id
WHERE m.deleted_at IS NULL 
  AND t.id IS NULL 
  AND m.role_in_bu NOT IN ('super_admin', 'admin');

-- ============================================================================
-- Grant SELECT on views to authenticated users
-- ============================================================================
GRANT SELECT ON v_bu_memberships_active TO authenticated;
GRANT SELECT ON v_bu_active_profiles TO authenticated;
GRANT SELECT ON v_bu_id_null_report TO authenticated;
GRANT SELECT ON v_perf_indexes_report TO authenticated;
GRANT SELECT ON v_permission_risk_report TO authenticated;
GRANT SELECT ON v_permissions_without_explanation TO authenticated;
GRANT SELECT ON v_users_without_templates TO authenticated;
