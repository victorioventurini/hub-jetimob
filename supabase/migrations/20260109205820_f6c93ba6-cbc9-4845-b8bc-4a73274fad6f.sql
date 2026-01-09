-- ============================================
-- WAVE 3: Identity Unification v2.2 - Views (Corrigido)
-- ============================================

-- 1. View de Diretório: v_profiles_directory
DROP VIEW IF EXISTS v_profiles_directory CASCADE;
CREATE VIEW v_profiles_directory AS
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
  t.name as team_name,
  p.job_title_id,
  jt.name as job_title_name,
  p.employment_status,
  p.onboarding_completed,
  p.global_status,
  p.user_type,
  p.bu_id as primary_bu_id,
  p.start_date,
  p.created_at,
  EXISTS (
    SELECT 1 FROM bu_user_memberships m 
    WHERE m.profile_id = p.id AND m.deleted_at IS NULL
  ) as has_any_active_membership
FROM profiles p
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN job_titles jt ON p.job_title_id = jt.id
WHERE p.deleted_at IS NULL;

COMMENT ON VIEW v_profiles_directory IS 'View de diretório: profiles base sem dados de membership.';

-- 2. View de Acesso: v_bu_memberships_active
DROP VIEW IF EXISTS v_bu_memberships_active CASCADE;
CREATE VIEW v_bu_memberships_active AS
SELECT 
  m.id as membership_id,
  m.profile_id,
  m.bu_id,
  m.role_in_bu,
  m.is_default,
  m.created_at as membership_created_at,
  p.user_id,
  p.display_name,
  p.first_name,
  p.last_name,
  p.email,
  p.work_email,
  p.photo_url,
  p.team_id,
  t.name as team_name,
  p.employment_status,
  p.onboarding_completed,
  p.global_status,
  p.user_type,
  bu.name as bu_name
FROM bu_user_memberships m
JOIN profiles p ON m.profile_id = p.id
JOIN bu_units bu ON m.bu_id = bu.id
LEFT JOIN teams t ON p.team_id = t.id
WHERE m.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.global_status = 'active'
  AND p.employment_status != 'terminated';

COMMENT ON VIEW v_bu_memberships_active IS 'View de acesso: memberships ativos por BU.';

-- 3. View Admin: v_bu_all_profiles_admin
DROP VIEW IF EXISTS v_bu_all_profiles_admin CASCADE;
CREATE VIEW v_bu_all_profiles_admin AS
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
  t.name as team_name,
  p.job_title_id,
  jt.name as job_title_name,
  p.employment_status,
  p.onboarding_completed,
  p.global_status,
  p.user_type,
  p.bu_id as primary_bu_id,
  p.deleted_at as profile_deleted_at,
  p.start_date,
  p.created_at,
  CASE 
    WHEN p.deleted_at IS NOT NULL THEN 'deleted'
    WHEN p.global_status = 'blocked' THEN 'blocked'
    WHEN p.global_status = 'suspended' THEN 'suspended'
    WHEN p.employment_status = 'terminated' THEN 'terminated'
    WHEN p.employment_status = 'vacation' THEN 'on_leave'
    WHEN NOT COALESCE(p.onboarding_completed, false) THEN 'pending_onboarding'
    ELSE 'active'
  END as computed_status,
  (
    SELECT COUNT(*) FROM bu_user_memberships m 
    WHERE m.profile_id = p.id AND m.deleted_at IS NULL
  ) as active_membership_count,
  (
    SELECT jsonb_agg(jsonb_build_object(
      'bu_id', m.bu_id,
      'bu_name', bu2.name,
      'role_in_bu', m.role_in_bu,
      'is_default', m.is_default
    ))
    FROM bu_user_memberships m
    JOIN bu_units bu2 ON m.bu_id = bu2.id
    WHERE m.profile_id = p.id AND m.deleted_at IS NULL
  ) as active_memberships
FROM profiles p
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN job_titles jt ON p.job_title_id = jt.id;

COMMENT ON VIEW v_bu_all_profiles_admin IS 'View admin: TODOS os profiles. computed_status é DERIVADO.';

-- 4. View operacional (compatibilidade): v_bu_active_profiles
DROP VIEW IF EXISTS v_bu_active_profiles CASCADE;
CREATE VIEW v_bu_active_profiles AS
SELECT 
  m.profile_id as id,
  m.user_id,
  m.display_name,
  m.first_name,
  m.last_name,
  m.email,
  m.work_email,
  m.photo_url,
  m.team_id,
  m.team_name,
  m.employment_status,
  m.onboarding_completed,
  m.global_status,
  m.user_type,
  m.bu_id,
  m.role_in_bu,
  m.is_default,
  true as has_bu_membership
FROM v_bu_memberships_active m;

COMMENT ON VIEW v_bu_active_profiles IS 'View operacional para compatibilidade.';