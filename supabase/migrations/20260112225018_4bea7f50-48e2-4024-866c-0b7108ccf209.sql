-- ============================================
-- Adicionar job_title_id opcional em bu_user_memberships
-- Permite cargo diferente por BU, com fallback para profiles.job_title_id
-- ============================================

-- 1. Adicionar coluna opcional
ALTER TABLE bu_user_memberships
ADD COLUMN job_title_id UUID REFERENCES job_titles(id) ON DELETE SET NULL;

-- 2. Índice para FK
CREATE INDEX idx_bu_user_memberships_job_title_id 
ON bu_user_memberships(job_title_id);

-- 3. Comentário explicativo
COMMENT ON COLUMN bu_user_memberships.job_title_id IS 
'Cargo específico nesta BU. Se NULL, usa profiles.job_title_id como fallback.';

-- 4. Atualizar view v_bu_active_profiles para usar COALESCE
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
    -- Prioriza job_title da membership, fallback para profile
    COALESCE(m.job_title_id, p.job_title_id) AS job_title_id,
    p.employment_status,
    p.onboarding_completed,
    p.start_date,
    p.created_at,
    m.bu_id,
    -- Job title name: busca primeiro da membership, depois do profile
    COALESCE(jt_membership.name, jt_profile.name) AS job_title_name,
    COALESCE(t.name, NULL::text) AS team_name,
    TRUE AS has_bu_membership
FROM profiles p
INNER JOIN bu_user_memberships m ON m.user_id = p.user_id AND m.deleted_at IS NULL
LEFT JOIN job_titles jt_membership ON jt_membership.id = m.job_title_id
LEFT JOIN job_titles jt_profile ON jt_profile.id = p.job_title_id
LEFT JOIN teams t ON t.id = p.team_id AND t.bu_id = m.bu_id
WHERE p.employment_status <> 'terminated'::employment_status 
  AND p.deleted_at IS NULL;

-- 5. Comentário na view
COMMENT ON VIEW v_bu_active_profiles IS 
'View de perfis ativos com membership em BUs. job_title_id usa COALESCE: prioriza cargo da membership, fallback para cargo do profile.';

-- 6. Função helper para obter cargo do usuário em uma BU específica
CREATE OR REPLACE FUNCTION get_user_job_title_in_bu(
  p_profile_id UUID,
  p_bu_id UUID
) RETURNS TABLE(job_title_id UUID, job_title_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(m.job_title_id, p.job_title_id) AS job_title_id,
    COALESCE(jt_m.name, jt_p.name) AS job_title_name
  FROM profiles p
  LEFT JOIN bu_user_memberships m ON m.profile_id = p.id 
    AND m.bu_id = p_bu_id 
    AND m.deleted_at IS NULL
  LEFT JOIN job_titles jt_m ON jt_m.id = m.job_title_id
  LEFT JOIN job_titles jt_p ON jt_p.id = p.job_title_id
  WHERE p.id = p_profile_id;
$$;

COMMENT ON FUNCTION get_user_job_title_in_bu IS 
'Retorna o cargo efetivo de um usuário em uma BU. Prioriza cargo da membership, fallback para cargo do profile.';