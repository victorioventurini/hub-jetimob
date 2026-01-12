
-- =====================================================
-- CLEANUP: REMOVE LEGACY POLICIES + MIGRATE AI TABLES
-- =====================================================

-- =====================================================
-- 1. TICKET TABLES - Remove legacy only
-- =====================================================
DROP POLICY IF EXISTS "Admins can delete attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Participants can upload attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Users can view attachments of tickets they can see" ON public.ticket_attachments;
DROP POLICY IF EXISTS "ticket_attachments_insert" ON public.ticket_attachments;
DROP POLICY IF EXISTS "ticket_attachments_select" ON public.ticket_attachments;

DROP POLICY IF EXISTS "ticket_categories_admin" ON public.ticket_categories;
DROP POLICY IF EXISTS "ticket_categories_select" ON public.ticket_categories;

DROP POLICY IF EXISTS "Authors can edit their messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Participants can create messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can view messages of tickets they can see" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_insert" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_select" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_update" ON public.ticket_messages;

DROP POLICY IF EXISTS "Ticket owners and admins can manage participants" ON public.ticket_participants;
DROP POLICY IF EXISTS "Users can view participants of tickets they can see" ON public.ticket_participants;
DROP POLICY IF EXISTS "ticket_participants_manage" ON public.ticket_participants;
DROP POLICY IF EXISTS "ticket_participants_select" ON public.ticket_participants;

DROP POLICY IF EXISTS "ticket_subcategories_admin" ON public.ticket_subcategories;
DROP POLICY IF EXISTS "ticket_subcategories_select" ON public.ticket_subcategories;

DROP POLICY IF EXISTS "ticket_routing_rules_admin" ON public.ticket_routing_rules;
DROP POLICY IF EXISTS "ticket_routing_rules_select" ON public.ticket_routing_rules;

DROP POLICY IF EXISTS "Admins can manage tickets" ON public.tickets;
DROP POLICY IF EXISTS "ticket_assignee_select" ON public.tickets;
DROP POLICY IF EXISTS "ticket_owner_manage" ON public.tickets;
DROP POLICY IF EXISTS "tickets_created_by_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_participant_select" ON public.tickets;

-- =====================================================
-- 2. AI_AGENTS - Migrate to V2
-- =====================================================
DROP POLICY IF EXISTS "ai_agents_admin" ON public.ai_agents;
DROP POLICY IF EXISTS "ai_agents_select" ON public.ai_agents;

CREATE POLICY "ai_agents_select_v2" ON public.ai_agents
  FOR SELECT TO authenticated
  USING (
    scope = 'global' 
    OR (scope = 'bu' AND is_profile_bu_member(my_profile_id(), bu_id))
  );

CREATE POLICY "ai_agents_insert_v2" ON public.ai_agents
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'settings.ai.manage:bu')
  );

CREATE POLICY "ai_agents_update_v2" ON public.ai_agents
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'settings.ai.manage:bu')
  );

CREATE POLICY "ai_agents_delete_v2" ON public.ai_agents
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'settings.ai.manage:bu')
  );

-- =====================================================
-- 3. AI_AGENT_DOCUMENTS - Migrate to V2
-- =====================================================
DROP POLICY IF EXISTS "ai_agent_documents_admin" ON public.ai_agent_documents;
DROP POLICY IF EXISTS "ai_agent_documents_select" ON public.ai_agent_documents;

CREATE POLICY "ai_agent_documents_select_v2" ON public.ai_agent_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.id = agent_id
    )
  );

CREATE POLICY "ai_agent_documents_insert_v2" ON public.ai_agent_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.id = agent_id
      AND has_permission(my_profile_id(), a.bu_id, 'settings.ai.manage:bu')
    )
  );

CREATE POLICY "ai_agent_documents_update_v2" ON public.ai_agent_documents
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.id = agent_id
      AND has_permission(my_profile_id(), a.bu_id, 'settings.ai.manage:bu')
    )
  );

CREATE POLICY "ai_agent_documents_delete_v2" ON public.ai_agent_documents
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.id = agent_id
      AND has_permission(my_profile_id(), a.bu_id, 'settings.ai.manage:bu')
    )
  );

-- =====================================================
-- 4. AI_AGENT_INSTRUCTION_SOURCES - Migrate to V2
-- =====================================================
DROP POLICY IF EXISTS "Platform admins can view instruction sources" ON public.ai_agent_instruction_sources;
DROP POLICY IF EXISTS "Platform admins can insert instruction sources" ON public.ai_agent_instruction_sources;
DROP POLICY IF EXISTS "Platform admins can update instruction sources" ON public.ai_agent_instruction_sources;
DROP POLICY IF EXISTS "Platform admins can delete instruction sources" ON public.ai_agent_instruction_sources;

CREATE POLICY "ai_agent_instruction_sources_select_v2" ON public.ai_agent_instruction_sources
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.id = agent_id
    )
  );

CREATE POLICY "ai_agent_instruction_sources_insert_v2" ON public.ai_agent_instruction_sources
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.id = agent_id
      AND has_permission(my_profile_id(), a.bu_id, 'settings.ai.manage:bu')
    )
  );

CREATE POLICY "ai_agent_instruction_sources_update_v2" ON public.ai_agent_instruction_sources
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.id = agent_id
      AND has_permission(my_profile_id(), a.bu_id, 'settings.ai.manage:bu')
    )
  );

CREATE POLICY "ai_agent_instruction_sources_delete_v2" ON public.ai_agent_instruction_sources
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.id = agent_id
      AND has_permission(my_profile_id(), a.bu_id, 'settings.ai.manage:bu')
    )
  );

-- =====================================================
-- 5. AI_AGENT_LOGS - Migrate to V2 (read-only)
-- =====================================================
DROP POLICY IF EXISTS "ai_agent_logs_select" ON public.ai_agent_logs;

CREATE POLICY "ai_agent_logs_select_v2" ON public.ai_agent_logs
  FOR SELECT TO authenticated
  USING (
    bu_id IS NULL 
    OR is_profile_bu_member(my_profile_id(), bu_id)
  );

-- =====================================================
-- 6. BU_AGENT_ACTIVATIONS - Migrate to V2
-- =====================================================
DROP POLICY IF EXISTS "bu_agent_activations_admin" ON public.bu_agent_activations;
DROP POLICY IF EXISTS "bu_agent_activations_select" ON public.bu_agent_activations;

CREATE POLICY "bu_agent_activations_select_v2" ON public.bu_agent_activations
  FOR SELECT TO authenticated
  USING (
    is_profile_bu_member(my_profile_id(), bu_id)
  );

CREATE POLICY "bu_agent_activations_manage_v2" ON public.bu_agent_activations
  FOR ALL TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'settings.ai.manage:bu')
  );

-- =====================================================
-- 7. BU_IA_CONFIG - Migrate to V2
-- =====================================================
DROP POLICY IF EXISTS "bu_ia_config_admin" ON public.bu_ia_config;
DROP POLICY IF EXISTS "bu_ia_config_select" ON public.bu_ia_config;

CREATE POLICY "bu_ia_config_select_v2" ON public.bu_ia_config
  FOR SELECT TO authenticated
  USING (
    is_profile_bu_member(my_profile_id(), bu_id)
  );

CREATE POLICY "bu_ia_config_manage_v2" ON public.bu_ia_config
  FOR ALL TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'settings.ai.manage:bu')
  );
