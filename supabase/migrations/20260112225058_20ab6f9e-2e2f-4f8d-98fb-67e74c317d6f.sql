-- Corrigir view v_bu_active_profiles para incluir todas as colunas necessárias
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
    TRUE AS has_bu_membership,
    -- Colunas adicionais que estavam faltando
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
WHERE p.employment_status <> 'terminated'::employment_status 
  AND p.deleted_at IS NULL;

COMMENT ON VIEW v_bu_active_profiles IS 
'View de perfis ativos com membership em BUs. job_title_id usa COALESCE: prioriza cargo da membership, fallback para cargo do profile.';