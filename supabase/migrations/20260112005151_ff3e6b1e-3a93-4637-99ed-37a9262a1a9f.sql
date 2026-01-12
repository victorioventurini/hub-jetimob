
-- ========================================================
-- MIGRAÇÃO TEXT → ENUM - Versão Final
-- ========================================================

-- 1. Recriar ENUMs que foram dropados (com valores corretos)

-- document_processing_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_processing_status') THEN
    CREATE TYPE document_processing_status AS ENUM ('pending', 'processing', 'completed', 'error');
  END IF;
END $$;

-- automation_log_type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automation_log_type') THEN
    CREATE TYPE automation_log_type AS ENUM ('webhook', 'incoming', 'scheduled');
  END IF;
END $$;

-- automation_log_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automation_log_status') THEN
    CREATE TYPE automation_log_status AS ENUM ('pending', 'success', 'error', 'timeout');
  END IF;
END $$;

-- cron_status - AJUSTADO para incluir 'success' (valor real usado)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cron_status') THEN
    CREATE TYPE cron_status AS ENUM ('started', 'success', 'failed', 'error', 'timeout');
  END IF;
END $$;

-- cycle_type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cycle_type') THEN
    CREATE TYPE cycle_type AS ENUM ('year', 'quarter', 'month', 'sprint', 'custom');
  END IF;
END $$;

-- wizard_session_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wizard_session_status') THEN
    CREATE TYPE wizard_session_status AS ENUM ('draft', 'in_progress', 'completed', 'abandoned');
  END IF;
END $$;

-- migration_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'migration_status') THEN
    CREATE TYPE migration_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'rolled_back');
  END IF;
END $$;

-- 2. Dropar CHECK constraint em cron_execution_logs
ALTER TABLE cron_execution_logs DROP CONSTRAINT IF EXISTS cron_execution_logs_status_check;

-- 3. Desabilitar triggers
ALTER TABLE asset_categories DISABLE TRIGGER trg_enforce_bu_scope_asset_categories;
ALTER TABLE asset_clavicularies DISABLE TRIGGER trg_enforce_bu_scope_asset_clavicularies;
ALTER TABLE cycles DISABLE TRIGGER trg_enforce_bu_scope_cycles;
ALTER TABLE ticket_subcategories DISABLE TRIGGER trg_enforce_bu_scope_ticket_subcategories;

-- 4. Migrar asset_categories.status → catalog_status
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS status_new catalog_status DEFAULT 'active'::catalog_status;
UPDATE asset_categories SET status_new = status::catalog_status WHERE status_new IS NULL OR status IS NOT NULL;
ALTER TABLE asset_categories DROP COLUMN IF EXISTS status;
ALTER TABLE asset_categories RENAME COLUMN status_new TO status;

-- 5. Migrar asset_clavicularies.status → catalog_status
ALTER TABLE asset_clavicularies ADD COLUMN IF NOT EXISTS status_new catalog_status DEFAULT 'active'::catalog_status;
UPDATE asset_clavicularies SET status_new = status::catalog_status WHERE status_new IS NULL OR status IS NOT NULL;
ALTER TABLE asset_clavicularies DROP COLUMN IF EXISTS status;
ALTER TABLE asset_clavicularies RENAME COLUMN status_new TO status;

-- 6. Migrar cycles.type → cycle_type
ALTER TABLE cycles ADD COLUMN IF NOT EXISTS type_new cycle_type;
UPDATE cycles SET type_new = type::cycle_type WHERE type_new IS NULL;
ALTER TABLE cycles DROP COLUMN IF EXISTS type;
ALTER TABLE cycles RENAME COLUMN type_new TO type;
ALTER TABLE cycles ALTER COLUMN type SET NOT NULL;

-- 7. Migrar okr_wizard_sessions.status → wizard_session_status
ALTER TABLE okr_wizard_sessions ADD COLUMN IF NOT EXISTS status_new wizard_session_status DEFAULT 'in_progress'::wizard_session_status;
UPDATE okr_wizard_sessions SET status_new = status::wizard_session_status WHERE status_new IS NULL OR status IS NOT NULL;
ALTER TABLE okr_wizard_sessions DROP COLUMN IF EXISTS status;
ALTER TABLE okr_wizard_sessions RENAME COLUMN status_new TO status;

-- 8. Migrar cron_execution_logs.status → cron_status
ALTER TABLE cron_execution_logs ADD COLUMN IF NOT EXISTS status_new cron_status;
UPDATE cron_execution_logs SET status_new = status::cron_status WHERE status_new IS NULL;
ALTER TABLE cron_execution_logs DROP COLUMN IF EXISTS status;
ALTER TABLE cron_execution_logs RENAME COLUMN status_new TO status;
ALTER TABLE cron_execution_logs ALTER COLUMN status SET NOT NULL;

-- 9. Migrar ai_agent_documents.status → document_processing_status
ALTER TABLE ai_agent_documents ADD COLUMN IF NOT EXISTS status_new document_processing_status DEFAULT 'pending'::document_processing_status;
UPDATE ai_agent_documents SET status_new = status::document_processing_status WHERE status_new IS NULL OR status IS NOT NULL;
ALTER TABLE ai_agent_documents DROP COLUMN IF EXISTS status;
ALTER TABLE ai_agent_documents RENAME COLUMN status_new TO status;

-- 10. Reabilitar triggers
ALTER TABLE asset_categories ENABLE TRIGGER trg_enforce_bu_scope_asset_categories;
ALTER TABLE asset_clavicularies ENABLE TRIGGER trg_enforce_bu_scope_asset_clavicularies;
ALTER TABLE cycles ENABLE TRIGGER trg_enforce_bu_scope_cycles;
ALTER TABLE ticket_subcategories ENABLE TRIGGER trg_enforce_bu_scope_ticket_subcategories;
