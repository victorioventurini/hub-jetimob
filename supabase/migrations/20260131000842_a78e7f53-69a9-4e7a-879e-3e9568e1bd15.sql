-- =====================================================
-- Database Optimization Wave P2/P3 - 2026-01-31
-- TCR v2.74.0 Compliance
-- =====================================================

-- =====================================================
-- PARTE 1: Remover CHECK constraints para permitir migração para ENUM
-- =====================================================
ALTER TABLE ai_agent_logs DROP CONSTRAINT IF EXISTS ai_agent_logs_status_check;
ALTER TABLE areas DROP CONSTRAINT IF EXISTS areas_status_check;
ALTER TABLE hub_integrations_catalog DROP CONSTRAINT IF EXISTS hub_integrations_catalog_status_check;
ALTER TABLE permission_migrations DROP CONSTRAINT IF EXISTS permission_migrations_status_check;

-- =====================================================
-- P2.1: Remover índice não utilizado de ai_agent_logs
-- =====================================================
DROP INDEX IF EXISTS idx_ai_agent_logs_agent_id;

-- =====================================================
-- P2.2: Criar ENUM para ai_agent_logs.status
-- Valores: 'pending', 'success', 'error', 'timeout'
-- =====================================================
CREATE TYPE ai_agent_log_status AS ENUM ('pending', 'success', 'error', 'timeout');

ALTER TABLE ai_agent_logs 
  ALTER COLUMN status TYPE ai_agent_log_status 
  USING status::ai_agent_log_status;

COMMENT ON TYPE ai_agent_log_status IS 'Status de execução de agentes IA (v2.75.0)';

-- =====================================================
-- P2.3: Migrar areas.status para team_status enum
-- team_status: 'active', 'inactive'
-- =====================================================
ALTER TABLE areas ALTER COLUMN status DROP DEFAULT;
ALTER TABLE areas 
  ALTER COLUMN status TYPE team_status 
  USING status::team_status;
ALTER TABLE areas ALTER COLUMN status SET DEFAULT 'active'::team_status;

-- =====================================================
-- P3.1: Migrar hub_integrations_catalog.status
-- Adicionar 'deprecated' ao catalog_status se não existir
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'deprecated' AND enumtypid = 'catalog_status'::regtype) THEN
    ALTER TYPE catalog_status ADD VALUE 'deprecated';
  END IF;
END $$;

ALTER TABLE hub_integrations_catalog ALTER COLUMN status DROP DEFAULT;
ALTER TABLE hub_integrations_catalog 
  ALTER COLUMN status TYPE catalog_status 
  USING status::catalog_status;
ALTER TABLE hub_integrations_catalog ALTER COLUMN status SET DEFAULT 'active'::catalog_status;

-- =====================================================
-- P3.2: Migrar notification_channels.status para catalog_status
-- =====================================================
ALTER TABLE notification_channels ALTER COLUMN status DROP DEFAULT;
ALTER TABLE notification_channels 
  ALTER COLUMN status TYPE catalog_status 
  USING status::catalog_status;
ALTER TABLE notification_channels ALTER COLUMN status SET DEFAULT 'active'::catalog_status;

-- =====================================================
-- P3.3: Migrar ticket_categories.status para catalog_status
-- =====================================================
ALTER TABLE ticket_categories ALTER COLUMN status DROP DEFAULT;
ALTER TABLE ticket_categories 
  ALTER COLUMN status TYPE catalog_status 
  USING status::catalog_status;
ALTER TABLE ticket_categories ALTER COLUMN status SET DEFAULT 'active'::catalog_status;

-- =====================================================
-- P3.4: Migrar ticket_subcategories.status para catalog_status
-- =====================================================
ALTER TABLE ticket_subcategories ALTER COLUMN status DROP DEFAULT;
ALTER TABLE ticket_subcategories 
  ALTER COLUMN status TYPE catalog_status 
  USING status::catalog_status;
ALTER TABLE ticket_subcategories ALTER COLUMN status SET DEFAULT 'active'::catalog_status;

-- =====================================================
-- P3.5: Migrar permission_migrations.status
-- Precisa criar novo enum pois valores são diferentes
-- Valores existentes: 'not_started', 'migrated', 'verified'
-- =====================================================
CREATE TYPE permission_migration_status AS ENUM ('not_started', 'migrated', 'verified');

ALTER TABLE permission_migrations ALTER COLUMN status DROP DEFAULT;
ALTER TABLE permission_migrations 
  ALTER COLUMN status TYPE permission_migration_status 
  USING status::permission_migration_status;
ALTER TABLE permission_migrations ALTER COLUMN status SET DEFAULT 'not_started'::permission_migration_status;

COMMENT ON TYPE permission_migration_status IS 'Status de migração de permissões (v2.75.0)';

-- =====================================================
-- P3.6: Adicionar updated_at em notifications
-- =====================================================
ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

COMMENT ON COLUMN notifications.updated_at IS 'Auto-updated via trigger (v2.75.0)';

-- =====================================================
-- P3.7: Adicionar updated_at em okr_checkins
-- =====================================================
ALTER TABLE okr_checkins 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

CREATE OR REPLACE FUNCTION update_okr_checkins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_okr_checkins_updated_at ON okr_checkins;
CREATE TRIGGER trigger_okr_checkins_updated_at
  BEFORE UPDATE ON okr_checkins
  FOR EACH ROW
  EXECUTE FUNCTION update_okr_checkins_updated_at();

COMMENT ON COLUMN okr_checkins.updated_at IS 'Auto-updated via trigger (v2.75.0)';

-- =====================================================
-- P3.8: Remover índice não utilizado
-- =====================================================
DROP INDEX IF EXISTS idx_okr_org_objectives_status;