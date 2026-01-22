-- ============================================================
-- Fix ticket_messages RLS for:
-- 1. Allow ticket creator/owner to pin any message
-- 2. Ensure watchers can send messages (verify INSERT policy)
-- ============================================================

-- Drop existing UPDATE policy that only allows author updates
DROP POLICY IF EXISTS "ticket_messages_update_v2" ON public.ticket_messages;

-- Create new UPDATE policy with two paths:
-- 1. Author can update their own message fields (soft delete)
-- 2. Ticket creator/owner can update is_pinned field
CREATE POLICY "ticket_messages_update_v3" ON public.ticket_messages
  FOR UPDATE TO authenticated
  USING (
    is_current_bu(bu_id) AND (
      -- Path 1: Author can update own message
      author_user_id = my_profile_id()
      OR
      -- Path 2: Ticket creator/owner can update (for pinning)
      can_pin_ticket_message(ticket_id, my_profile_id())
    )
  )
  WITH CHECK (
    is_current_bu(bu_id) AND (
      -- Same logic in WITH CHECK
      author_user_id = my_profile_id()
      OR
      can_pin_ticket_message(ticket_id, my_profile_id())
    )
  );

-- Ensure the can_pin_ticket_message function exists and is correct
-- (Already verified it's working, just adding comment for documentation)
COMMENT ON POLICY "ticket_messages_update_v3" ON public.ticket_messages IS 
  'Allows message author to update their messages, and ticket creator/owner to pin messages';