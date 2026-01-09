
-- Fix v_bu_active_profiles to include users via bu_user_memberships
-- This ensures users who have membership in a BU appear in that BU's user list
-- even if their profiles.bu_id points to a different (primary) BU

DROP VIEW IF EXISTS v_bu_active_profiles;

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
    m.bu_id,  -- BU from membership, not profiles.bu_id
    COALESCE(jt.name, NULL::text) AS job_title_name,
    COALESCE(t.name, NULL::text) AS team_name,
    TRUE AS has_bu_membership  -- Always true since we join on memberships
FROM profiles p
INNER JOIN bu_user_memberships m ON m.user_id = p.user_id
LEFT JOIN job_titles jt ON jt.id = p.job_title_id AND jt.bu_id = m.bu_id
LEFT JOIN teams t ON t.id = p.team_id AND t.bu_id = m.bu_id
WHERE p.employment_status <> 'terminated'::employment_status 
  AND p.deleted_at IS NULL;

COMMENT ON VIEW v_bu_active_profiles IS 
'Active profiles per BU based on bu_user_memberships. 
A user appears in each BU they have membership in, not just their primary profiles.bu_id.';
