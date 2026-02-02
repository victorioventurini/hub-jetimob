-- =====================================================
-- Security Fix: Remove sensitive fields from profile views
-- 
-- Issue: v_bu_active_profiles and v_profiles_directory 
-- expose sensitive PII (personal contact info) to all BU members
--
-- Solution: Remove sensitive columns from views.
-- Sensitive data is only accessible via get_profile_with_privacy() RPC
-- which enforces field-level security (own profile only)
-- =====================================================

-- Drop and recreate v_bu_active_profiles without sensitive contact fields
DROP VIEW IF EXISTS v_bu_active_profiles;

CREATE VIEW v_bu_active_profiles
WITH (security_invoker = on)
AS
-- Profiles with active BU membership
SELECT 
  p.id,
  p.user_id,
  p.first_name,
  p.last_name,
  p.display_name,
  p.work_email,
  p.photo_url,
  p.team_id,
  COALESCE(m.job_title_id, p.job_title_id) AS job_title_id,
  p.employment_status,
  p.onboarding_completed,
  p.start_date,
  p.created_at,
  m.bu_id,
  COALESCE(jt_membership.name, jt_profile.name) AS job_title_name,
  COALESCE(t.name, NULL::text) AS team_name,
  true AS has_bu_membership,
  p.birth_day,
  p.birth_month,
  p.user_type,
  p.work_mode,
  p.city,
  p.state,
  p.manager_user_id
  -- REMOVED: whatsapp_personal, instagram_id, discord_id
  -- These are now ONLY accessible via get_profile_with_privacy() RPC
FROM profiles p
JOIN bu_user_memberships m ON m.user_id = p.user_id AND m.deleted_at IS NULL
LEFT JOIN job_titles jt_membership ON jt_membership.id = m.job_title_id
LEFT JOIN job_titles jt_profile ON jt_profile.id = p.job_title_id
LEFT JOIN teams t ON t.id = p.team_id AND t.bu_id = m.bu_id
WHERE p.employment_status <> 'terminated'::employment_status 
  AND p.deleted_at IS NULL

UNION ALL

-- Profiles with BU but no membership (legacy/pre-registered)
SELECT 
  p.id,
  p.user_id,
  p.first_name,
  p.last_name,
  p.display_name,
  p.work_email,
  p.photo_url,
  p.team_id,
  p.job_title_id,
  p.employment_status,
  p.onboarding_completed,
  p.start_date,
  p.created_at,
  p.bu_id,
  jt.name AS job_title_name,
  t.name AS team_name,
  false AS has_bu_membership,
  p.birth_day,
  p.birth_month,
  p.user_type,
  p.work_mode,
  p.city,
  p.state,
  p.manager_user_id
  -- REMOVED: whatsapp_personal, instagram_id, discord_id
FROM profiles p
LEFT JOIN job_titles jt ON jt.id = p.job_title_id
LEFT JOIN teams t ON t.id = p.team_id AND t.bu_id = p.bu_id
WHERE p.employment_status <> 'terminated'::employment_status 
  AND p.deleted_at IS NULL 
  AND p.bu_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM bu_user_memberships m 
    WHERE m.user_id = p.user_id AND m.deleted_at IS NULL
  );

-- Drop and recreate v_profiles_directory without personal email
DROP VIEW IF EXISTS v_profiles_directory;

CREATE VIEW v_profiles_directory
WITH (security_invoker = on)
AS
SELECT 
  p.id,
  p.user_id,
  p.display_name,
  p.first_name,
  p.last_name,
  -- REMOVED: p.email (personal email) - only work_email exposed
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
  p.bu_id AS primary_bu_id,
  p.start_date,
  p.created_at,
  EXISTS (
    SELECT 1 FROM bu_user_memberships m 
    WHERE m.profile_id = p.id AND m.deleted_at IS NULL
  ) AS has_any_active_membership
FROM profiles p
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN job_titles jt ON p.job_title_id = jt.id
WHERE p.deleted_at IS NULL;

-- Add comment documenting security decision
COMMENT ON VIEW v_bu_active_profiles IS 
'Profile view for BU members. SECURITY: Excludes sensitive contact fields (whatsapp, instagram, discord). 
Use get_profile_with_privacy() RPC for full profile data with field-level security.';

COMMENT ON VIEW v_profiles_directory IS 
'Directory view for profiles. SECURITY: Excludes personal email. Only work_email is exposed.
Use get_profile_with_privacy() RPC for full profile data with field-level security.';