-- ============================================================
-- Performance Wave P3.2 — Remoção de Índices Não Utilizados
-- ============================================================
-- Baseado em análise de pg_stat_user_indexes com 0 scans

-- 1. idx_ai_agent_logs_user_bu_created (8.5MB, 0 scans)
-- Substituído por idx_ai_agent_logs_bu_created e idx_ai_agent_logs_agent_created
DROP INDEX IF EXISTS idx_ai_agent_logs_user_bu_created;

-- 2. idx_profiles_employment_status (16KB, 0 scans)
DROP INDEX IF EXISTS idx_profiles_employment_status;

-- 3. idx_teams_status (16KB, 0 scans)
DROP INDEX IF EXISTS idx_teams_status;