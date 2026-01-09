-- ============================================
-- Add birth_day and birth_month to v_bu_active_profiles
-- ============================================

DROP VIEW IF EXISTS public.v_user_directory_health;
DROP VIEW IF EXISTS public.v_bu_active_profiles;

CREATE VIEW public.v_bu_active_profiles
WITH (security_invoker = true)
AS
-- 1) Primary BU row (always present, even if user_id is NULL)
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
  p.birth_day,
  p.birth_month,
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
  p.birth_day,
  p.birth_month,
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
'Canonical BU-scoped user directory view.

REGRA INQUEBRÁVEL: Esta view NUNCA depende de bu_user_memberships 
para INCLUIR profiles. Memberships são usados apenas para:
- Validar acesso ao Hub
- Determinar BUs adicionais para usuários logados (UNION ALL secundário)
- has_bu_membership é APENAS informativo

CRITÉRIOS DE EXCLUSÃO (únicos):
- employment_status = terminated
- deleted_at IS NOT NULL

INCLUSÃO (sempre):
- Profiles com user_id NULL (nunca logaram)
- Profiles sem bu_user_membership
- Profiles com onboarding_completed = false

Referência: TCR v2.11.0 + DEVELOPMENT_STANDARDS.md - User Directory Global';

-- Recreate health view
CREATE OR REPLACE VIEW public.v_user_directory_health
WITH (security_invoker = true)
AS
SELECT
  p.bu_id,
  b.name AS bu_name,
  COUNT(*) AS total_profiles,
  COUNT(*) FILTER (WHERE p.user_id IS NULL) AS profiles_without_user_id,
  COUNT(*) FILTER (WHERE p.employment_status = 'terminated') AS profiles_terminated,
  COUNT(*) FILTER (WHERE p.deleted_at IS NOT NULL) AS profiles_deleted,
  COUNT(*) FILTER (WHERE p.onboarding_completed = false) AS profiles_pending_onboarding,
  COUNT(*) FILTER (
    WHERE p.employment_status != 'terminated' 
      AND p.deleted_at IS NULL
  ) AS profiles_active_visible,
  COUNT(*) FILTER (
    WHERE p.employment_status != 'terminated' 
      AND p.deleted_at IS NULL 
      AND p.user_id IS NULL
  ) AS profiles_visible_without_login,
  (SELECT COUNT(*) 
   FROM public.v_bu_active_profiles v 
   WHERE v.bu_id = p.bu_id
  ) AS directory_visible_count
FROM public.profiles p
LEFT JOIN public.bu_units b ON b.id = p.bu_id
WHERE p.bu_id IS NOT NULL
GROUP BY p.bu_id, b.name;

COMMENT ON VIEW public.v_user_directory_health IS
'Health check view for User Directory.';