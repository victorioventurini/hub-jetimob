-- ============================================
-- WAVE 3: Atualização das views com colunas faltantes
-- ============================================

-- Recriar v_bu_memberships_active com todas as colunas necessárias
DROP VIEW IF EXISTS v_bu_active_profiles CASCADE;
DROP VIEW IF EXISTS v_bu_memberships_active CASCADE;

CREATE VIEW v_bu_memberships_active AS
SELECT 
  m.id as membership_id,
  m.profile_id,
  m.bu_id,
  m.role_in_bu,
  m.is_default,
  m.created_at as membership_created_at,
  -- Profile data
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
  p.start_date,
  p.birth_day,
  p.birth_month,
  p.created_at as profile_created_at,
  -- BU data
  bu.name as bu_name
FROM bu_user_memberships m
JOIN profiles p ON m.profile_id = p.id
JOIN bu_units bu ON m.bu_id = bu.id
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN job_titles jt ON p.job_title_id = jt.id
WHERE m.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.global_status = 'active'
  AND p.employment_status != 'terminated';

COMMENT ON VIEW v_bu_memberships_active IS 'View de acesso: memberships ativos por BU.';

-- Recriar v_bu_active_profiles (compatibilidade) com TODAS as colunas
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
  m.job_title_id,
  m.job_title_name,
  m.employment_status,
  m.onboarding_completed,
  m.global_status,
  m.user_type,
  m.bu_id,
  m.role_in_bu,
  m.is_default,
  m.start_date,
  m.birth_day,
  m.birth_month,
  m.profile_created_at as created_at,
  true as has_bu_membership
FROM v_bu_memberships_active m;

COMMENT ON VIEW v_bu_active_profiles IS 'View operacional para compatibilidade.';