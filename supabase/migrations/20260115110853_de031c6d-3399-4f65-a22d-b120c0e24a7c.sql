-- ============================================================
-- Performance Wave P3.1 — Índices para Redução de Seq Scans
-- ============================================================

-- 1. okr_wizard_sessions - queries por bu_id e status
CREATE INDEX IF NOT EXISTS idx_okr_wizard_sessions_bu_status 
ON public.okr_wizard_sessions (bu_id, status);

-- 2. okr_wizard_sessions - queries por bu_id e created_at (ordenação)
CREATE INDEX IF NOT EXISTS idx_okr_wizard_sessions_bu_created
ON public.okr_wizard_sessions (bu_id, created_at DESC);

-- 3. permission_template_items_v2 - queries por template_id
CREATE INDEX IF NOT EXISTS idx_permission_template_items_v2_template
ON public.permission_template_items_v2 (template_id);

-- 4. permission_template_items_v2 - queries por permission_key
CREATE INDEX IF NOT EXISTS idx_permission_template_items_v2_pkey
ON public.permission_template_items_v2 (permission_key);

-- 5. ai_agent_logs - índice por bu_id e created_at
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_bu_created
ON public.ai_agent_logs (bu_id, created_at DESC);

-- 6. ai_agent_logs - queries por agent_id
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_agent_created
ON public.ai_agent_logs (agent_id, created_at DESC);

-- Comentários
COMMENT ON INDEX idx_okr_wizard_sessions_bu_status IS 'P3.1: Queries por BU e status no wizard';
COMMENT ON INDEX idx_okr_wizard_sessions_bu_created IS 'P3.1: Listagem ordenada por data';
COMMENT ON INDEX idx_permission_template_items_v2_template IS 'P3.1: Joins por template_id';
COMMENT ON INDEX idx_permission_template_items_v2_pkey IS 'P3.1: Lookups por permission_key';
COMMENT ON INDEX idx_ai_agent_logs_bu_created IS 'P3.1: Logs de AI por BU';
COMMENT ON INDEX idx_ai_agent_logs_agent_created IS 'P3.1: Logs por agente';