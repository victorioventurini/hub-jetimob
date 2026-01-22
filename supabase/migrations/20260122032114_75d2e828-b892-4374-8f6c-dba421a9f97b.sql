
-- Permitir visualizar profiles de autores de mensagens em tickets que o usuário pode ver
-- Isso resolve o problema de cross-BU ticket viewing

CREATE POLICY "profiles_select_ticket_participants_v1"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing profiles of authors from tickets the user can view
    EXISTS (
      SELECT 1 
      FROM public.ticket_messages tm
      JOIN public.tickets t ON t.id = tm.ticket_id
      WHERE tm.author_user_id = profiles.id
        AND can_view_ticket(t.id, my_profile_id())
    )
    OR
    -- Also allow viewing profiles who are participants in shared tickets
    EXISTS (
      SELECT 1
      FROM public.ticket_participants tp
      JOIN public.tickets t ON t.id = tp.ticket_id
      WHERE tp.profile_id = profiles.id
        AND tp.is_active = true
        AND can_view_ticket(t.id, my_profile_id())
    )
  );

COMMENT ON POLICY "profiles_select_ticket_participants_v1" ON public.profiles IS 
  'Permite visualizar profiles de autores/participantes de tickets que o usuário tem acesso. Resolve problema de cross-BU ticket viewing.';
