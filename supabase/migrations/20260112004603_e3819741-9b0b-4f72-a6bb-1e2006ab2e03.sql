
-- ========================================================
-- WAVE 3: CLEANUP COMPLETO - Limpar ai_agents e adicionar FKs
-- ========================================================

-- 1. Limpar ai_agents (sem trigger de bu_scope nessa tabela para created_by)
UPDATE ai_agents 
SET created_by = NULL 
WHERE created_by IS NOT NULL 
  AND created_by NOT IN (SELECT id FROM profiles);

-- 2. Adicionar FKs em todas as tabelas

-- ai_agent_documents.created_by
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_ai_agent_documents_created_by') THEN
    ALTER TABLE ai_agent_documents ADD CONSTRAINT fk_ai_agent_documents_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ai_agents.created_by
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_ai_agents_created_by') THEN
    ALTER TABLE ai_agents ADD CONSTRAINT fk_ai_agents_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- automation_connections.created_by
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_automation_connections_created_by') THEN
    ALTER TABLE automation_connections ADD CONSTRAINT fk_automation_connections_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- automation_incoming_tokens.created_by
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_automation_incoming_tokens_created_by') THEN
    ALTER TABLE automation_incoming_tokens ADD CONSTRAINT fk_automation_incoming_tokens_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- bu_module_configs.enabled_by e disabled_by
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_bu_module_configs_enabled_by') THEN
    ALTER TABLE bu_module_configs ADD CONSTRAINT fk_bu_module_configs_enabled_by FOREIGN KEY (enabled_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_bu_module_configs_disabled_by') THEN
    ALTER TABLE bu_module_configs ADD CONSTRAINT fk_bu_module_configs_disabled_by FOREIGN KEY (disabled_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- bu_locations.created_by e updated_by
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_bu_locations_created_by') THEN
    ALTER TABLE bu_locations ADD CONSTRAINT fk_bu_locations_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_bu_locations_updated_by') THEN
    ALTER TABLE bu_locations ADD CONSTRAINT fk_bu_locations_updated_by FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- bu_agent_activations.enabled_by
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_bu_agent_activations_enabled_by') THEN
    ALTER TABLE bu_agent_activations ADD CONSTRAINT fk_bu_agent_activations_enabled_by FOREIGN KEY (enabled_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- bu_integrations_config.updated_by
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_bu_integrations_config_updated_by') THEN
    ALTER TABLE bu_integrations_config ADD CONSTRAINT fk_bu_integrations_config_updated_by FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Função para instruções de VACUUM
CREATE OR REPLACE FUNCTION get_vacuum_instructions()
RETURNS text AS $$
BEGIN
  RETURN 'Execute via Dashboard SQL: VACUUM ANALYZE permission_catalog; VACUUM ANALYZE profiles; VACUUM ANALYZE bu_user_memberships; VACUUM ANALYZE notifications; VACUUM ANALYZE bu_units; VACUUM ANALYZE notification_outbox; VACUUM ANALYZE ai_agents; VACUUM ANALYZE teams; VACUUM ANALYZE audit_logs;';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
