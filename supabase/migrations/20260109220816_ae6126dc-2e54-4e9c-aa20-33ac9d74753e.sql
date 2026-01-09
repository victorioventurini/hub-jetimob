-- ============================================================
-- IDENTITY CUTOVER v3.0 — FASE 0.5 (Parte 3): Batch AI/Automation/BU/KPI
-- ============================================================

-- ai_agent_logs
DROP POLICY IF EXISTS "ai_agent_logs_select" ON ai_agent_logs;
CREATE POLICY "ai_agent_logs_select" ON ai_agent_logs
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR ((bu_id IS NOT NULL) AND is_profile_bu_member(my_profile_id(), bu_id))
);

-- ai_agents
DROP POLICY IF EXISTS "ai_agents_select" ON ai_agents;
CREATE POLICY "ai_agents_select" ON ai_agents
FOR SELECT USING (
  (scope = 'global'::agent_scope) 
  OR is_profile_bu_member(my_profile_id(), bu_id)
);

-- automation_connections
DROP POLICY IF EXISTS "automation_connections_select" ON automation_connections;
CREATE POLICY "automation_connections_select" ON automation_connections
FOR SELECT USING (
  (scope = 'global'::text) 
  OR ((bu_id IS NOT NULL) AND is_profile_bu_member(my_profile_id(), bu_id))
);

-- automation_incoming_tokens
DROP POLICY IF EXISTS "automation_incoming_tokens_select" ON automation_incoming_tokens;
CREATE POLICY "automation_incoming_tokens_select" ON automation_incoming_tokens
FOR SELECT USING (
  (scope = 'global'::text) 
  OR ((bu_id IS NOT NULL) AND is_profile_bu_member(my_profile_id(), bu_id))
);

-- automation_logs
DROP POLICY IF EXISTS "automation_logs_select" ON automation_logs;
CREATE POLICY "automation_logs_select" ON automation_logs
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR ((bu_id IS NOT NULL) AND is_profile_bu_member(my_profile_id(), bu_id))
);

-- bu_agent_activations
DROP POLICY IF EXISTS "bu_agent_activations_select" ON bu_agent_activations;
CREATE POLICY "bu_agent_activations_select" ON bu_agent_activations
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- bu_ia_config
DROP POLICY IF EXISTS "bu_ia_config_select" ON bu_ia_config;
CREATE POLICY "bu_ia_config_select" ON bu_ia_config
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- bu_integrations_config
DROP POLICY IF EXISTS "bu_integrations_config_select" ON bu_integrations_config;
CREATE POLICY "bu_integrations_config_select" ON bu_integrations_config
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- bu_notification_channels
DROP POLICY IF EXISTS "bu_notification_channels_select" ON bu_notification_channels;
CREATE POLICY "bu_notification_channels_select" ON bu_notification_channels
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- kpi_metrics
DROP POLICY IF EXISTS "kpi_metrics_select" ON kpi_metrics;
CREATE POLICY "kpi_metrics_select" ON kpi_metrics
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- kpi_values (SELECT + INSERT)
DROP POLICY IF EXISTS "kpi_values_select" ON kpi_values;
CREATE POLICY "kpi_values_select" ON kpi_values
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM kpi_metrics km
    WHERE km.id = kpi_values.kpi_id 
      AND is_profile_bu_member(my_profile_id(), km.bu_id)
  )
);

DROP POLICY IF EXISTS "kpi_values_insert" ON kpi_values;
CREATE POLICY "kpi_values_insert" ON kpi_values
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM kpi_metrics km
    WHERE km.id = kpi_values.kpi_id 
      AND is_profile_bu_member(my_profile_id(), km.bu_id)
  )
);