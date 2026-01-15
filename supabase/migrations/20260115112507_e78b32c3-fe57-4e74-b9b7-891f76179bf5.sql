-- ============================================================
-- Performance Wave P3.3 — Otimizações de Query OKR Wizard
-- ============================================================
-- Baseado em análise do TCR, DATA_MODEL_REGISTRY e código fonte
-- Problema: Índices P3.1 usavam bu_id, mas queries usam started_by

-- 1. Criar índice composto otimizado para o padrão REAL de queries
-- Hooks: useWizardSession, useWizardDraft, useGenericWizardDraft
-- Padrão: WHERE started_by = :profileId AND status = 'in_progress' AND wizard_type = :type
CREATE INDEX idx_okr_wizard_sessions_user_status_type 
ON public.okr_wizard_sessions (started_by, status, wizard_type)
WHERE status = 'in_progress';

COMMENT ON INDEX idx_okr_wizard_sessions_user_status_type 
IS 'P3.3: Queries por usuário, status e tipo de wizard - cobre padrão real do frontend';

-- 2. Remover índices não utilizados (0 scans confirmados)
-- idx_okr_wizard_sessions_bu_status: (bu_id, status) - 0 scans
DROP INDEX IF EXISTS idx_okr_wizard_sessions_bu_status;

-- idx_okr_wizard_sessions_bu_id: (bu_id) - 0 scans, redundante
DROP INDEX IF EXISTS idx_okr_wizard_sessions_bu_id;

-- 3. Remover índices simples agora cobertos pelo composto
-- idx_okr_wizard_sessions_started_by: coberto pela leading column do novo índice
DROP INDEX IF EXISTS idx_okr_wizard_sessions_started_by;

-- idx_okr_wizard_sessions_wizard_type: coberto pelo novo índice composto
DROP INDEX IF EXISTS idx_okr_wizard_sessions_wizard_type;