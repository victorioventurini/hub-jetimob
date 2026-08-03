UPDATE public.bu_user_memberships m
SET user_id = p.user_id
FROM public.profiles p
WHERE m.profile_id = p.id AND m.user_id IS NULL AND p.user_id IS NOT NULL;

CREATE OR REPLACE VIEW public.v_bu_active_profiles WITH (security_invoker = true) AS
 SELECT p.id,
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
    t.name AS team_name,
    true AS has_bu_membership,
    p.birth_day,
    p.birth_month,
    p.user_type,
    p.work_mode,
    p.city,
    p.state,
    p.manager_user_id
   FROM public.profiles p
     JOIN public.bu_user_memberships m ON m.profile_id = p.id AND m.deleted_at IS NULL
     LEFT JOIN public.job_titles jt_membership ON jt_membership.id = m.job_title_id
     LEFT JOIN public.job_titles jt_profile ON jt_profile.id = p.job_title_id
     LEFT JOIN public.teams t ON t.id = p.team_id AND t.bu_id = m.bu_id
  WHERE p.employment_status <> 'terminated'::employment_status AND p.deleted_at IS NULL
UNION ALL
 SELECT p.id,
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
   FROM public.profiles p
     LEFT JOIN public.job_titles jt ON jt.id = p.job_title_id
     LEFT JOIN public.teams t ON t.id = p.team_id AND t.bu_id = p.bu_id
  WHERE p.employment_status <> 'terminated'::employment_status AND p.deleted_at IS NULL AND p.bu_id IS NOT NULL AND NOT (EXISTS ( SELECT 1
           FROM public.bu_user_memberships m
          WHERE m.profile_id = p.id AND m.deleted_at IS NULL));