
-- =====================================================
-- CORREÇÃO SISTÊMICA DE RLS: auth.uid() vs profiles.id
-- =====================================================
-- Este arquivo corrige TODAS as policies que comparam 
-- auth.uid() com colunas que armazenam profiles.id
-- =====================================================

-- =====================================================
-- MÓDULO: TICKETS
-- =====================================================

-- tickets: BU users can create tickets
DROP POLICY IF EXISTS "BU users can create tickets" ON public.tickets;
CREATE POLICY "BU users can create tickets" ON public.tickets
FOR INSERT TO public
WITH CHECK (
  user_has_bu_access(auth.uid(), bu_id)
  AND created_by_user_id = my_profile_id()
);

-- tickets: Ticket owners and admins can update tickets
DROP POLICY IF EXISTS "Ticket owners and admins can update tickets" ON public.tickets;
CREATE POLICY "Ticket owners and admins can update tickets" ON public.tickets
FOR UPDATE TO public
USING (
  is_bu_admin(auth.uid(), bu_id)
  OR is_platform_admin(auth.uid())
  OR created_by_user_id = my_profile_id()
  OR owner_user_id = my_profile_id()
);

-- ticket_participants: Ticket owners and admins can manage participants
DROP POLICY IF EXISTS "Ticket owners and admins can manage participants" ON public.ticket_participants;
CREATE POLICY "Ticket owners and admins can manage participants" ON public.ticket_participants
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_participants.ticket_id
    AND (
      is_bu_admin(auth.uid(), t.bu_id)
      OR is_platform_admin(auth.uid())
      OR t.created_by_user_id = my_profile_id()
      OR t.owner_user_id = my_profile_id()
    )
  )
);

-- ticket_messages: Participants can create messages
DROP POLICY IF EXISTS "Participants can create messages" ON public.ticket_messages;
CREATE POLICY "Participants can create messages" ON public.ticket_messages
FOR INSERT TO public
WITH CHECK (
  can_view_ticket(auth.uid(), ticket_id)
  AND (
    (author_type = 'internal_user' AND author_user_id = my_profile_id())
    OR (author_type = 'partner_contact' AND author_contact_id = get_user_partner_contact_id(auth.uid()))
  )
);

-- ticket_messages: Authors can edit their messages
DROP POLICY IF EXISTS "Authors can edit their messages" ON public.ticket_messages;
CREATE POLICY "Authors can edit their messages" ON public.ticket_messages
FOR UPDATE TO public
USING (
  author_user_id = my_profile_id()
  OR EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_messages.ticket_id
    AND (is_bu_admin(auth.uid(), t.bu_id) OR is_platform_admin(auth.uid()))
  )
);

-- ticket_attachments: Participants can upload attachments
DROP POLICY IF EXISTS "Participants can upload attachments" ON public.ticket_attachments;
CREATE POLICY "Participants can upload attachments" ON public.ticket_attachments
FOR INSERT TO public
WITH CHECK (
  can_view_ticket(auth.uid(), ticket_id)
  AND uploaded_by_user_id = my_profile_id()
);

-- =====================================================
-- MÓDULO: KPIs
-- =====================================================

-- kpi_metrics: Team leaders can manage their team KPIs
DROP POLICY IF EXISTS "Team leaders can manage their team KPIs" ON public.kpi_metrics;
CREATE POLICY "Team leaders can manage their team KPIs" ON public.kpi_metrics
FOR ALL TO public
USING (
  team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = kpi_metrics.team_id
    AND t.leader_user_id = my_profile_id()
  )
);

-- kpi_values: KPI owners can insert values
DROP POLICY IF EXISTS "KPI owners can insert values" ON public.kpi_values;
CREATE POLICY "KPI owners can insert values" ON public.kpi_values
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM kpi_metrics km
    WHERE km.id = kpi_values.kpi_id
    AND (km.owner_user_id = my_profile_id() OR is_platform_admin(auth.uid()))
  )
);

-- =====================================================
-- MÓDULO: TEAMS
-- =====================================================

-- user_team_memberships: Team leaders can manage their team memberships
DROP POLICY IF EXISTS "Team leaders can manage their team memberships" ON public.user_team_memberships;
CREATE POLICY "Team leaders can manage their team memberships" ON public.user_team_memberships
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = user_team_memberships.team_id
    AND t.leader_user_id = my_profile_id()
  )
);

-- =====================================================
-- MÓDULO: OKR COACHING (determinar convenção)
-- =====================================================

-- okr_coaching_events.user_id: sem FK explícita, sem dados
-- DECISÃO: Padronizar como auth.users.id (auditable context)
-- Adicionar comentário para documentar e manter policy atual

COMMENT ON COLUMN public.okr_coaching_events.user_id IS 
  'auth.users.id - ID de autenticação do usuário que gerou o evento de coaching';

-- As policies atuais estão CORRETAS para auth.users.id:
-- okr_coaching_events_select_own: user_id = auth.uid() ✓
-- okr_coaching_events_insert_own: user_id = auth.uid() ✓

-- =====================================================
-- DOCUMENTAÇÃO
-- =====================================================

-- Adicionar comentários nas policies corrigidas
COMMENT ON POLICY "BU users can create tickets" ON public.tickets IS 
  'Usa my_profile_id() - created_by_user_id armazena profiles.id';

COMMENT ON POLICY "Ticket owners and admins can update tickets" ON public.tickets IS 
  'Usa my_profile_id() - owner_user_id e created_by_user_id armazenam profiles.id';

COMMENT ON POLICY "Ticket owners and admins can manage participants" ON public.ticket_participants IS 
  'Usa my_profile_id() - compara com tickets.owner_user_id (profiles.id)';

COMMENT ON POLICY "Participants can create messages" ON public.ticket_messages IS 
  'Usa my_profile_id() - author_user_id armazena profiles.id';

COMMENT ON POLICY "Authors can edit their messages" ON public.ticket_messages IS 
  'Usa my_profile_id() - author_user_id armazena profiles.id';

COMMENT ON POLICY "Team leaders can manage their team KPIs" ON public.kpi_metrics IS 
  'Usa my_profile_id() - teams.leader_user_id armazena profiles.id';

COMMENT ON POLICY "KPI owners can insert values" ON public.kpi_values IS 
  'Usa my_profile_id() - kpi_metrics.owner_user_id armazena profiles.id';

COMMENT ON POLICY "Team leaders can manage their team memberships" ON public.user_team_memberships IS 
  'Usa my_profile_id() - teams.leader_user_id armazena profiles.id';
