-- =============================================================================
-- FASE 2: Remoção de Índices Não Utilizados (conservador)
-- =============================================================================

-- Índices com 0 scans que são claramente redundantes
-- (mantendo índices de constraints unique e os que podem ser usados por RLS)

-- 1. idx_cron_execution_logs_status_ran (448 kB, 0 scans) - maior economia
DROP INDEX IF EXISTS public.idx_cron_execution_logs_status_ran;

-- 2. idx_audit_logs_entity (32 kB, 0 scans)
DROP INDEX IF EXISTS public.idx_audit_logs_entity;

-- 3. job_titles_bu_ids_gin (24 kB, 0 scans) - GIN em array raramente usado
DROP INDEX IF EXISTS public.job_titles_bu_ids_gin;

-- 4. idx_okr_objective_contributors_team (16 kB, 0 scans) - redundante
DROP INDEX IF EXISTS public.idx_okr_objective_contributors_team;

-- 5. idx_asset_movements_asset_occurred (16 kB, 0 scans)
DROP INDEX IF EXISTS public.idx_asset_movements_asset_occurred;

-- 6. idx_okr_audit_log_entity (16 kB, 0 scans)
DROP INDEX IF EXISTS public.idx_okr_audit_log_entity;

-- 7. idx_asset_keyrings_claviculary (16 kB, 0 scans)
DROP INDEX IF EXISTS public.idx_asset_keyrings_claviculary;

-- 8. idx_squad_teams_team_id (16 kB, 0 scans)
DROP INDEX IF EXISTS public.idx_squad_teams_team_id;

-- 9. idx_okr_checkins_team_id (16 kB, 0 scans)
DROP INDEX IF EXISTS public.idx_okr_checkins_team_id;

-- 10. idx_asset_inventory_loaned_user (16 kB, 0 scans)
DROP INDEX IF EXISTS public.idx_asset_inventory_loaned_user;

-- 11. idx_okr_checkins_kr (16 kB, 0 scans) - provavelmente redundante com compound
DROP INDEX IF EXISTS public.idx_okr_checkins_kr;

-- 12. idx_audit_logs_user_id (16 kB, 0 scans)
DROP INDEX IF EXISTS public.idx_audit_logs_user_id;

-- 13. idx_ai_agent_documents_agent (16 kB, 0 scans)
DROP INDEX IF EXISTS public.idx_ai_agent_documents_agent;

-- 14. idx_okr_checkins_date (16 kB, 0 scans)
DROP INDEX IF EXISTS public.idx_okr_checkins_date;

-- 15. idx_asset_movements_bu_date (16 kB, 0 scans)
DROP INDEX IF EXISTS public.idx_asset_movements_bu_date;