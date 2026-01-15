-- ==============================================================
-- WAVE P5.1 — Índices Críticos de Performance
-- Impacto estimado: -16M sequential scans
-- ==============================================================

-- 1. user_roles — 11.7M seq scans, 0% idx (MAIOR IMPACTO)
-- Usado por has_role() e RLS policies
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
ON public.user_roles(user_id, role);

-- 2. profiles — 7.5M seq scans, 4% idx (SEGUNDO MAIOR IMPACTO)
-- Usado por my_profile_id(), is_profile_bu_member() e queries BU-scoped
CREATE INDEX IF NOT EXISTS idx_profiles_bu_active 
ON public.profiles(bu_id) 
WHERE deleted_at IS NULL;

-- 3. ai_agent_documents — 63K seq scans, 0% idx
-- Queries por agent_id
CREATE INDEX IF NOT EXISTS idx_ai_agent_documents_agent 
ON public.ai_agent_documents(agent_id);

-- 4. bu_locations — 132K seq scans, 10% idx
-- Filtro frequente por bu_id
CREATE INDEX IF NOT EXISTS idx_bu_locations_bu 
ON public.bu_locations(bu_id) 
WHERE deleted_at IS NULL;

-- 5. asset_movements — 197K seq scans, 6.5% idx
-- Histórico por asset e por BU
CREATE INDEX IF NOT EXISTS idx_asset_movements_asset 
ON public.asset_movements(asset_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_asset_movements_bu_date 
ON public.asset_movements(bu_id, occurred_at DESC);