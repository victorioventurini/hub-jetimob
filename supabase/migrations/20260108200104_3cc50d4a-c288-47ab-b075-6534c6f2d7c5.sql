-- ==========================================
-- USER DIRECTORY GLOBAL: Canonical View
-- ==========================================
-- Creates v_bu_active_profiles view for standardized user listing
-- Rule: Show ALL registered users EXCEPT terminated/deleted
-- Does NOT filter by: onboarding_completed, auth.users, membership
-- ==========================================

-- Drop if exists to allow recreation
DROP VIEW IF EXISTS v_bu_active_profiles;

-- Create canonical view for active profiles
CREATE VIEW v_bu_active_profiles AS
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
  -- Computed fields
  COALESCE(jt.name, NULL) as job_title_name,
  COALESCE(t.name, NULL) as team_name,
  -- Has active membership in BU (for badge display only, not filtering)
  EXISTS (
    SELECT 1 FROM bu_user_memberships m 
    WHERE m.user_id = p.user_id AND m.bu_id = p.bu_id
  ) as has_bu_membership
FROM profiles p
LEFT JOIN job_titles jt ON jt.id = p.job_title_id
LEFT JOIN teams t ON t.id = p.team_id
WHERE 
  -- Only non-terminated users
  p.employment_status != 'terminated'
  -- And not soft-deleted
  AND p.deleted_at IS NULL;

COMMENT ON VIEW v_bu_active_profiles IS 'Canonical source for user listings. Shows ALL registered users except terminated/deleted. Does NOT filter by onboarding status or membership.';

-- Create index for performance on profiles employment_status queries
CREATE INDEX IF NOT EXISTS idx_profiles_employment_bu 
ON profiles(bu_id, employment_status) 
WHERE deleted_at IS NULL;

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'USER_DIRECTORY: v_bu_active_profiles view created successfully';
END;
$$;