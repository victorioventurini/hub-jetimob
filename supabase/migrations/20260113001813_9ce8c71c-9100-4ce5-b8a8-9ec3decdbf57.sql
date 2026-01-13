
-- Drop and recreate v_bu_active_profiles to include profiles without memberships
-- Using UNION: memberships + profiles without memberships

DROP VIEW IF EXISTS v_bu_active_profiles;

CREATE VIEW v_bu_active_profiles 
WITH (security_invoker = true) 
AS
-- 1) Profiles WITH active memberships
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
    TRUE AS has_bu_membership,
    p.birth_day,
    p.birth_month,
    p.user_type,
    p.work_mode,
    p.city,
    p.state,
    p.manager_user_id,
    p.whatsapp_personal,
    p.instagram_id,
    p.discord_id
FROM profiles p
INNER JOIN bu_user_memberships m ON m.user_id = p.user_id AND m.deleted_at IS NULL
LEFT JOIN job_titles jt_membership ON jt_membership.id = m.job_title_id
LEFT JOIN job_titles jt_profile ON jt_profile.id = p.job_title_id
LEFT JOIN teams t ON t.id = p.team_id AND t.bu_id = m.bu_id
WHERE p.employment_status <> 'terminated' 
  AND p.deleted_at IS NULL

UNION ALL

-- 2) Profiles WITHOUT memberships (using profiles.bu_id as fallback)
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
    FALSE AS has_bu_membership,
    p.birth_day,
    p.birth_month,
    p.user_type,
    p.work_mode,
    p.city,
    p.state,
    p.manager_user_id,
    p.whatsapp_personal,
    p.instagram_id,
    p.discord_id
FROM profiles p
LEFT JOIN job_titles jt ON jt.id = p.job_title_id
LEFT JOIN teams t ON t.id = p.team_id AND t.bu_id = p.bu_id
WHERE p.employment_status <> 'terminated' 
  AND p.deleted_at IS NULL
  AND p.bu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM bu_user_memberships m 
    WHERE m.user_id = p.user_id AND m.deleted_at IS NULL
  );

COMMENT ON VIEW v_bu_active_profiles IS 'View de perfis ativos com ou sem membership em BUs. Inclui: 1) Profiles com membership ativa (job_title prioriza membership), 2) Profiles sem membership usando profiles.bu_id como fallback.';
