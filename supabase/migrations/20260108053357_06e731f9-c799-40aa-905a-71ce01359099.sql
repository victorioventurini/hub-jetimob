-- Batch 1: AI/Automation/Integration tables

-- AI Agents
CREATE POLICY "ai_agents_select" ON public.ai_agents FOR SELECT TO authenticated USING (scope = 'global' OR public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "ai_agents_admin" ON public.ai_agents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ai_agent_logs_select" ON public.ai_agent_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR (bu_id IS NOT NULL AND public.is_bu_member(auth.uid(), bu_id)));

CREATE POLICY "ai_agent_documents_select" ON public.ai_agent_documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ai_agent_documents_admin" ON public.ai_agent_documents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "bu_agent_activations_select" ON public.bu_agent_activations FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "bu_agent_activations_admin" ON public.bu_agent_activations FOR ALL TO authenticated USING (public.is_bu_admin(auth.uid(), bu_id) OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "bu_ia_config_select" ON public.bu_ia_config FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "bu_ia_config_admin" ON public.bu_ia_config FOR ALL TO authenticated USING (public.is_bu_admin(auth.uid(), bu_id) OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Automation
CREATE POLICY "automation_event_catalog_select" ON public.automation_event_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "automation_action_catalog_select" ON public.automation_action_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "automation_connections_select" ON public.automation_connections FOR SELECT TO authenticated USING (scope = 'global' OR (bu_id IS NOT NULL AND public.is_bu_member(auth.uid(), bu_id)));
CREATE POLICY "automation_connections_admin" ON public.automation_connections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR (bu_id IS NOT NULL AND public.is_bu_admin(auth.uid(), bu_id)));
CREATE POLICY "automation_connection_events_select" ON public.automation_connection_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "automation_incoming_tokens_select" ON public.automation_incoming_tokens FOR SELECT TO authenticated USING (scope = 'global' OR (bu_id IS NOT NULL AND public.is_bu_member(auth.uid(), bu_id)));
CREATE POLICY "automation_incoming_tokens_admin" ON public.automation_incoming_tokens FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "automation_logs_select" ON public.automation_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR (bu_id IS NOT NULL AND public.is_bu_member(auth.uid(), bu_id)));

-- Hub Integrations
CREATE POLICY "hub_integrations_catalog_select" ON public.hub_integrations_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "hub_integrations_global_config_admin" ON public.hub_integrations_global_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bu_integrations_config_select" ON public.bu_integrations_config FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "bu_integrations_config_admin" ON public.bu_integrations_config FOR ALL TO authenticated USING (public.is_bu_admin(auth.uid(), bu_id) OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));