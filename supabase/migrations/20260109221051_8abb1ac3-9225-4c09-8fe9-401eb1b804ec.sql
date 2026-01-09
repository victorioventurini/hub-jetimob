-- ============================================================
-- IDENTITY CUTOVER v3.0 — FASE 0.5 (FINAL): Partners + Tickets
-- ============================================================

-- partner_companies
DROP POLICY IF EXISTS "partner_companies_select" ON partner_companies;
CREATE POLICY "partner_companies_select" ON partner_companies
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- partner_contact_capabilities (tem bu_id direto)
DROP POLICY IF EXISTS "partner_contact_capabilities_select" ON partner_contact_capabilities;
CREATE POLICY "partner_contact_capabilities_select" ON partner_contact_capabilities
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- partner_contacts
DROP POLICY IF EXISTS "partner_contacts_select" ON partner_contacts;
CREATE POLICY "partner_contacts_select" ON partner_contacts
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- partner_service_mappings (tem bu_id direto)
DROP POLICY IF EXISTS "partner_service_mappings_select" ON partner_service_mappings;
CREATE POLICY "partner_service_mappings_select" ON partner_service_mappings
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- ticket_categories
DROP POLICY IF EXISTS "ticket_categories_select" ON ticket_categories;
CREATE POLICY "ticket_categories_select" ON ticket_categories
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- ticket_routing_rules
DROP POLICY IF EXISTS "ticket_routing_rules_select" ON ticket_routing_rules;
CREATE POLICY "ticket_routing_rules_select" ON ticket_routing_rules
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- ticket_subcategories (tem bu_id direto)
DROP POLICY IF EXISTS "ticket_subcategories_select" ON ticket_subcategories;
CREATE POLICY "ticket_subcategories_select" ON ticket_subcategories
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- tickets (SELECT + INSERT + UPDATE) - mantém is_ticket_participant
DROP POLICY IF EXISTS "tickets_select" ON tickets;
CREATE POLICY "tickets_select" ON tickets
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id) OR is_ticket_participant(auth.uid(), id));

DROP POLICY IF EXISTS "tickets_insert" ON tickets;
CREATE POLICY "tickets_insert" ON tickets
FOR INSERT WITH CHECK (is_profile_bu_member(my_profile_id(), bu_id));

DROP POLICY IF EXISTS "tickets_update" ON tickets;
CREATE POLICY "tickets_update" ON tickets
FOR UPDATE USING (is_profile_bu_member(my_profile_id(), bu_id) OR is_ticket_participant(auth.uid(), id));

-- ticket_attachments (mantém is_ticket_participant)
DROP POLICY IF EXISTS "ticket_attachments_select" ON ticket_attachments;
CREATE POLICY "ticket_attachments_select" ON ticket_attachments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_attachments.ticket_id 
    AND (is_profile_bu_member(my_profile_id(), t.bu_id) OR is_ticket_participant(auth.uid(), t.id)))
);

DROP POLICY IF EXISTS "ticket_attachments_insert" ON ticket_attachments;
CREATE POLICY "ticket_attachments_insert" ON ticket_attachments
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_attachments.ticket_id 
    AND is_profile_bu_member(my_profile_id(), t.bu_id))
);

-- ticket_mentions (mantém is_ticket_participant)
DROP POLICY IF EXISTS "ticket_mentions_select" ON ticket_mentions;
CREATE POLICY "ticket_mentions_select" ON ticket_mentions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_mentions.ticket_id 
    AND (is_profile_bu_member(my_profile_id(), t.bu_id) OR is_ticket_participant(auth.uid(), t.id)))
);

DROP POLICY IF EXISTS "ticket_mentions_insert" ON ticket_mentions;
CREATE POLICY "ticket_mentions_insert" ON ticket_mentions
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_mentions.ticket_id 
    AND is_profile_bu_member(my_profile_id(), t.bu_id))
);

-- ticket_messages (mantém is_ticket_participant)
DROP POLICY IF EXISTS "ticket_messages_select" ON ticket_messages;
CREATE POLICY "ticket_messages_select" ON ticket_messages
FOR SELECT USING (
  EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_messages.ticket_id 
    AND (is_profile_bu_member(my_profile_id(), t.bu_id) OR is_ticket_participant(auth.uid(), t.id)))
);

DROP POLICY IF EXISTS "ticket_messages_insert" ON ticket_messages;
CREATE POLICY "ticket_messages_insert" ON ticket_messages
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_messages.ticket_id 
    AND is_profile_bu_member(my_profile_id(), t.bu_id))
);

-- ticket_participants (mantém is_ticket_participant)
DROP POLICY IF EXISTS "ticket_participants_select" ON ticket_participants;
CREATE POLICY "ticket_participants_select" ON ticket_participants
FOR SELECT USING (
  EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_participants.ticket_id 
    AND (is_profile_bu_member(my_profile_id(), t.bu_id) OR is_ticket_participant(auth.uid(), t.id)))
);

DROP POLICY IF EXISTS "ticket_participants_manage" ON ticket_participants;
CREATE POLICY "ticket_participants_manage" ON ticket_participants
FOR ALL USING (
  EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_participants.ticket_id 
    AND is_profile_bu_member(my_profile_id(), t.bu_id))
);