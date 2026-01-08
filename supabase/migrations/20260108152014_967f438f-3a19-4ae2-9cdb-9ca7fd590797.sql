-- Wave 4: Limpeza de tabelas e colunas legadas
-- Data: 2026-01-08

-- ============================================================
-- 1. DROP tabela metrics (OBSOLETE, 0 registros)
-- ============================================================
DROP TABLE IF EXISTS public.metrics CASCADE;

-- ============================================================
-- 2. DROP tabela user_notification_preferences (LEGACY, 0 registros)
-- Substituída por user_notification_preferences_v2
-- ============================================================
DROP TABLE IF EXISTS public.user_notification_preferences CASCADE;

-- ============================================================
-- 3. DROP coluna profiles.job_title (texto legado)
-- Substituída por FK job_title_id → job_titles
-- ============================================================
ALTER TABLE public.profiles DROP COLUMN IF EXISTS job_title;

-- ============================================================
-- NOTA: squad_memberships NÃO removida
-- Motivo: Ainda possui dependências ativas em:
--   - src/modules/teams/hooks/useSquads.ts
--   - src/hooks/usePublicProfile.ts
-- Ação: Avaliar migração para user_team_memberships em Wave futura
-- ============================================================

COMMENT ON TABLE public.job_titles IS 'Tabela normalizada de cargos por BU. Substitui profiles.job_title (texto).';
COMMENT ON COLUMN public.profiles.job_title_id IS 'FK para job_titles. Substituiu campo job_title (texto) em Wave 3.';