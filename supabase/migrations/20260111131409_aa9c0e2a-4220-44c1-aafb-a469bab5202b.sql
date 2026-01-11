-- ============================================================
-- FIX: Recreate views with SECURITY INVOKER
-- Fixes linter error: Security Definer View
-- ============================================================

-- Drop and recreate v_ai_agents_public with SECURITY INVOKER
DROP VIEW IF EXISTS v_ai_agents_public;

CREATE VIEW v_ai_agents_public 
WITH (security_invoker = true)
AS
SELECT id,
    name,
    slug,
    description,
    scope,
    bu_id,
    is_active,
    output_format,
    created_at,
    updated_at
FROM ai_agents a
WHERE (is_platform_admin(auth.uid()) OR ((scope = 'bu'::agent_scope) AND is_profile_bu_member(my_profile_id(), bu_id)) OR ((scope = 'global'::agent_scope) AND (is_active = true)));

COMMENT ON VIEW v_ai_agents_public IS 'Public view of AI agents. Uses SECURITY INVOKER to respect RLS.';

-- Drop and recreate v_profiles_directory with SECURITY INVOKER
DROP VIEW IF EXISTS v_profiles_directory;

CREATE VIEW v_profiles_directory
WITH (security_invoker = true)
AS
SELECT p.id,
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
    p.bu_id AS primary_bu_id,
    p.start_date,
    p.created_at,
    (EXISTS ( SELECT 1
           FROM bu_user_memberships m
          WHERE ((m.profile_id = p.id) AND (m.deleted_at IS NULL)))) AS has_any_active_membership
FROM ((profiles p
     LEFT JOIN teams t ON ((p.team_id = t.id)))
     LEFT JOIN job_titles jt ON ((p.job_title_id = jt.id)))
WHERE (p.deleted_at IS NULL);

COMMENT ON VIEW v_profiles_directory IS 'Directory view of profiles. Uses SECURITY INVOKER to respect RLS.';