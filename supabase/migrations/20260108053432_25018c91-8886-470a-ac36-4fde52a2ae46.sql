-- Batch 3: Tickets and Squads

-- Tickets
CREATE POLICY "tickets_select" ON public.tickets FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id) OR public.is_ticket_participant(auth.uid(), id));
CREATE POLICY "tickets_insert" ON public.tickets FOR INSERT TO authenticated WITH CHECK (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "tickets_update" ON public.tickets FOR UPDATE TO authenticated USING (public.is_bu_member(auth.uid(), bu_id) OR public.is_ticket_participant(auth.uid(), id));

CREATE POLICY "ticket_categories_select" ON public.ticket_categories FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "ticket_categories_admin" ON public.ticket_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.is_bu_admin(auth.uid(), bu_id));

CREATE POLICY "ticket_subcategories_select" ON public.ticket_subcategories FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "ticket_subcategories_admin" ON public.ticket_subcategories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.is_bu_admin(auth.uid(), bu_id));

-- Squads
CREATE POLICY "squad_memberships_select" ON public.squad_memberships FOR SELECT TO authenticated USING (true);
CREATE POLICY "squad_memberships_admin" ON public.squad_memberships FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "squad_teams_select" ON public.squad_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "squad_teams_admin" ON public.squad_teams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));