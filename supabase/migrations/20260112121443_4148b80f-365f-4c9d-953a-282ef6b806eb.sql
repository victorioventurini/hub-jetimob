
-- Fix Tickets migration - complete remaining tables after partial failure
-- Note: tickets, ticket_messages select/insert policies were already created

-- Fix ticket_messages UPDATE with correct column name
CREATE POLICY "ticket_messages_update_v2" ON public.ticket_messages
FOR UPDATE TO authenticated
USING (author_user_id = my_profile_id())
WITH CHECK (author_user_id = my_profile_id());

-- TICKET_ATTACHMENTS
CREATE POLICY "ticket_attachments_select_v2" ON public.ticket_attachments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_attachments.ticket_id
    AND is_profile_bu_member(my_profile_id(), t.bu_id)
    AND has_permission(my_profile_id(), t.bu_id, 'tickets.thread.read:bu')
  )
);

CREATE POLICY "ticket_attachments_insert_v2" ON public.ticket_attachments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_attachments.ticket_id
    AND has_permission(my_profile_id(), t.bu_id, 'tickets.attachment.create:bu')
  )
);

CREATE POLICY "ticket_attachments_delete_v2" ON public.ticket_attachments
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_attachments.ticket_id
    AND has_permission(my_profile_id(), t.bu_id, 'tickets.settings.manage:bu')
  )
);

-- TICKET_PARTICIPANTS
CREATE POLICY "ticket_participants_select_v2" ON public.ticket_participants
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_participants.ticket_id
    AND is_profile_bu_member(my_profile_id(), t.bu_id)
    AND has_permission(my_profile_id(), t.bu_id, 'tickets.thread.read:bu')
  )
);

CREATE POLICY "ticket_participants_manage_v2" ON public.ticket_participants
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_participants.ticket_id
    AND has_permission(my_profile_id(), t.bu_id, 'tickets.ticket.assign:bu')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_participants.ticket_id
    AND has_permission(my_profile_id(), t.bu_id, 'tickets.ticket.assign:bu')
  )
);

-- TICKET_CATEGORIES
CREATE POLICY "ticket_categories_select_v2" ON public.ticket_categories
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'tickets.ticket.view:bu')
);

CREATE POLICY "ticket_categories_manage_v2" ON public.ticket_categories
FOR ALL TO authenticated
USING (has_permission(my_profile_id(), bu_id, 'tickets.categories.manage:bu'))
WITH CHECK (has_permission(my_profile_id(), bu_id, 'tickets.categories.manage:bu'));

-- TICKET_SUBCATEGORIES
CREATE POLICY "ticket_subcategories_select_v2" ON public.ticket_subcategories
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ticket_categories c
    WHERE c.id = ticket_subcategories.category_id
    AND is_profile_bu_member(my_profile_id(), c.bu_id)
    AND has_permission(my_profile_id(), c.bu_id, 'tickets.ticket.view:bu')
  )
);

CREATE POLICY "ticket_subcategories_manage_v2" ON public.ticket_subcategories
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ticket_categories c
    WHERE c.id = ticket_subcategories.category_id
    AND has_permission(my_profile_id(), c.bu_id, 'tickets.categories.manage:bu')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ticket_categories c
    WHERE c.id = ticket_subcategories.category_id
    AND has_permission(my_profile_id(), c.bu_id, 'tickets.categories.manage:bu')
  )
);

-- TICKET_ROUTING_RULES
CREATE POLICY "ticket_routing_rules_select_v2" ON public.ticket_routing_rules
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'tickets.routing.view')
);

CREATE POLICY "ticket_routing_rules_manage_v2" ON public.ticket_routing_rules
FOR ALL TO authenticated
USING (has_permission(my_profile_id(), bu_id, 'tickets.routing.manage:bu'))
WITH CHECK (has_permission(my_profile_id(), bu_id, 'tickets.routing.manage:bu'));

-- TICKET_INTERNAL_ROUTING_RULES
CREATE POLICY "ticket_internal_routing_rules_select_v2" ON public.ticket_internal_routing_rules
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'tickets.routing.view')
);

CREATE POLICY "ticket_internal_routing_rules_manage_v2" ON public.ticket_internal_routing_rules
FOR ALL TO authenticated
USING (has_permission(my_profile_id(), bu_id, 'tickets.routing.manage:bu'))
WITH CHECK (has_permission(my_profile_id(), bu_id, 'tickets.routing.manage:bu'));
