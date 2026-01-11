
-- Migration: Add SECURITY INVOKER to critical views
-- This ensures views respect RLS policies of the querying user

-- 1. v_bu_memberships_active (base view for profiles)
DROP VIEW IF EXISTS public.v_bu_active_profiles CASCADE;
DROP VIEW IF EXISTS public.v_bu_memberships_active CASCADE;

CREATE VIEW public.v_bu_memberships_active
WITH (security_invoker = true)
AS
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
JOIN profiles p ON m.profile_id = p.id
JOIN bu_units bu ON m.bu_id = bu.id
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN job_titles jt ON p.job_title_id = jt.id
WHERE m.deleted_at IS NULL 
  AND p.deleted_at IS NULL 
  AND p.global_status = 'active'::text 
  AND p.employment_status <> 'terminated'::employment_status;

COMMENT ON VIEW public.v_bu_memberships_active IS 'Active BU memberships with profile data (SECURITY INVOKER)';
GRANT SELECT ON public.v_bu_memberships_active TO authenticated;

-- 2. v_bu_active_profiles (depends on v_bu_memberships_active)
CREATE VIEW public.v_bu_active_profiles
WITH (security_invoker = true)
AS
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

COMMENT ON VIEW public.v_bu_active_profiles IS 'Active profiles with BU membership (SECURITY INVOKER)';
GRANT SELECT ON public.v_bu_active_profiles TO authenticated;

-- 3. v_bu_all_profiles_admin
DROP VIEW IF EXISTS public.v_bu_all_profiles_admin;

CREATE VIEW public.v_bu_all_profiles_admin
WITH (security_invoker = true)
AS
SELECT 
    p.id,
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
    p.deleted_at AS profile_deleted_at,
    p.start_date,
    p.created_at,
    CASE
        WHEN p.deleted_at IS NOT NULL THEN 'deleted'::text
        WHEN p.global_status = 'blocked'::text THEN 'blocked'::text
        WHEN p.global_status = 'suspended'::text THEN 'suspended'::text
        WHEN p.employment_status = 'terminated'::employment_status THEN 'terminated'::text
        WHEN p.employment_status = 'vacation'::employment_status THEN 'on_leave'::text
        WHEN NOT COALESCE(p.onboarding_completed, false) THEN 'pending_onboarding'::text
        ELSE 'active'::text
    END AS computed_status,
    (SELECT count(*) FROM bu_user_memberships m WHERE m.profile_id = p.id AND m.deleted_at IS NULL) AS active_membership_count,
    (SELECT jsonb_agg(jsonb_build_object('bu_id', m.bu_id, 'bu_name', bu2.name, 'role_in_bu', m.role_in_bu, 'is_default', m.is_default))
     FROM bu_user_memberships m
     JOIN bu_units bu2 ON m.bu_id = bu2.id
     WHERE m.profile_id = p.id AND m.deleted_at IS NULL) AS active_memberships
FROM profiles p
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN job_titles jt ON p.job_title_id = jt.id;

COMMENT ON VIEW public.v_bu_all_profiles_admin IS 'All profiles for admin view (SECURITY INVOKER)';
GRANT SELECT ON public.v_bu_all_profiles_admin TO authenticated;
