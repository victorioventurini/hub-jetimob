-- Fix v_bu_active_profiles: include profiles without user_id (never logged in)
-- and still support multi-BU membership expansion.
--
-- Canonical rules (docs/USER_DIRECTORY_GLOBAL_REPORT.md):
-- - Include all profiles in their primary BU (profiles.bu_id), even if user_id is NULL
-- - Exclude only terminated + deleted
-- - has_bu_membership is informative
-- - Expand to additional BUs via bu_user_memberships (when user_id exists)

DROP VIEW IF EXISTS public.v_bu_active_profiles;

CREATE VIEW public.v_bu_active_profiles
WITH (security_invoker = true)
AS
-- 1) Primary BU row (always present)
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
  EXISTS (
    SELECT 1
    FROM public.bu_user_memberships m
    WHERE m.user_id = p.user_id
      AND m.bu_id = p.bu_id
  ) AS has_bu_membership
FROM public.profiles p
LEFT JOIN public.job_titles jt
  ON jt.id = p.job_title_id
 AND jt.bu_id = p.bu_id
LEFT JOIN public.teams t
  ON t.id = p.team_id
 AND t.bu_id = p.bu_id
WHERE p.employment_status <> 'terminated'::public.employment_status
  AND p.deleted_at IS NULL

UNION ALL

-- 2) Additional BU memberships (non-primary BU)
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
  m.bu_id,
  jt.name AS job_title_name,
  t.name AS team_name,
  TRUE AS has_bu_membership
FROM public.profiles p
JOIN public.bu_user_memberships m
  ON m.user_id = p.user_id
LEFT JOIN public.job_titles jt
  ON jt.id = p.job_title_id
 AND jt.bu_id = m.bu_id
LEFT JOIN public.teams t
  ON t.id = p.team_id
 AND t.bu_id = m.bu_id
WHERE p.user_id IS NOT NULL
  AND m.bu_id <> p.bu_id
  AND p.employment_status <> 'terminated'::public.employment_status
  AND p.deleted_at IS NULL;

COMMENT ON VIEW public.v_bu_active_profiles IS
'Canonical BU-scoped user directory.
- Always includes profiles in their primary BU (profiles.bu_id), even if user_id is NULL (never logged in).
- Excludes only terminated and deleted profiles.
- Expands to additional BUs via bu_user_memberships (when user_id exists).
- has_bu_membership is informative.';
