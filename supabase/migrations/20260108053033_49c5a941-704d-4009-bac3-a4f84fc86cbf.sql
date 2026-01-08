-- =============================================
-- RLS Policies Part 4: Tickets Module (remaining)
-- =============================================

-- ticket_messages
CREATE POLICY "ticket_messages_select" ON public.ticket_messages
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND (public.is_bu_member(auth.uid(), t.bu_id) OR public.is_ticket_participant(auth.uid(), t.id))
  )
);

CREATE POLICY "ticket_messages_insert" ON public.ticket_messages
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND (public.is_bu_member(auth.uid(), t.bu_id) OR public.is_ticket_participant(auth.uid(), t.id))
  )
);

CREATE POLICY "ticket_messages_update" ON public.ticket_messages
FOR UPDATE TO authenticated USING (
  author_user_id = auth.uid()
);

-- ticket_participants
CREATE POLICY "ticket_participants_select" ON public.ticket_participants
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND (public.is_bu_member(auth.uid(), t.bu_id) OR public.is_ticket_participant(auth.uid(), t.id))
  )
);

CREATE POLICY "ticket_participants_manage" ON public.ticket_participants
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND public.is_bu_member(auth.uid(), t.bu_id)
  )
);

-- ticket_attachments
CREATE POLICY "ticket_attachments_select" ON public.ticket_attachments
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND (public.is_bu_member(auth.uid(), t.bu_id) OR public.is_ticket_participant(auth.uid(), t.id))
  )
);

CREATE POLICY "ticket_attachments_insert" ON public.ticket_attachments
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND (public.is_bu_member(auth.uid(), t.bu_id) OR public.is_ticket_participant(auth.uid(), t.id))
  )
);

-- ticket_routing_rules
CREATE POLICY "ticket_routing_rules_select" ON public.ticket_routing_rules
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "ticket_routing_rules_admin" ON public.ticket_routing_rules
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- ticket_mentions
CREATE POLICY "ticket_mentions_select" ON public.ticket_mentions
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND (public.is_bu_member(auth.uid(), t.bu_id) OR public.is_ticket_participant(auth.uid(), t.id))
  )
);

CREATE POLICY "ticket_mentions_insert" ON public.ticket_mentions
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND (public.is_bu_member(auth.uid(), t.bu_id) OR public.is_ticket_participant(auth.uid(), t.id))
  )
);