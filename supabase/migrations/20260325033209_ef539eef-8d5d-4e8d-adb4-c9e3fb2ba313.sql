-- Fix 1: hub_integrations_global_config SELECT - restrict to platform admins
DROP POLICY IF EXISTS "hub_global_config_select_v2" ON public.hub_integrations_global_config;
CREATE POLICY "hub_global_config_select_v2" ON public.hub_integrations_global_config
  FOR SELECT TO authenticated
  USING (has_permission(my_profile_id(), NULL::uuid, 'platform.integrations.manage:global'));

-- Fix 2: ai_agent_documents SELECT - add BU membership check
DROP POLICY IF EXISTS "ai_agent_documents_select_v2" ON public.ai_agent_documents;
CREATE POLICY "ai_agent_documents_select_v2" ON public.ai_agent_documents
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ai_agents a
    WHERE a.id = ai_agent_documents.agent_id
      AND is_profile_bu_member(my_profile_id(), a.bu_id)
  ));

-- Fix 3: ai_agent_instruction_sources SELECT - add BU membership check
DROP POLICY IF EXISTS "ai_agent_instruction_sources_select_v2" ON public.ai_agent_instruction_sources;
CREATE POLICY "ai_agent_instruction_sources_select_v2" ON public.ai_agent_instruction_sources
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ai_agents a
    WHERE a.id = ai_agent_instruction_sources.agent_id
      AND is_profile_bu_member(my_profile_id(), a.bu_id)
  ));

-- Fix 4: automation_connections SELECT - restrict global scope to platform admins
DROP POLICY IF EXISTS "automation_connections_select_v2" ON public.automation_connections;
CREATE POLICY "automation_connections_select_v2" ON public.automation_connections
  FOR SELECT TO authenticated
  USING (
    CASE
      WHEN scope = 'global' THEN is_platform_admin(auth.uid())
      ELSE bu_id IS NOT NULL AND is_profile_bu_member(my_profile_id(), bu_id)
    END
  );

-- Fix 5: okr_audit_log SELECT - restrict to own actions or platform admin
DROP POLICY IF EXISTS "okr_audit_log_select" ON public.okr_audit_log;
CREATE POLICY "okr_audit_log_select" ON public.okr_audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_platform_admin(auth.uid()));

-- Fix 6: okr_notifications_log SELECT - restrict to platform admins
DROP POLICY IF EXISTS "okr_notifications_log_select" ON public.okr_notifications_log;
CREATE POLICY "okr_notifications_log_select" ON public.okr_notifications_log
  FOR SELECT TO authenticated
  USING (is_platform_admin(auth.uid()));

-- Fix 7: notification_template_audit_log SELECT - restrict to platform admins
DROP POLICY IF EXISTS "Audit logs readable by authenticated" ON public.notification_template_audit_log;
CREATE POLICY "notification_template_audit_log_select_v2" ON public.notification_template_audit_log
  FOR SELECT TO authenticated
  USING (is_platform_admin(auth.uid()));