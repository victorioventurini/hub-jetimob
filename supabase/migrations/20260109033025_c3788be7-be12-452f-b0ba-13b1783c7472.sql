-- ============================================
-- User Directory Global v2 - Health View
-- ============================================

-- 1) Update comment on canonical view
COMMENT ON VIEW public.v_bu_active_profiles IS
'Canonical BU-scoped user directory view.

REGRA INQUEBRÁVEL: Esta view NUNCA deve depender de bu_user_memberships 
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

-- 2) Create health check view
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
'Health check view for User Directory.

Use para validar que:
- directory_visible_count >= profiles_active_visible
- profiles_visible_without_login > 0 significa usuários sem login estão aparecendo
- profiles_terminated e profiles_deleted não estão em directory_visible_count

Referência: docs/USER_DIRECTORY_GLOBAL_V2_REPORT.md';